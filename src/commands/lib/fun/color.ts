import { Command, CommandCategory, CommandPermission, CommandParameters } from '../base';
import { Color } from '../spinda/color';
import { createCanvas, Canvas, CanvasRenderingContext2D } from 'canvas';
import { MessageAttachment } from 'discord.js';

export class ColorCommand implements Command {
    public name = 'color';
    public args = '(#hex | R,G,B)';
    public description = 'Displays the given color. If no color is given, a random one is generated.'
    public category = CommandCategory.Fun;
    public permission = CommandPermission.Everyone;

    private readonly errorMessage = 'Invalid color format';

    // Canvas for generating color image
    private readonly canvasSize: number = 96;
    private readonly canvas: Canvas = createCanvas(this.canvasSize, this.canvasSize);
    private readonly ctx: CanvasRenderingContext2D = this.canvas.getContext('2d');

    public async run({ bot, msg, content }: CommandParameters) {
        let color: Color = null;

        // Random color
        if (!content) {
            color = new Color(Math.floor(Math.random() * 256), Math.floor(Math.random() * 256), Math.floor(Math.random() * 256));
        }
        else {
            const rgb = content.split(',');
            // RGB format
            if (rgb.length === 3) {
                const r = parseInt(rgb[0]);
                const g = parseInt(rgb[1]);
                const b = parseInt(rgb[2]);
                if (isNaN(r) || isNaN(g) || isNaN(b)) {
                    throw new Error(this.errorMessage);
                }
                color = new Color(r, g, b);
            }
            // Hexadecimal format, or nothing
            else {
                let start = content[0] === '#' ? 1 : 0;
                if (content.length !== start + 6) {
                    throw new Error(this.errorMessage);
                }
                const r = parseInt(content.substr(start, 2), 16);
                const g = parseInt(content.substr(start + 2, 2), 16);
                const b = parseInt(content.substr(start + 4, 2), 16);
                if (isNaN(r) || isNaN(g) || isNaN(b)) {
                    throw new Error(this.errorMessage);
                }
                color = new Color(r, g, b);
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

        await msg.channel.send(embed);
    }
}