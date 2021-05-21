import { CommandInteraction, Guild, GuildMember, Message, MessageAttachment, MessageEmbed, TextChannel, User } from 'discord.js';

export type Receivable = Message | CommandInteraction;
export type Response = string | MessageEmbed | MessageAttachment;

// A wrapper around a message or an interaction, whichever receives the command
// This class provides a common interface for replying to a command
// All replies or messages sent through this interface produce another interface
// If an ephemeral reply is sent to an interaction, the same interaction is exposed
// In any other case, the sent message is exposed, which is easier to work with
export class CommandSource {
    // A single flag records if the internal instance is a message so it is only checked once
    private messageFlag: boolean;
    private native: Receivable;

    public constructor(received: Receivable) {
        this.messageFlag = received instanceof Message;
        this.native = received;
    }

    public get isMessage(): boolean {
        return this.messageFlag;
    }

    public get isInteraction(): boolean {
        return !this.messageFlag;
    }

    // Get the internal instance as a message
    public get message(): Message {
        return this.native as Message;
    }

    // Get the internal instance as an interaction
    public get interaction(): CommandInteraction {
        return this.native as CommandInteraction;
    }
    
    public get author(): User {
        return this.isMessage
            ? (this.native as Message).author
            : (this.native as CommandInteraction).user;
    }

    public async content(): Promise<string> {
        if (this.isMessage) {
            return this.message.content;
        }
        else {
            this.assertReplied();
            return (await this.interaction.fetchReply()).content;
        }
    }

    public get member(): GuildMember {
        return this.native.member as GuildMember;
    }

    public get guild(): Guild {
        return this.native.guild;
    }

    // Guaranteed to be a text channel, since we only allow commands through them
    public get channel(): TextChannel {
        return this.native.channel as TextChannel;
    }

    // Only messages can be deleted
    public get deletable(): boolean {
        return this.isMessage && (this.native as Message).deletable;
    }
    
    public setReplied() {
        if (this.isInteraction) {
            this.interaction.replied = true;
        }
    }

    // Only messages can be deleted
    public async delete(): Promise<void> {
        if (this.isMessage) {
            await (this.native as Message).delete();
        }
        else {
            await (this.native as CommandInteraction).deleteReply();
        }
    }

    // Only interactions can be deferred
    public async defer(): Promise<void> {
        if (this.isInteraction && !this.interaction.deferred) {
            return await this.interaction.defer();
        }
    }

    private assertReplied(): void {
        if (!this.interaction.replied) {
            throw new Error(`No reply content available for this interaction. Make sure to reply first.`);
        }
    }

    private static throwInvalidResponseObject() {
        throw new Error('Invalid response object.');
    }

    private static async respondInteraction(interaction: CommandInteraction, res: Response, ephemeral: boolean = false): Promise<CommandSource> {
        // No initial reply sent
        if (!interaction.replied) {
            // Interaction has not been deferred, so we use the original reply method
            if (!interaction.deferred) {
                if (typeof res === 'string') {
                    await interaction.reply(res, { ephemeral });
                }
                else if (res instanceof MessageEmbed) {
                    await interaction.reply({ ephemeral, embeds: [res] });
                }
                else if (res instanceof MessageAttachment) {
                    await interaction.reply({ ephemeral, files: [res] });
                }
                else {
                    this.throwInvalidResponseObject();
                }

                if (ephemeral) {
                    return new CommandSource(interaction);
                }
                else {
                    const reply = await interaction.fetchReply();
                    return new CommandSource(reply as Message);
                }
            }
            // Interaction was deferred, use editReply
            else {
                let reply: Message;
                if (typeof res === 'string') {
                    reply = await interaction.editReply(res) as Message;
                }
                else if (res instanceof MessageEmbed) {
                    reply = await interaction.editReply({ embeds: [res] }) as Message;
                }
                else if (res instanceof MessageAttachment) {
                    reply = await interaction.editReply({ files: [res] }) as Message;
                }
                else {
                    this.throwInvalidResponseObject();
                }

                // For consistency, set that the interaction has been replied to
                // If we don't do this, future responses on this interaction will also call editReply
                // causing all messages to blend together
                // This is very likely to not be intentional by the command, so it makes more sense to split things up
                interaction.replied = true;

                return new CommandSource(reply);
            }
        }
        // Send a follow-up message
        else {
            let reply: Message;
            if (typeof res === 'string') {
                reply = await interaction.followUp(res, { ephemeral }) as Message;
            }
            else if (res instanceof MessageEmbed) {
                reply = await interaction.followUp({ ephemeral, embeds: [res] }) as Message;
            }
            else if (res instanceof MessageAttachment) {
                reply = await interaction.followUp({ ephemeral, files: [res] }) as Message;
            }
            else {
                this.throwInvalidResponseObject();
            }

            return new CommandSource(reply);
        }
    }

    // Inline reply for message, reply/follow up for interaction
    public async reply(res: Response): Promise<CommandSource> {
        return this.isMessage
            ? new CommandSource(await (this.native as Message).reply(res))
            : await CommandSource.respondInteraction(this.native as CommandInteraction, res);
    }

    // Send to channel for message, reply/follow up for interaction
    public async send(res: Response): Promise<CommandSource> {
        return this.isMessage
            ? new CommandSource(await (this.native as Message).channel.send(res))
            : await CommandSource.respondInteraction(this.native as CommandInteraction, res);
    }

    // Edit message or interaction reply
    public async edit(res: Response): Promise<CommandSource> {
        let edited: Message;

        if (this.isMessage) {
            if (res instanceof MessageAttachment) {
                edited = await this.message.edit({ attachments: [res] });
            }
            else if (typeof res === 'string' || res instanceof MessageEmbed) {
                edited = await this.message.edit(res);
            }
            else {
                CommandSource.throwInvalidResponseObject();
            }
        }
        else {
            // Having a replied interaction here means the reply must be ephemeral
            this.assertReplied();

            if (typeof res === 'string') {
                edited = await this.interaction.editReply(res) as Message;
            }
            else if (res instanceof MessageEmbed) {
                edited = await this.interaction.editReply({ embeds: [res] }) as Message;
            }
            else if (res instanceof MessageAttachment) {
                edited = await this.interaction.editReply({ files: [res] }) as Message;
            }
            else {
                CommandSource.throwInvalidResponseObject();
            }
        }

        return new CommandSource(edited);
    }

    // Append to message content or interaction reply
    public async append(res: string): Promise<CommandSource> {
        if (this.isMessage) {
            return new CommandSource(await this.message.edit(this.message.content + res));
        }
        else {
            this.assertReplied();
            const content = (await this.interaction.fetchReply()).content;
            await this.interaction.editReply(content + res);
        }
    }

    // Inline reply for message, ephemeral reply for interaction
    public async replyEphemeral(res: Response): Promise<CommandSource> {
        return this.isMessage
            ? new CommandSource(await (this.native as Message).reply(res))
            : await CommandSource.respondInteraction(this.native as CommandInteraction, res, true);
    }

    // Send to channel for message, ephemeral reply for interaction
    public async sendEphemeral(res: Response): Promise<CommandSource> {
        return this.isMessage
            ? new CommandSource(await (this.native as Message).channel.send(res))
            : await CommandSource.respondInteraction(this.native as CommandInteraction, res, true);
    }
    
    // Direct message, ephemeral reply for interaction
    public async sendDirect(res: Response): Promise<CommandSource> {
        return this.isMessage
            ? new CommandSource(await (this.native as Message).author.send(res))
            : await CommandSource.respondInteraction(this.native as CommandInteraction, res, true);
    }
}