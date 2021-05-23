import { CommandCategory, CommandPermission, CommandParameters, StandardCooldowns, ComplexCommand, ArgumentsConfig, ArgumentType } from '../base';
import { Color, RGBColor } from '../../../util/color';
import { createCanvas, Canvas, CanvasRenderingContext2D } from 'canvas';
import { MessageAttachment } from 'discord.js';

interface ColorArgs {
    color?: string;
}

export class ColorCommand extends ComplexCommand<ColorArgs> {
    public name = 'color';
    public description = 'Displays a given or random color.'
    public category = CommandCategory.Fun;
    public permission = CommandPermission.Everyone;
    public cooldown = StandardCooldowns.Medium;

    public args: ArgumentsConfig<ColorArgs> = {
        color: {
            description: 'Hex code (#FFFFFF) or RGB code (R,G,B). If none is given, a random one is generated.',
            type: ArgumentType.RestOfContent,
            required: false,
        },
    };

    private readonly errorMessage = 'Invalid color format';

    // Canvas for generating color image
    private readonly canvasSize: number = 96;
    private readonly canvas: Canvas = createCanvas(this.canvasSize, this.canvasSize);
    private readonly ctx: CanvasRenderingContext2D = this.canvas.getContext('2d');

    public async run({ bot, src }: CommandParameters, args: ColorArgs) {
        let color: RGBColor = null;

        // Random color
        if (!args.color) {
            color = Color.Hex(Math.random() * 0x1000000);
        }
        else {
            const rgb = args.color.split(',');
            // RGB format
            if (rgb.length === 3) {
                const r = parseInt(rgb[0]);
                const g = parseInt(rgb[1]);
                const b = parseInt(rgb[2]);
                if (isNaN(r) || isNaN(g) || isNaN(b)) {
                    throw new Error(this.errorMessage);
                }
                color = Color.RGB(r, g, b);
            }
            // Hexadecimal format, or nothing
            else {
                let start = args.color[0] === '#' ? 1 : 0;
                if (args.color.length !== start + 6) {
                    throw new Error(this.errorMessage);
                }
                const r = parseInt(args.color.substr(start, 2), 16);
                const g = parseInt(args.color.substr(start + 2, 2), 16);
                const b = parseInt(args.color.substr(start + 4, 2), 16);
                if (isNaN(r) || isNaN(g) || isNaN(b)) {
                    throw new Error(this.errorMessage);
                }
                color = Color.RGB(r, g, b);
            }
        }

        const embed = bot.createEmbed();
        const hexString = color.hexString();
        const rgbString = color.rgb();
        embed.setColor(hexString);
        embed.addField('Hex', hexString);
        embed.addField('RGB', rgbString);

        // Generate image
        this.ctx.fillStyle = rgbString;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Attach generated file (.png extension is needed)
        const attachment = new MessageAttachment(this.canvas.toBuffer(), 'thumbnail.png');
        embed.attachFiles(attachment as any).setThumbnail('attachment://thumbnail.png');

        await src.send(embed);
    }
}