import { Command, CommandCategory, CommandPermission, CommandParameters } from '../base';
import { createCanvas, registerFont, loadImage, CanvasRenderingContext2D, Canvas } from 'canvas';
import { GuildMember, MessageAttachment } from 'discord.js';
import { DiscordUtil } from '../../../util/discord';

export class ScreenshotCommand implements Command {
    public name = 'screenshot';
    public args = 'user [@ timestamp] \\```message\\```';
    public description = 'Creates a fake Discord message screenshot.';
    public category = CommandCategory.Fun;
    public permission = CommandPermission.Everyone;

    private initialized = false;
    private canvas: Canvas = null;
    private ctx: CanvasRenderingContext2D = null;
    private croppedCanvas: Canvas = null;
    private croppedCtx: CanvasRenderingContext2D = null;

    private readonly imageWidth = 1104;
    private readonly maxImageHeight = 1280;

    private readonly colors = {
        background: '#36393f',
        normal: '#dcddde',
        muted: '#72767d',
        link: '#00b0f4',
    } as const;

    private readonly textAreaProperties = {
        margin: {
            top: 14,
        },
        padding: {
            top: 4,
            bottom: 4,
            left: 144,
            right: 96,
        },
    } as const;

    private readonly contentProperties = {
        height: 44,
        size: 32,
    }

    private readonly imageProperties = {
        left: 32,
        margin: {
            top: 3,
        },
        width: 80,
        height: 80,
    } as const;

    private readonly titleProperties = {
        height: 44,
        baseline: 44 - 16,
        username: {
            margin: {
                right: 8,
            },
            size: 32,
        },
        timestamp: {
            margin: {
                left: 8,
            },
            size: 24,
        },
    } as const;

