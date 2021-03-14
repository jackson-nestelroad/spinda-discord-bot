import { Command, CommandCategory, CommandPermission, CommandParameters, StandardCooldowns } from '../base';
import { Message, MessageAttachment } from 'discord.js';
import { createCanvas, loadImage, Image, Canvas, CanvasRenderingContext2D } from 'canvas';
import { SpindaColorPalette, SpindaColorPalettes } from './util/spinda-colors';
import { OutlineDrawer } from './util/outline';
import { Color } from './util/color';
import { Point } from './util/point';
import { DiscordBot } from '../../../bot';
import { GeneratedSpinda, SpindaColorChange } from '../../../data/model/caught-spinda';
import { SpindaCommandNames } from './command-names';

interface SpindaConfig<T> {
    base?: T,
    head?: T,
    0: T,
    1: T,
    2: T,
    3: T,
}

interface SpindaGenerationResult {
    readonly buffer: Buffer;
    readonly info: GeneratedSpinda;
}

export class SpindaCommand extends Command {
    public name = SpindaCommandNames.Generate;
    public args = '';
    public description = `Generates a random Spinda pattern from ${0xFFFFFFFF.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")} possibilities. There is even a chance for shinies!`;
    public category = CommandCategory.Fun;
    public permission = CommandPermission.Everyone;

    // Paths to resources
    private readonly resourcePaths: SpindaConfig<string> = {
        base: 'spinda/base.png',
        0: 'spinda/medium/top_left_spot.png',
        1: 'spinda/medium/top_right_spot.png',
        2: 'spinda/medium/bottom_left_spot.png',
        3: 'spinda/medium/bottom_right_spot.png',
    } as const;

    // Actual resources fetched and cached
    private readonly resources: SpindaConfig<Image> = { } as any;

    // Defines the top-left corner of each spot
    private readonly spotAnchors: SpindaConfig<Point> = {
        0: new Point(-2, -4),
        1: new Point(19, 2),
        2: new Point(2, 10),
        3: new Point(13, 14),
    } as const;

    // Thickness for outline, set to 0 for no outline
    private readonly outlineThickness: number = 1;
    private readonly scale: number = 2;

    private readonly shinyOdds: number = 8192;

    private readonly history: Map<string, GeneratedSpinda> = new Map();

    // Cache for outline shape to draw
    private outlinePolygon: Point[] = null;

    // Canvas for drawing Spinda
    private canvas: Canvas = createCanvas(0, 0);
    private ctx: CanvasRenderingContext2D = this.canvas.getContext('2d');

    // Temporary canvas used to scale the sprite
    private tempCanvas: Canvas = createCanvas(0, 0);
    private tempCtx: CanvasRenderingContext2D = this.tempCanvas.getContext('2d');
    
    private clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    private clearTemp() {
        this.tempCtx.clearRect(0, 0, this.tempCanvas.width, this.tempCanvas.height);
    }

    private drawImage(...args: any[]) {
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.drawImage(...args);
    }

    private scaleCanvas(scale: number) {
        const width = this.canvas.width;
        const height = this.canvas.height;

        this.clearTemp();

        // Move over to temporary canvas
        this.tempCanvas.width = width;
        this.tempCanvas.height = height;
        this.tempCtx.drawImage(this.canvas, 0, 0);

        // Scale main canvas
        this.canvas.width *= scale;
        this.canvas.height *= scale;
        this.clear();
        this.drawImage(this.tempCanvas, 0, 0, width, height, 0, 0, width * scale, height * scale);
    }

    private resourcesLoaded(): boolean {
        return Object.getOwnPropertyNames(this.resources).length !== 0;
    }

    private async loadResources(bot: DiscordBot) {
        for (const key in this.resourcePaths) {
            this.resources[key] = await loadImage(bot.resourceService.resolve(this.resourcePaths[key]));
        }
    }

    private getPixel(data: Uint8ClampedArray, x: number, y: number, width: number): Color {
        const i = (y * width + x) * 4;
        const [r, g, b, a]: number[] = data.slice(i, i + 4) as any;
        return new Color(r, g, b, a);
    }

    private getRandomPID(): number {
        return Math.floor(Math.random() * 0xFFFFFFFF);
    }

