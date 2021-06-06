import { createCanvas, loadImage, Image, Canvas, CanvasRenderingContext2D } from 'canvas';
import { Message, MessageAttachment } from 'discord.js';
import { DiscordBot } from '../../../bot';
import { GeneratedSpinda, SpindaColorChange, SpindaFeatures } from '../../../data/model/caught-spinda';
import { BaseService } from '../../../services/base';
import { CircularBuffer } from '../../../util/circular-buffer';
import { NumberUtil } from '../../../util/number';
import { Color, RGBAColor } from '../../../util/color';
import { OutlineDrawer } from './util/outline';
import { Point } from './util/point';
import { ColorPositionGetter, SpindaColorChangeGetterGenerators, SpindaColorPalette, SpindaColorPalettes } from './util/spinda-colors';

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

export class SpindaGeneratorService extends BaseService {
    private readonly resources = {
        base: new Resource('spinda/base.png'),
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

    // Canvas for drawing Spinda
    private canvas: Canvas = createCanvas(0, 0);
    private ctx: CanvasRenderingContext2D = this.canvas.getContext('2d');

    // Temporary canvas used to scale the sprite
    private tempCanvas: Canvas = createCanvas(0, 0);
    private tempCtx: CanvasRenderingContext2D = this.tempCanvas.getContext('2d');

    // Canvas for putting a horde together
    private hordeCanvas: Canvas = createCanvas(0, 0);
    private hordeCtx: CanvasRenderingContext2D = this.hordeCanvas.getContext('2d');

    public static readonly historySize: number = 5;
    public static readonly partySize: number = 8;

    private readonly history: Map<string, CircularBuffer<GeneratedSpinda>> = new Map();

    private clear(ctx: CanvasRenderingContext2D) {
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    private drawImage(ctx: CanvasRenderingContext2D, ...args: any[]) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(...args);
    }

    private scaleCanvas(scale: number) {
        const width = this.canvas.width;
        const height = this.canvas.height;

        this.clear(this.tempCtx);

        // Move over to temporary canvas
        this.tempCanvas.width = width;
        this.tempCanvas.height = height;
        this.tempCtx.drawImage(this.canvas, 0, 0);

        // Scale main canvas
        this.canvas.width *= scale;
        this.canvas.height *= scale;
        this.clear(this.ctx);
        this.drawImage(this.ctx, this.tempCanvas, 0, 0, width, height, 0, 0, width * scale, height * scale);
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

    private getPixel(data: Uint8ClampedArray, x: number, y: number, width: number): RGBAColor {
        const i = (y * width + x) * 4;
        const [r, g, b, a]: number[] = data.slice(i, i + 4) as any;
        return Color.RGBA(r, g, b, a);
    }

    private getRandomPID(): number {
        return Math.floor(Math.random() * 0x100000000);
    }

    private drawOutline() {
        if (this.outlineThickness > 0) {
            this.ctx.strokeStyle = SpindaColorPalettes.white.rgb();
            this.ctx.lineWidth = this.outlineThickness * 2;
            this.ctx.beginPath();
            this.ctx.moveTo(this.outlinePolygon[0].x, this.outlinePolygon[0].y);
            for (let i = 1; i < this.outlinePolygon.length; ++i) {
                const point = this.outlinePolygon[i];
                this.ctx.lineTo(point.x, point.y);
            }
            this.ctx.closePath();
            this.ctx.stroke();
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

    private drawSpots(spinda: GeneratedSpinda) {
        const spots = this.getSpots(spinda.features);
        
        const baseData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height).data;
        const baseWidth = this.canvas.width;

        for (let i = SpotLocation.Start; i < SpotLocation.Count; ++i) {
            const spot: Spot = spots[i];
            const origin: Point = spot.anchor.translate(
                this.outlineThickness + NumberUtil.getSingleHexDigit(spinda.pid, 2 * i),
                this.outlineThickness + NumberUtil.getSingleHexDigit(spinda.pid, 2 * i + 1)
            );

            // Put spot in temporary canvas
            this.clear(this.tempCtx);
            this.tempCanvas.width = spot.image.width;
            this.tempCanvas.height = spot.image.height;
            this.tempCtx.drawImage(spot.image, 0, 0);

            const spotData = this.tempCtx.getImageData(0, 0, this.tempCanvas.width, this.tempCanvas.height).data;
            for (let x = 0; x < spot.image.width; ++x) {
                for (let y = 0; y < spot.image.height; ++y) {
                    const newPos: Point = origin.translate(x, y);
                    // Offscreen pixel
                    if (newPos.offscreen()) {
                        continue;
                    }

                    const spotPixel = this.getPixel(spotData, x, y, spot.image.width);
                    // Opaque pixel
                    if (spotPixel.alpha !== 0) {
                        const basePixel = this.getPixel(baseData, newPos.x, newPos.y, baseWidth);
                        let newPixel: RGBAColor;
                        switch (basePixel.hex) {
                            case SpindaColorPalettes.base.base.hex: newPixel = SpindaColorPalettes.normal.base; break;
                            case SpindaColorPalettes.base.shadow.hex: newPixel = SpindaColorPalettes.normal.shadow; break;
                            case SpindaColorPalettes.base.outline.hex: newPixel = SpindaColorPalettes.normal.outline; break;
                            default: newPixel = SpindaColorPalettes.transparent;
                        }
                        
                        if (newPixel.alpha !== 0) {
                            this.ctx.fillStyle = newPixel.rgba();
                            this.ctx.fillRect(newPos.x, newPos.y, 1, 1);
                        }
                    }
                }
            }
        }
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

    private makePalette(spinda: GeneratedSpinda): SpindaColorPalette {
        const palette: Partial<Writeable<SpindaColorPalette>> = { base: Color.Hex(spinda.customColor) };

        // Create shadow color
        let hsv = palette.base.toHSV();
        hsv.value *= 0.7083;
        const shadow = hsv.toRGB();
        shadow.blue += 20 * (hsv.value < 0.33 ? 1 - hsv.value : 1);
        palette.shadow = shadow;

        // Create outline color
        hsv.value *= 0.5;
        const outline = hsv.toRGB();
        outline.blue += 20 * (hsv.value < 0.33 ? 1 - hsv.value : 1);
        palette.outline = outline;

        return palette as SpindaColorPalette;
    }
    private recolor(spinda: GeneratedSpinda) {
        const inverted = spinda.features & SpindaFeatures.Inverted;
        if (spinda.colorChange !== SpindaColorChange.None || inverted) {
            const getColor: ColorPositionGetter = SpindaColorChangeGetterGenerators[spinda.colorChange](spinda);

            const width = this.canvas.width;
            const height = this.canvas.height;
            const imageData = this.ctx.getImageData(0, 0, width, height).data;

            // Temporary canvas will hold a translucent shadow/outline mask to apply over the base color
            this.clear(this.tempCtx);
            this.tempCanvas.width = width;
            this.tempCanvas.height = height;

            // Iterate over every pixel, change the spot colors

            if (inverted) {
                for (let x = 0; x < width; ++x) {
                    pixelLoop:
                    for (let y = 0; y < height; ++y) {
                        const pixel = this.getPixel(imageData, x, y, width);
                        for (const key in SpindaColorPalettes.normal) {
                            if (pixel.hex === SpindaColorPalettes.normal[key].hex) {
                                this.ctx.fillStyle = SpindaColorPalettes.base[key].hexString();
                                this.ctx.fillRect(x, y, 1, 1);
                                continue pixelLoop;
                            }
                        }

                        this.ctx.fillStyle = getColor(x, y).hexString();
                        switch (pixel.hex) {
                            case SpindaColorPalettes.base.base.hex: {
                                this.ctx.fillRect(x, y, 1, 1);
                            } break;
                            case SpindaColorPalettes.base.shadow.hex: {
                                this.ctx.fillRect(x, y, 1, 1);
                                this.tempCtx.fillStyle = SpindaColorPalettes.shadowMask.rgba();
                                this.tempCtx.fillRect(x, y, 1, 1);
                            } break;
                            case SpindaColorPalettes.base.outline.hex: {
                                this.ctx.fillRect(x, y, 1, 1);
                                this.tempCtx.fillStyle = SpindaColorPalettes.outlineMask.rgba();
                                this.tempCtx.fillRect(x, y, 1, 1);
                            } break;
                            default: break;
                        }
                    }
                }

                this.ctx.drawImage(this.tempCanvas, 0, 0);
            }
            else {
                for (let x = 0; x < width; ++x) {
                    for (let y = 0; y < height; ++y) {
                        this.ctx.fillStyle = getColor(x, y).hexString();
                        const pixel = this.getPixel(imageData, x, y, width);
                        switch (pixel.hex) {
                            case SpindaColorPalettes.normal.base.hex: {
                                this.ctx.fillRect(x, y, 1, 1);
                            } break;
                            case SpindaColorPalettes.normal.shadow.hex: {
                                this.ctx.fillRect(x, y, 1, 1);
                                this.tempCtx.fillStyle = SpindaColorPalettes.shadowMask.rgba();
                                this.tempCtx.fillRect(x, y, 1, 1);
                            } break;
                            case SpindaColorPalettes.normal.outline.hex: {
                                this.ctx.fillRect(x, y, 1, 1);
                                this.tempCtx.fillStyle = SpindaColorPalettes.outlineMask.rgba();
                                this.tempCtx.fillRect(x, y, 1, 1);
                            } break;
                            default: break;
                        }
                    }
                }

                this.ctx.drawImage(this.tempCanvas, 0, 0);
            }
        }
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
        if (!this.resourcesLoaded()) {
            await this.loadResources(this.resources);
        }

        // Reset canvas
        this.canvas.width = this.resources.base.image.width + this.outlineThickness * 2;
        this.canvas.height = this.resources.base.image.height + this.outlineThickness * 2;
        this.clear(this.ctx);

        // Create outline polygon
        if (!this.outlinePolygon) {
            // Draw initial image for generating outline
            this.drawImage(this.ctx, this.resources.base.image, this.outlineThickness, this.outlineThickness);
            const drawer = new OutlineDrawer(this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height));
            this.outlinePolygon = drawer.getPolygon();
            this.clear(this.ctx);
        }

        // Draw outline
        this.drawOutline();

        // Draw the base
        this.drawImage(this.ctx, this.resources.base.image, this.outlineThickness, this.outlineThickness);

        // Draw the random spots
        this.rollFeatures(spinda);
        this.drawSpots(spinda);

        // Recolor the sprite if necessary
        this.rollColorChange(spinda);
        this.rollCustomColor(spinda);
        this.recolor(spinda);

        if (scale) {
            this.scaleCanvas(this.scale);
        }

        // Send image to Discord
        return {
            buffer: this.canvas.toBuffer(),
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

        const width = this.resources.base.image.width + this.outlineThickness * 2;
        const height = this.resources.base.image.height + this.outlineThickness * 2;

        // Reset canvas
        this.hordeCanvas.width = width * generated.length * this.scale;
        this.hordeCanvas.height = height * this.scale;
        this.clear(this.hordeCtx);

        const scaledWidth = width * this.scale;
        const scaledHeight = height * this.scale;
        for (let i = 0; i < generated.length; ++i) {
            const spinda = generated[i];

            const image = new Image();
            image.src = spinda.buffer;

            this.drawImage(this.hordeCtx, image, 0, 0, width, height, scaledWidth * i, 0, scaledWidth, scaledHeight);
        }

        return {
            buffer: this.hordeCanvas.toBuffer(),
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