    // Wraps a string of text across multiple lines
    private splitLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
        const paragraphs = text.split('\n');
        if (paragraphs.length > 1) {
            return paragraphs.map(para => this.splitLines(ctx, para, maxWidth)).flat();
        }
        else {
            const lines: string[] = [];
            const words = paragraphs[0].split(' ');
            let currentLine = '';
            for (let i = 0; i < words.length; ++i) {
                // Current line is empty, word[i] is the first word of line
                if (!currentLine) {
                    let wordSplit = false;
                    // If word exceeds the limit, we must break the word
                    while (ctx.measureText(words[i]).width >= maxWidth) {
                        const temp = words[i];
                        words[i] = temp.slice(0, -1);
                        // Insert an overflow word
                        if (!wordSplit) {
                            wordSplit = true;
                            words.splice(i + 1, 0, temp.slice(-1));
                        }
                        // Add to overflow word
                        else {
                            words[i + 1] = temp.slice(-1) + words[i + 1];
                        }
                    }

                    // Current line is the current word, which surely does not exceed the width now
                    currentLine = words[i];
                }
                else {
                    let lineWithNextWord = currentLine + ' ' + words[i];
                    if (ctx.measureText(lineWithNextWord).width >= maxWidth) {
                        lines.push(currentLine);
                        
                        // Reconsider this word on a new line
                        currentLine = '';
                        --i;
                    }
                    else {
                        currentLine = lineWithNextWord;
                    }
                }
            }

            if (currentLine) {
                lines.push(currentLine);
            }
            return lines;
        }
    }

    public async run({ bot, msg, content }: CommandParameters) {
        if (!this.initialized) {
            [300, 400, 500, 600, 700].forEach(weight => {
                registerFont(bot.resourceService.resolve(`discord/fonts/whitney_${weight}.ttf`), { family: `Whitney` });
            });

            this.canvas = createCanvas(this.imageWidth, this.maxImageHeight);
            this.ctx = this.canvas.getContext('2d');
            this.croppedCanvas = createCanvas(this.imageWidth, 0);
            this.croppedCtx = this.croppedCanvas.getContext('2d');

            this.initialized = true;
        }

        // Message content is given in a code block at the end of the message
        const codeBlockMatch = DiscordUtil.getCodeBlock(content);
        if (!codeBlockMatch.match) {
            throw new Error(`No code block found with message content.`);
        }
        const messageContent = codeBlockMatch.content;
        const args = content.substring(0, codeBlockMatch.index).split(/(?<!<)@/g).map(str => str.trim());
        if (args.length === 0 || args.length > 2) {
            throw new Error(`Incorrect number of arguments before code block.`);
        }

        const [givenUsername, givenTimestamp] = args;

        // Try to find guild member associated with the given username
        // Could have been a mention or just a name given
        let member: GuildMember;
        const mentionedUser = bot.getUserFromMention(givenUsername);
        if (mentionedUser) {
            member = msg.guild.member(mentionedUser);
        }
        else {
            const members = await bot.memberListService.getMemberListForGuild(msg.guild.id);
            member = members.find(member => givenUsername.localeCompare(member.user.username, undefined, { sensitivity: 'accent' }) === 0);
        }

        let username: string;
        let usernameColor: string;
        let usernameAvatar: string;

        // Create a fake user
        if (!member) {
            username = givenUsername;
            if (username.length < 2 || username.length > 32) {
                throw new Error(`Username must be between 2 and 32 characters.`);
            }
            usernameColor = '#FFFFFF';
            usernameAvatar = bot.resourceService.resolve('discord/default_avatar.png');
        }
        // Use an actual member's information
        else {
            username = member.displayName;
            usernameColor = member.displayHexColor;
            usernameAvatar = member.user.displayAvatarURL();
            if (usernameAvatar.endsWith('.webp')) {
                usernameAvatar = usernameAvatar.substring(0, usernameAvatar.length - 4) + 'png';
            }
        }
        const usernameAvatarImage = await loadImage(usernameAvatar);

        // Create the timestamp string
        let timestamp: string;
        if (!givenTimestamp || givenTimestamp.localeCompare('today', undefined, { sensitivity: 'accent' }) === 0) {
            timestamp = 'Today at ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute:'2-digit' });
        }
        else if (givenTimestamp.localeCompare('yesterday', undefined, { sensitivity: 'accent' }) === 0) {
            timestamp = 'Yesterday at ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute:'2-digit' });
        }
        else {
            const date = new Date(givenTimestamp);
            if (isNaN(date as any)) {
                throw new Error(`Invalid timestamp.`);
            }
            timestamp = date.toLocaleDateString([], { month: '2-digit', day: '2-digit', year: 'numeric' })
        }

        // Lay the background
        this.ctx.fillStyle = this.colors.background;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw the avatar in a circle
        this.ctx.save();
        const imageY = this.textAreaProperties.margin.top + this.imageProperties.margin.top;
        this.ctx.beginPath();
        this.ctx.arc(
            this.imageProperties.left + this.imageProperties.width / 2,
            imageY + this.imageProperties.height / 2,
            this.imageProperties.width / 2,
            0,
            2 * Math.PI
        );
        this.ctx.closePath();
        this.ctx.clip();

        this.ctx.drawImage(
            usernameAvatarImage,
            this.imageProperties.left,
            imageY,
            this.imageProperties.width,
            this.imageProperties.height
        );
        this.ctx.restore();

        // Write username
        this.ctx.fillStyle = usernameColor;
        this.ctx.font = `${this.titleProperties.username.size}px 'Whitney Medium'`;
        const usernameTextMetrics = this.ctx.measureText(username);
        this.ctx.fillText(
            username,
            this.textAreaProperties.padding.left,
            this.textAreaProperties.margin.top + this.textAreaProperties.padding.top + this.titleProperties.baseline
        );

        // Write timestamp
        this.ctx.fillStyle = this.colors['muted'];
        this.ctx.font = `${this.titleProperties.timestamp.size}px 'Whitney Medium'`;
        this.ctx.fillText(
            timestamp,
            this.textAreaProperties.padding.left + usernameTextMetrics.width + this.titleProperties.username.margin.right + this.titleProperties.timestamp.margin.left,
            this.textAreaProperties.margin.top + this.textAreaProperties.padding.top + this.titleProperties.baseline
        );

        // Write message content, wrapping as necessary
        this.ctx.fillStyle = this.colors.normal;
        this.ctx.font = `${this.contentProperties.size}px 'Whitney Book'`;

        const contentLeft = this.textAreaProperties.padding.left;
        const contentTop = this.textAreaProperties.margin.top + this.textAreaProperties.padding.top + this.titleProperties.height - this.contentProperties.size / 2;
        const maxLineWidthPixels = this.canvas.width - contentLeft - this.textAreaProperties.padding.right;

        const lines = this.splitLines(this.ctx, messageContent, maxLineWidthPixels);
        let currentLineTop = contentTop;
        for (const line of lines) {
            currentLineTop += this.contentProperties.height;
            this.ctx.fillText(
                line,
                contentLeft,
                currentLineTop
            );
        }

        // Crop image
        this.croppedCanvas.height = currentLineTop + this.contentProperties.size / 2;
        this.croppedCtx.drawImage(this.canvas, 0, 0);

        await msg.channel.send(new MessageAttachment(this.croppedCanvas.toBuffer()));
    }
}