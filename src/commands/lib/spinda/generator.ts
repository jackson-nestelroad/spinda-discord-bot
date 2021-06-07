import { createCanvas, loadImage, Image, Canvas, CanvasRenderingContext2D, ImageData } from 'canvas';
import { Message, MessageAttachment } from 'discord.js';
import { DiscordBot } from '../../../bot';
import { GeneratedSpinda, SpindaColorChange, SpindaFeatures } from '../../../data/model/caught-spinda';
import { BaseService } from '../../../services/base';
import { CircularBuffer } from '../../../util/circular-buffer';
import { NumberUtil } from '../../../util/number';
import { Color, RGBAColor } from '../../../util/color';
import { OutlineDrawer } from './util/outline';
import { Point } from './util/point';
import { SpindaColorMask, SpindaColorPalettes, SpindaColors } from './util/spinda-colors';

enum SpotLocation {
    Start = 0,
    TopLeft = 0,
    TopRight = 1,
    BottomLeft = 2,
    BottomRight = 3,
    Count = 4,
}

type SpotData<T> = Record<Exclude<SpotLocation, SpotLocation.Count>, T>;

class Resource {
    private imageData: Image = null;

    public constructor(
        private readonly path: string,
    ) { }

    public get image(): Image {
        return this.imageData;
    }

    public async load(bot: DiscordBot) {
        this.imageData = await loadImage(bot.resourceService.resolve(this.path));
    }

    public loaded(): boolean {
        return this.image !== null;
    }
}

class Spot extends Resource {
    public constructor(
        path: string,
        public readonly anchor: Point,
    ) { 
        super(path);
    }
}

interface SpindaGenerationResult {
    readonly buffer: Buffer;
    readonly info: GeneratedSpinda;
}

interface HordeGenerationResult {
    readonly buffer: Buffer;
    readonly info: Array<GeneratedSpinda>;
}

type Resources = Resource | ResourceMap;
export interface ResourceMap extends Dictionary<Resources> { };

type CanvasGlobalCompositeOperation =  typeof CanvasRenderingContext2D.prototype.globalCompositeOperation;

export class CanvasBundle {
    public canvas: Canvas = createCanvas(0, 0);
    public ctx: CanvasRenderingContext2D = this.canvas.getContext('2d');

    public get width(): number {
        return this.canvas.width;
    }

    public get height(): number {
        return this.canvas.height;
    }

    public resize(width: number, height: number) {
        this.canvas.width = width;
        this.canvas.height = height;
    }

    public clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    public drawImage(
        composite: CanvasGlobalCompositeOperation,
        ...args: any[]
    ) {
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.globalCompositeOperation = composite;
        this.ctx.drawImage(...args);
    }

    public drawCanvas(
        composite: CanvasGlobalCompositeOperation,
        bundle: CanvasBundle
    ) {
        this.drawImage(composite, bundle.canvas, 0, 0);
    }

