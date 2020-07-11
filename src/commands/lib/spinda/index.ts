import { Command, CommandCategory, CommandPermission } from '../base';
import { DiscordBot } from '../../../bot';
import { Message, MessageAttachment } from 'discord.js';
import { createCanvas, loadImage, Image, Canvas, CanvasRenderingContext2D } from 'canvas';
import { resolve } from 'path';
import { SpindaColors } from './spinda-colors';
import { OutlineDrawer } from './outline';
import { Color } from './color';
import { Point } from './point';

interface SpindaConfig<T> {
    base?: T,
    head?: T,
    0: T,
    1: T,
    2: T,
    3: T,
}

export class SpindaCommand implements Command {
    public names =  ['spinda'];
    public args =  '';
    public description = `Generates a random Spinda pattern from ${0xFFFFFFFF.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")} possibilities. There is even a chance for shinies!`;
    public category = CommandCategory.Fun;
    public permission = CommandPermission.Everyone;

    // Paths to resources
    private readonly resourcePaths: SpindaConfig<string> = {
        base: 'spinda/base.png',
        0: 'spinda/top_left_spot.png',
        1: 'spinda/top_right_spot.png',
        2: 'spinda/bottom_left_spot.png',
        3: 'spinda/bottom_right_spot.png',
    };

    // Actual resources fetched and cached
    private readonly resources: SpindaConfig<Image> = { } as any;

    // Defines the top-left corner of the smallest possible box the spot can fit into (if the spot is 0x0)
    // The actual origin, or top-left corner of a spot, will be calculated with the width and height of each spots
    private readonly spotAnchors: SpindaConfig<Point> = {
        0: new Point(8, 7),
        1: new Point(32, 13),
        2: new Point(8, 19),
        3: new Point(20, 23),
    };

    // Thickness for outline, set to 0 for no outline
    private readonly outlineThickness: number = 1;

    private readonly shinyOdds: number = 8192;

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

    private scale(scale: number) {
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

    private async loadResources() {
        const resourcePath = resolve(resolve(process.cwd(), 'resources'));
        for (const key in this.resourcePaths) {
            this.resources[key] = await loadImage(resolve(resourcePath, this.resourcePaths[key]));
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
            this.ctx.strokeStyle = SpindaColors.white.rgb;
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
            .map(([key, point]) => [key, point.translate(this.outlineThickness - this.resources[key].width, this.outlineThickness - this.resources[key].height)])
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
                            case SpindaColors.base.base.hex: newPixel = SpindaColors.spots.base; break;
                            case SpindaColors.base.shadow.hex: newPixel = SpindaColors.spots.shadow; break;
                            case SpindaColors.base.outline.hex: newPixel = SpindaColors.spots.outline; break;
                            case SpindaColors.base.highlight.hex: newPixel = SpindaColors.spots.highlight; break;
                            default: newPixel = SpindaColors.transparent;
                        }
                        if (newPixel.alpha !== 0) {
                            this.ctx.fillStyle = newPixel.rgba;
                            this.ctx.fillRect(newPos.x, newPos.y, 1, 1);
                        }
                    }
                }
            }
        }
    }
    
    private recolorShiny() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const imageData = this.ctx.getImageData(0, 0, width, height).data;
        if (Math.floor(Math.random() * this.shinyOdds) === 0) {
            // Iterate over every pixel, change the spot colors
            for (let x = 0; x < width; ++x) {
                for (let y = 0; y < height; ++y) {
                    const pixel = this.getPixel(imageData, x, y, width);
                    for (const key in SpindaColors.spots) {
                        if (pixel.hex === SpindaColors.spots[key].hex) {
                            this.ctx.fillStyle = SpindaColors.shinySpots[key].rgba;
                            this.ctx.fillRect(x, y, 1, 1);
                        }
                    }
                }
            }
        }
    }

    public async run(bot: DiscordBot, msg: Message) {
        // Need resources
        if (Object.getOwnPropertyNames(this.resources).length === 0) {
            await this.loadResources();
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
        const pid = this.getRandomPID();
        this.drawSpots(pid);

        // Chance of shiny
        if (Math.floor(Math.random() * this.shinyOdds) === 327) {
            this.recolorShiny();
        }

        this.scale(2);

        // Send image to Discord
        msg.channel.send(new MessageAttachment(this.canvas.toBuffer()));
    }
}