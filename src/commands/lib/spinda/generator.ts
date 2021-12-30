import { Canvas, CanvasRenderingContext2D, Image, ImageData, createCanvas } from 'canvas';
import { Message, MessageAttachment, Snowflake } from 'discord.js';
import { BaseService } from 'panda-discord';

import { SpindaDiscordBot } from '../../../bot';
import { CircularBuffer } from '../../../util/circular-buffer';
import { Color, RGBAColor } from '../../../util/color';
import { NumberUtil } from '../../../util/number';
import { OutlineDrawer } from './util/outline';
import { Point } from './util/point';
import {
    Resource,
    ResourceMap,
    SpindaGenerationConfig,
    SpindaGenerationMetadata,
    SpindaResourceConfig,
    Spot,
    SpotData,
    SpotLocation,
} from './util/resources';
import { GeneratedSpindaData, Spinda, SpindaColorChange, SpindaFeature, SpindaGeneration } from './util/spinda';
import { SpindaColorMask, SpindaColors } from './util/spinda-colors';

type CanvasGlobalCompositeOperation = typeof CanvasRenderingContext2D.prototype.globalCompositeOperation;

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

    public drawImage(composite: CanvasGlobalCompositeOperation, ...args: any[]) {
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.globalCompositeOperation = composite;
        this.ctx.drawImage(...args);
    }

    public drawCanvas(composite: CanvasGlobalCompositeOperation, bundle: CanvasBundle) {
        this.drawImage(composite, bundle.canvas, 0, 0);
    }

    public fillColor(composite: CanvasGlobalCompositeOperation, color: RGBAColor) {
        this.ctx.globalCompositeOperation = composite;
        this.ctx.fillStyle = color.hexString();
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    public fillGradient(composite: CanvasGlobalCompositeOperation, gradient: CanvasGradient) {
        this.ctx.globalCompositeOperation = composite;
        this.ctx.fillStyle = gradient;
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
        return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    }
}

export interface GenerateOptions {
    scale: boolean;
    genOverride: SpindaGeneration | undefined;
}

const DefaultGenerateOptions: GenerateOptions = {
    scale: true,
    genOverride: undefined,
};

function makeGenerateOptions(options: Partial<GenerateOptions>): GenerateOptions {
    const result: Partial<GenerateOptions> = {};
    for (const key in DefaultGenerateOptions) {
        result[key] = options[key] ?? DefaultGenerateOptions[key];
    }
    return result as GenerateOptions;
}

interface SpindaGenerationResult {
    readonly buffer: Buffer;
    readonly spinda: Spinda;
}

interface HordeGenerationResult {
    readonly buffer: Buffer;
    readonly horde: Array<Spinda>;
}

export class SpindaGeneratorService extends BaseService<SpindaDiscordBot> {
    // Thickness for outline, set to 0 for no outline
    private readonly outlineThickness: number = 1;
    private readonly scale: number = 2;

    private readonly odds = {
        colors: [
            [SpindaColorChange.Shiny, 8192],
            [SpindaColorChange.Retro, 15],
            [SpindaColorChange.Gold, 50],
            [SpindaColorChange.Green, 75],
            [SpindaColorChange.Blue, 100],
            [SpindaColorChange.Purple, 125],
            [SpindaColorChange.Pink, 150],
            [SpindaColorChange.Gray, 175],
            [SpindaColorChange.Custom, 200],
            [SpindaColorChange.Rainbow, 150],
        ],
        features: [
            // [SpindaFeatures.SmallSpots, 25],
            [SpindaFeature.Heart, 50],
            [SpindaFeature.Star, 50],
            [SpindaFeature.Inverted, 30],
        ],
        gens: [
            [SpindaGeneration.Gen3, 8],
            [SpindaGeneration.Gen4, 8],
            [SpindaGeneration.Gen5, 8],
            [SpindaGeneration.Retro, 8],
            [SpindaGeneration.Random, 8],
            [SpindaGeneration.Normal, 1],
        ],
    } as const;

    // Have resources been loaded?
    private loaded: boolean = false;

    // Cache for outline shape to draw
    private outlinePolygons: Map<SpindaGeneration, Point[]> = new Map();

    private readonly numCanvases = 3;
    private canvases: Array<CanvasBundle> = [];

    public static readonly historySize: number = 5;
    public static readonly partySize: number = 8;

    private readonly history: Map<string, CircularBuffer<Spinda>> = new Map();

    private todaysGen: SpindaGeneration = undefined;

    private getSpindaWidth() {
        return SpindaGenerationMetadata.width + this.outlineThickness * 2;
    }