    private getHexDigit(pid: number, digit: number): number {
        const shift = digit << 2;
        return (pid & (0xF << shift)) >>> shift;
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

    private drawSpots(pid: number) {
        // Get actual origin for spots
        const offsetSpotAnchors: SpindaConfig<Point> = Object.entries(this.spotAnchors)
            .map(([key, point]) => [key, point.translate(this.outlineThickness, this.outlineThickness)])
            .reduce((obj, entry) => { 
                return { ...obj, [entry[0] as any]: entry[1], }
            }, { }) as any;
        
        const baseData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height).data;
        const baseWidth = this.canvas.width;

        for (let i = 0; i < 4; ++i) {
            const originalOrigin: Point = offsetSpotAnchors[i];
            const origin: Point = originalOrigin.translate(this.getHexDigit(pid, 2 * i), this.getHexDigit(pid, 2 * i + 1));
            const spot: Image = this.resources[i];

            // Put spot in temporary canvas
            this.clearTemp();
            this.tempCanvas.width = spot.width;
            this.tempCanvas.height = spot.height;
            this.tempCtx.drawImage(spot, 0, 0);

            const spotData = this.tempCtx.getImageData(0, 0, this.tempCanvas.width, this.tempCanvas.height).data;
            for (let x = 0; x < spot.width; ++x) {
                for (let y = 0; y < spot.height; ++y) {
                    const newPos: Point = origin.translate(x, y);
                    // Offscreen pixel
                    if (newPos.offscreen()) {
                        continue;
                    }

                    const spotPixel = this.getPixel(spotData, x, y, spot.width);
                    // Opaque pixel
                    if (spotPixel.alpha !== 0) {
                        const basePixel = this.getPixel(baseData, newPos.x, newPos.y, baseWidth);
                        let newPixel: Color;
                        switch (basePixel.hex) {
                            case SpindaColorPalettes.base.base.hex: newPixel = SpindaColorPalettes.normal.base; break;
                            case SpindaColorPalettes.base.shadow.hex: newPixel = SpindaColorPalettes.normal.shadow; break;
                            case SpindaColorPalettes.base.outline.hex: newPixel = SpindaColorPalettes.normal.outline; break;
                            case SpindaColorPalettes.base.highlight.hex: newPixel = SpindaColorPalettes.normal.highlight; break;
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
    
    private recolorShiny(palette: SpindaColorPalette) {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const imageData = this.ctx.getImageData(0, 0, width, height).data;
        // Iterate over every pixel, change the spot colors
        for (let x = 0; x < width; ++x) {
            for (let y = 0; y < height; ++y) {
                const pixel = this.getPixel(imageData, x, y, width);
                for (const key in SpindaColorPalettes.normal) {
                    if (pixel.hex === SpindaColorPalettes.normal[key].hex) {
                        this.ctx.fillStyle = palette[key].rgba();
                        this.ctx.fillRect(x, y, 1, 1);
                        break;
                    }
                }
            }
        }
    }

    public async run({ bot, msg }: CommandParameters) {
        // Generate a new Spinda
        const result = await this.generate(bot, {
            pid: this.getRandomPID(),
            colorChange: SpindaColorChange.Random,
            generatedAt: new Date(),
        });
        
        // Save it as the last Spinda generated in the channel
        this.history.set(msg.channel.id, result.info);

        // Send the image
        await msg.channel.send(new MessageAttachment(result.buffer));
    }

    public async generateAndSend(bot: DiscordBot, msg: Message, spinda: GeneratedSpinda): Promise<void> {
        await msg.channel.send(new MessageAttachment((await this.generate(bot, spinda)).buffer));
    }

    public async generate(bot: DiscordBot, spinda: GeneratedSpinda): Promise<SpindaGenerationResult> {
        if (!this.resourcesLoaded()) {
            await this.loadResources(bot);
        }

        // Reset canvas
        this.canvas.width = this.resources.base.width + this.outlineThickness * 2;
        this.canvas.height = this.resources.base.height + this.outlineThickness * 2;
        this.clear();

        // Create outline polygon
        if (!this.outlinePolygon) {
            // Draw initial image for generating outline
            this.drawImage(this.resources.base, this.outlineThickness, this.outlineThickness);
            const drawer = new OutlineDrawer(this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height));
            this.outlinePolygon = drawer.getPolygon();
            this.clear();
        }

        // Draw outline
        this.drawOutline();

        // Draw the base
        this.drawImage(this.resources.base, this.outlineThickness, this.outlineThickness);

        // Draw the random spots
        this.drawSpots(spinda.pid);

        // Chance of shiny
        switch (spinda.colorChange) {
            case SpindaColorChange.Random: {
                if (Math.floor(Math.random() * this.shinyOdds) === 0) {
                    spinda.colorChange = SpindaColorChange.Shiny;
                    this.recolorShiny(SpindaColorPalettes.shiny);
                }
                else {
                    spinda.colorChange = SpindaColorChange.None;
                }
            } break;
            case SpindaColorChange.Shiny: {
                this.recolorShiny(SpindaColorPalettes.shiny);
            } break;
        }

        this.scaleCanvas(this.scale);

        // Send image to Discord
        return {
            buffer: this.canvas.toBuffer(),
            info: spinda,
        };
    }

    public getLastGeneratedForChannel(id: string): GeneratedSpinda | undefined {
        return this.history.get(id);
    }

    public deleteLastGeneratedForChannel(id: string) {
        this.history.delete(id);
    }
}