    public fillCanvas(
        composite: CanvasGlobalCompositeOperation,
        color: RGBAColor,
    ) {
        this.ctx.globalCompositeOperation = composite;
        this.ctx.fillStyle = color.hexString();
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    public scale(scale: number, temp: CanvasBundle) {
        const width = this.canvas.width;
        const height = this.canvas.height;

        temp.clear();

        // Move over to temporary canvas
        temp.resize(width, height);
        temp.drawImage('source-over', this.canvas, 0, 0);

        // Scale main canvas
        this.canvas.width *= scale;
        this.canvas.height *= scale;
        this.clear();
        this.drawImage('source-over', temp.canvas, 0, 0, width, height, 0, 0, width * scale, height * scale);
    }

    public getImageData(): ImageData {
        return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
    }
}

export class SpindaGeneratorService extends BaseService {
    private readonly resources = {
        base: new Resource('spinda/base.png'),
        components: {
            red: new Resource('spinda/components/red.png'),
            tan: new Resource('spinda/components/tan.png'),
            black: new Resource('spinda/components/black.png'),
            mouth: new Resource('spinda/components/mouth.png'),
            shading: new Resource('spinda/components/shading.png'),
        },
        spots: {
            [SpotLocation.TopLeft]: new Spot('spinda/medium/top_left_spot.png', new Point(-2, -4)),
            [SpotLocation.TopRight]: new Spot('spinda/medium/top_right_spot.png', new Point(19, 2)),
            [SpotLocation.BottomLeft]: new Spot('spinda/medium/bottom_left_spot.png', new Point(2, 10)),
            [SpotLocation.BottomRight]: new Spot('spinda/medium/bottom_right_spot.png', new Point(13, 14)),
        },
        smallSpots: {
            [SpotLocation.TopLeft]: new Spot('spinda/small/top_left_spot.png', new Point(0, 0)),
            [SpotLocation.TopRight]: new Spot('spinda/small/top_right_spot.png', new Point(18, 6)),
            [SpotLocation.BottomLeft]: new Spot('spinda/small/bottom_left_spot.png', new Point(4, 13)),
            [SpotLocation.BottomRight]: new Spot('spinda/small/bottom_right_spot.png', new Point(14, 15)),
        },
        specialSpots: {
            heart: new Spot('spinda/special/bottom_left_heart.png', new Point(2, 10)),
            star: new Spot('spinda/special/bottom_right_star.png', new Point(12, 14)),
        },
    } as const;

    // Thickness for outline, set to 0 for no outline
    private readonly outlineThickness: number = 1;
    private readonly scale: number = 2;

    private readonly odds = {
        colors: {
            [SpindaColorChange.Shiny]: 8192,
            [SpindaColorChange.Retro]: 15,
            [SpindaColorChange.Gold]: 50,
            [SpindaColorChange.Green]: 75,
            [SpindaColorChange.Blue]: 100,
            [SpindaColorChange.Purple]: 125,
            [SpindaColorChange.Pink]: 150,
            [SpindaColorChange.Gray]: 175,
            [SpindaColorChange.Custom]: 200,
            [SpindaColorChange.Rainbow]: 50,
        },
        features: {
            [SpindaFeatures.SmallSpots]: 25,
            [SpindaFeatures.Heart]: 50,
            [SpindaFeatures.Star]: 50,
            [SpindaFeatures.Inverted]: 30,
        },
    } as const;

    // Cache for outline shape to draw
    private outlinePolygon: Point[] = null;

    private readonly numCanvases = 3;
    private canvases: Array<CanvasBundle> = [];

    public static readonly historySize: number = 5;
    public static readonly partySize: number = 8;

    private readonly history: Map<string, CircularBuffer<GeneratedSpinda>> = new Map();

    private getSpindaWidth() {
        return this.resources.base.image.width + this.outlineThickness * 2;
    }

    private getSpindaHeight() {
        return this.resources.base.image.height + this.outlineThickness * 2;
    }

    private resetCanvases() {
        const width = this.getSpindaWidth();
        const height = this.getSpindaHeight();
        for (const bundle of this.canvases) {
            bundle.resize(width, height);
            bundle.clear();
        }
    }

    private drawComponent(
        bundle: CanvasBundle,
        composite: CanvasGlobalCompositeOperation,
        resource: Resource,
        offset: Point = new Point(0, 0),
    ) {
        bundle.drawImage(composite, resource.image, offset.x + this.outlineThickness, offset.y + this.outlineThickness);
    }

    private resourcesLoaded(): boolean {
        return this.resources.base.loaded();
    }

    private async loadResources(resources: ResourceMap) {
        for (const key in resources) {
            const value = resources[key];
            if (value instanceof Resource) {
                await value.load(this.bot);
            }
            else {
                await this.loadResources(value);
            }
        }
    }

    private getRandomPID(): number {
        return Math.floor(Math.random() * 0x100000000);
    }

    private rollFeatures(spinda: GeneratedSpinda) {
        if (spinda.features === SpindaFeatures.Random) {
            spinda.features = SpindaFeatures.None;

            // Merge all features together as a bit string
            for (const key in this.odds.features) {
                if (Math.floor(Math.random() * this.odds.features[key]) === 0) {
                    spinda.features |= +key;
                }
            }
        }
    }