    private getSpindaHeight() {
        return SpindaGenerationMetadata.height + this.outlineThickness * 2;
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

    private async loadResources(resources: ResourceMap) {
        for (const key in resources) {
            const value = resources[key];
            if (value instanceof Resource) {
                await value.load(this.bot);
            } else {
                await this.loadResources(value);
            }
        }
    }

    private async loadSpindaResources() {
        for (const key of Object.keys(SpindaGenerationMetadata.gens)) {
            await this.loadResources(SpindaGenerationMetadata.gens[key].resources);
        }
    }

    private getRandomPID(): number {
        return Math.floor(Math.random() * 0x100000000);
    }

    private rollFeatures(spinda: Spinda) {
        if (spinda.isRandom()) {
            spinda.resetFeatures();

            // Roll independent features
            for (const [feature, odds] of this.odds.features) {
                if (Math.floor(Math.random() * odds) === 0) {
                    spinda.setFeature(feature);
                }
            }

            // Roll color
            for (const [color, odds] of this.odds.colors) {
                if (Math.floor(Math.random() * odds) === 0) {
                    spinda.setColor(color);
                    break;
                }
            }

            if (spinda.getColor() === SpindaColorChange.Custom) {
                spinda.setCustomColor(
                    Color.HSV(
                        Math.random(),
                        Math.random(),
                        // Limited value range, so the spots aren't too dark
                        Math.random() * 0.4 + 0.6,
                    ).toRGB(),
                );
            }

            // Generation is based on a value generated once per day
            if (this.todaysGen === undefined) {
                for (const [gen, odds] of this.odds.gens) {
                    if (Math.floor(Math.random() * odds) === 0) {
                        this.todaysGen = gen;
                        break;
                    }
                }
            }

            // Set generation
            if (this.todaysGen !== SpindaGeneration.Random) {
                spinda.setGeneration(this.todaysGen);
            } else {
                spinda.setGeneration(Math.floor(Math.random() * 5));
            }
        }
    }

    private drawOutline(bundle: CanvasBundle, gen: SpindaGeneration) {
        if (this.outlineThickness > 0) {
            const outlinePolygon = this.outlinePolygons.get(gen);
            bundle.ctx.strokeStyle = SpindaColors.white.hexString();
            bundle.ctx.lineWidth = this.outlineThickness * 2;
            bundle.ctx.beginPath();
            bundle.ctx.moveTo(outlinePolygon[0].x, outlinePolygon[0].y);
            for (let i = 1; i < outlinePolygon.length; ++i) {
                const point = outlinePolygon[i];
                bundle.ctx.lineTo(point.x, point.y);
            }
            bundle.ctx.closePath();
            bundle.ctx.stroke();
        }
    }

    private getSpots(spinda: Spinda, resources: SpindaResourceConfig): SpotData<Spot> {
        let spots: SpotData<Spot> = { ...resources.spots };

        // Use heart in bottom left
        if (spinda.getFeature(SpindaFeature.Heart)) {
            spots[SpotLocation.BottomLeft] = resources.specialSpots.heart;
        }

        // Use star in bottom right
        if (spinda.getFeature(SpindaFeature.Star)) {
            spots[SpotLocation.BottomRight] = resources.specialSpots.star;
        }

        return spots as SpotData<Spot>;
    }

    private getChannelHistory(id: Snowflake): CircularBuffer<Spinda> {
        let buffer = this.history.get(id);
        if (!buffer) {
            buffer = new CircularBuffer(SpindaGeneratorService.historySize);
            this.history.set(id, buffer);
        }
        return buffer;
    }

    public pushToChannelHistory(id: Snowflake, spinda: Spinda) {
        const buffer = this.getChannelHistory(id);
        buffer.push(spinda);
    }

    public getFromChannelHistory(id: Snowflake, offset: number = 0): Spinda | undefined {
        const buffer = this.getChannelHistory(id);
        return buffer.get(offset);
    }

    public setChannelHistory(id: Snowflake, spinda: Array<Spinda>) {
        const buffer = this.getChannelHistory(id);
        buffer.set(spinda);
    }

    public clearChannelHistory(id: Snowflake) {
        const buffer = this.getChannelHistory(id);
        buffer.clear();
    }

    public async generate(
        spindaData: GeneratedSpindaData = this.newSpinda(),
        options: Partial<GenerateOptions> = {},
    ): Promise<SpindaGenerationResult> {
        options = makeGenerateOptions(options);

        if (this.canvases.length < this.numCanvases) {
            for (let i = this.canvases.length; i < this.numCanvases; ++i) {
                this.canvases.push(new CanvasBundle());
            }
        }
        if (!this.loaded) {
            await this.loadSpindaResources();
        }

        this.resetCanvases();

        const firstCanvas = this.canvases[0];
        const secondCanvas = this.canvases[1];
        const thirdCanvas = this.canvases[2];

        const spinda = new Spinda(spindaData);
        this.rollFeatures(spinda);

        // Resources used for drawing depends on the generation
        const gen = options.genOverride ?? spinda.getGeneration();
        const generationData: SpindaGenerationConfig = SpindaGenerationMetadata.gens[gen];

        // Create outline polygon
        if (!this.outlinePolygons.has(gen)) {
            // Draw initial image for generating outline
            this.drawComponent(firstCanvas, 'source-over', generationData.resources.base);
            const drawer = new OutlineDrawer(firstCanvas.getImageData());
            this.outlinePolygons.set(gen, drawer.getPolygon());
            firstCanvas.clear();
        }

        // Draw color mask into first canvas
        SpindaColorMask.draw(spinda, firstCanvas);

        // Draw red body into second canvas
        this.drawComponent(secondCanvas, 'source-over', generationData.resources.components.red);

        // Draw red spots into primary canvas
        const spots = this.getSpots(spinda, generationData.resources);
        for (let i = SpotLocation.Start; i < SpotLocation.Count; ++i) {
            const spot: Spot = spots[i];
            const origin: Point = spot.anchor.translate(
                NumberUtil.getSingleHexDigit(spinda.pid, 2 * i),
                NumberUtil.getSingleHexDigit(spinda.pid, 2 * i + 1),
            );

            this.drawComponent(secondCanvas, 'source-over', spot, origin);
        }

        // Draw tan body into third canvas
        this.drawComponent(thirdCanvas, 'source-over', generationData.resources.components.tan);

        // Inverted, so tan body is actually colored and spots are actually tan
        if (spinda.getFeature(SpindaFeature.Inverted)) {
            secondCanvas.fillColor('source-in', generationData.baseColor);
            thirdCanvas.drawCanvas('source-in', firstCanvas);
        } else if (spinda.getColor() !== SpindaColorChange.None) {
            secondCanvas.drawCanvas('source-in', firstCanvas);
        }

        // Draw spots atop the body
        thirdCanvas.drawCanvas('source-atop', secondCanvas);

        // Put it all together
        firstCanvas.clear();
        this.drawOutline(firstCanvas, gen);
        firstCanvas.drawCanvas('source-over', thirdCanvas);
        this.drawComponent(firstCanvas, 'source-over', generationData.resources.components.black);
        if (generationData.resources.components.mouth) {
            this.drawComponent(firstCanvas, 'source-over', generationData.resources.components.mouth);
        }
        this.drawComponent(firstCanvas, 'source-over', generationData.resources.components.shading);

        if (options.scale) {
            firstCanvas.scale(this.scale, secondCanvas);
        }

        // Send image to Discord
        return {
            buffer: firstCanvas.canvas.toBuffer(),
            spinda: spinda,
        };
    }

    public async horde(
        spindaCollection?: Readonly<Array<GeneratedSpindaData>>,
        options: Partial<GenerateOptions> = {},
    ): Promise<HordeGenerationResult> {
        options = makeGenerateOptions(options);
        const individualOptions = { ...options, scale: false };
        const generated = await Promise.all(
            spindaCollection === undefined || spindaCollection.length === 0
                ? [...new Array(SpindaGeneratorService.historySize)].map(
                      async () => await this.generate(this.newSpinda(), individualOptions),
                  )
                : spindaCollection.map(async spinda => await this.generate(spinda, individualOptions)),
        );

        const width = this.getSpindaWidth();
        const height = this.getSpindaHeight();

        // Reset canvas
        const scale = options.scale ? this.scale : 1;
        const hordeCanvas = this.canvases[0];
        hordeCanvas.resize(width * generated.length * scale, height * scale);
        hordeCanvas.clear();

        const scaledWidth = width * scale;
        const scaledHeight = height * scale;
        for (let i = 0; i < generated.length; ++i) {
            const spinda = generated[i];

            const image = new Image();
            image.src = spinda.buffer;

            hordeCanvas.drawImage(
                'source-over',
                image,
                0,
                0,
                width,
                height,
                scaledWidth * i,
                0,
                scaledWidth,
                scaledHeight,
            );
        }

        return {
            buffer: hordeCanvas.canvas.toBuffer(),
            horde: generated.map(res => res.spinda),
        };
    }

    public async generateAndSend(msg: Message, spinda: GeneratedSpindaData): Promise<void> {
        await msg.channel.send({ files: [new MessageAttachment((await this.generate(spinda)).buffer)] });
    }

    public newSpinda(): GeneratedSpindaData {
        return {
            pid: this.getRandomPID(),
            features: SpindaFeature.Random,
            generatedAt: new Date(),
        };
    }

    public restart() {
        this.history.clear();
        this.todaysGen = undefined;
    }
}
