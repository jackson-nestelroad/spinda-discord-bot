import { Canvas, CanvasRenderingContext2D, createCanvas } from 'canvas';
import { AttachmentBuilder } from 'discord.js';
import { ArgumentType, ArgumentsConfig, CommandParameters, ComplexCommand, StandardCooldowns } from 'panda-discord';

import { CommandCategory, CommandPermission, SpindaDiscordBot } from '../../../bot';
import { Color, RGBAColor } from '../../../util/color';

interface ColorArgs {
    color?: string;
}

export class ColorCommand extends ComplexCommand<SpindaDiscordBot, ColorArgs> {
    public name = 'color';
    public description = 'Displays a given or random color.';
    public category = CommandCategory.Fun;
    public permission = CommandPermission.Everyone;
    public cooldown = StandardCooldowns.Medium;

    public enableInDM = true;

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

    public async run({ bot, src }: CommandParameters<SpindaDiscordBot>, args: ColorArgs) {
        let color: RGBAColor = null;

        // Random color
        if (!args.color) {
            color = Color.Hex(Math.random() * 0x1000000);
        } else {
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
                const r = parseInt(args.color.substring(start, start + 2), 16);
                const g = parseInt(args.color.substring(start + 2, start + 4), 16);
                const b = parseInt(args.color.substring(start + 4, 2), 16);
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
        embed.addFields({ name: 'Hex', value: hexString }, { name: 'RGB', value: rgbString });

        // Generate image
        this.ctx.fillStyle = rgbString;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Attach generated file (.png extension is needed)
        const attachment = new AttachmentBuilder(this.canvas.toBuffer(), { name: 'thumbnail.png' });
        embed.setThumbnail('attachment://thumbnail.png');

        await src.send({ embeds: [embed], files: [attachment] });
    }
}