    private rollColorChange(spinda: GeneratedSpinda) {
        if (spinda.colorChange === SpindaColorChange.Random) {
            spinda.colorChange = SpindaColorChange.None;

            // Select first color that meets the odds
            for (const key in this.odds.colors) {
                if (Math.floor(Math.random() * this.odds.colors[key]) === 0) {
                    spinda.colorChange = +key;
                    break;
                }
            }
        }
    }

    private rollCustomColor(spinda: GeneratedSpinda) {
        if (spinda.colorChange === SpindaColorChange.Custom && spinda.customColor === null) {
            spinda.customColor = Color.HSV(
                Math.random(),
                Math.random(),
                // Limited value range, so the spots aren't too dark
                (Math.random() * 0.40) + 0.60,
            ).toRGB().hex;
        }
    }

    private drawOutline(bundle: CanvasBundle) {
        if (this.outlineThickness > 0) {
            bundle.ctx.strokeStyle = SpindaColorPalettes.white.rgb();
            bundle.ctx.lineWidth = this.outlineThickness * 2;
            bundle.ctx.beginPath();
            bundle.ctx.moveTo(this.outlinePolygon[0].x, this.outlinePolygon[0].y);
            for (let i = 1; i < this.outlinePolygon.length; ++i) {
                const point = this.outlinePolygon[i];
                bundle.ctx.lineTo(point.x, point.y);
            }
            bundle.ctx.closePath();
            bundle.ctx.stroke();
        }
    }

    private getSpots(features: SpindaFeatures): SpotData<Spot> {
        // Use normal or small spots
        let baseSpots: SpotData<Spot>;
        if (features & SpindaFeatures.SmallSpots) {
            baseSpots = this.resources.smallSpots;
        }
        else {
            baseSpots = this.resources.spots;
        }

        // Copy spots over
        const spots: Partial<SpotData<Spot>> = { };
        for (let i = SpotLocation.Start; i < SpotLocation.Count; ++i) {
            spots[i] = baseSpots[i];
        }

        // Use heart in bottom left
        if (features & SpindaFeatures.Heart) {
            spots[SpotLocation.BottomLeft] = this.resources.specialSpots.heart;
        }

        // Use star in bottom right
        if (features & SpindaFeatures.Star) {
            spots[SpotLocation.BottomRight] = this.resources.specialSpots.star;
        }

        return spots as SpotData<Spot>;
    }

    private getChannelHistory(id: string): CircularBuffer<GeneratedSpinda> {
        let buffer = this.history.get(id);
        if (!buffer) {
            buffer = new CircularBuffer(SpindaGeneratorService.historySize);
            this.history.set(id, buffer);
        }
        return buffer;
    }

    public pushToChannelHistory(id: string, spinda: GeneratedSpinda) {
        const buffer = this.getChannelHistory(id);
        buffer.push(spinda);
    }

    public getFromChannelHistory(id: string, offset: number = 0): GeneratedSpinda | undefined {
        const buffer = this.getChannelHistory(id);
        return buffer.get(offset);
    }

    public setChannelHistory(id: string, spinda: Array<GeneratedSpinda>) {
        const buffer = this.getChannelHistory(id);
        buffer.set(spinda);
    }

    public clearChannelHistory(id: string) {
        const buffer = this.getChannelHistory(id);
        buffer.clear();
    }

    public async generate(spinda: GeneratedSpinda = this.newSpinda(), scale: boolean = true): Promise<SpindaGenerationResult> {
        if (this.canvases.length < this.numCanvases) {
            for (let i = this.canvases.length; i < this.numCanvases; ++i) {
                this.canvases.push(new CanvasBundle());
            }
        }
        if (!this.resourcesLoaded()) {
            await this.loadResources(this.resources);
        }

        this.resetCanvases();

        const firstCanvas = this.canvases[0];
        const secondCanvas = this.canvases[1];
        const thirdCanvas = this.canvases[2];

        // Create outline polygon
        if (!this.outlinePolygon) {
            // Draw initial image for generating outline
            this.drawComponent(firstCanvas, 'source-over', this.resources.base);
            const drawer = new OutlineDrawer(firstCanvas.getImageData());
            this.outlinePolygon = drawer.getPolygon();
            firstCanvas.clear();
        }

        // Roll all random features
        this.rollFeatures(spinda);
        this.rollColorChange(spinda);
        this.rollCustomColor(spinda);

        // Draw color mask into first canvas
        SpindaColorMask.draw(spinda, firstCanvas);
        
        // Draw red body into second canvas
        this.drawComponent(secondCanvas, 'source-over', this.resources.components.red);

        // Draw red spots into primary canvas
        const spots = this.getSpots(spinda.features);
        for (let i = SpotLocation.Start; i < SpotLocation.Count; ++i) {
            const spot: Spot = spots[i];
            const origin: Point = spot.anchor.translate(
                NumberUtil.getSingleHexDigit(spinda.pid, 2 * i),
                NumberUtil.getSingleHexDigit(spinda.pid, 2 * i + 1)
            );

            this.drawComponent(secondCanvas, 'source-over', spot, origin);
        }

        // Draw tan body into third canvas
        this.drawComponent(thirdCanvas, 'source-over', this.resources.components.tan);

        // Inverted, so tan body is actually colored and spots are actually tan
        if (spinda.features & SpindaFeatures.Inverted) {
            secondCanvas.fillCanvas('source-in', SpindaColors.base);
            thirdCanvas.drawCanvas('source-in', firstCanvas);
        }
        else if (spinda.colorChange !== SpindaColorChange.None) {
            secondCanvas.drawCanvas('source-in', firstCanvas);
        }

        // Draw spots atop the body
        thirdCanvas.drawCanvas('source-atop', secondCanvas);

        // Put it all together
        firstCanvas.clear();
        this.drawOutline(firstCanvas);
        firstCanvas.drawCanvas('source-over', thirdCanvas);
        this.drawComponent(firstCanvas, 'source-over', this.resources.components.black);
        this.drawComponent(firstCanvas, 'source-over', this.resources.components.mouth);
        this.drawComponent(firstCanvas, 'source-over', this.resources.components.shading);

        if (scale) {
            firstCanvas.scale(this.scale, secondCanvas);
        }

        // Send image to Discord
        return {
            buffer: firstCanvas.canvas.toBuffer(),
            info: spinda,
        };
    }

    public async horde(spindaCollection?: Readonly<Array<GeneratedSpinda>>): Promise<HordeGenerationResult> {
        const generated = await Promise.all(
            spindaCollection === undefined || spindaCollection.length === 0
            ? [...new Array(SpindaGeneratorService.historySize)]
                .map(async () => await this.generate(this.newSpinda(), false))
            : spindaCollection
                .map(async (spinda) => await this.generate(spinda, false))
        );

        const width = this.getSpindaWidth();
        const height = this.getSpindaHeight();

        // Reset canvas
        const hordeCanvas = this.canvases[0];
        hordeCanvas.resize(width * generated.length * this.scale, height * this.scale);
        hordeCanvas.clear();

        const scaledWidth = width * this.scale;
        const scaledHeight = height * this.scale;
        for (let i = 0; i < generated.length; ++i) {
            const spinda = generated[i];

            const image = new Image();
            image.src = spinda.buffer;

            hordeCanvas.drawImage('source-over', image, 0, 0, width, height, scaledWidth * i, 0, scaledWidth, scaledHeight);
        }

        return {
            buffer: hordeCanvas.canvas.toBuffer(),
            info: generated.map(res => res.info),
        };
    }

    public async generateAndSend(msg: Message, spinda: GeneratedSpinda): Promise<void> {
        await msg.channel.send(new MessageAttachment((await this.generate(spinda)).buffer));
    }

    public newSpinda(): GeneratedSpinda {
        return {
            pid: this.getRandomPID(),
            generatedAt: new Date(),
            colorChange: SpindaColorChange.Random,
            features: SpindaFeatures.Random,
            customColor: null,
        };
    }
}