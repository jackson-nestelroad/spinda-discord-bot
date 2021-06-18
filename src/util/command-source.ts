import { CommandInteraction, Guild, GuildMember, InteractionReplyOptions, Message, MessageEditOptions, MessageOptions, ReplyMessageOptions, TextChannel, User, WebhookEditMessageOptions } from 'discord.js';

export type Receivable = Message | CommandInteraction;

type DisableSplit = { split?: false };
type CommonReplyOptions = ReplyMessageOptions & InteractionReplyOptions & DisableSplit;
type CommonSendOptions = MessageOptions & InteractionReplyOptions & DisableSplit;
type CommonEditOptions = MessageEditOptions & WebhookEditMessageOptions;

export type ReplyResponse = string | CommonReplyOptions;
export type SendResponse = string | CommonSendOptions;
export type EditResponse = string | CommonEditOptions;

// A wrapper around a message or an interaction, whichever receives the command
// This class provides a common interface for replying to a command
// All replies or messages sent through this interface produce another interface
// If an ephemeral reply is sent to an interaction, the same interaction is exposed
// In any other case, the sent message is exposed, which is easier to work with
export class CommandSource {
    // A single flag records if the internal instance is a message so it is only checked once
    private messageFlag: boolean;
    private native: Receivable;
    private deferredEphemeral: boolean = false;

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
    public async defer(ephemeral: boolean = false): Promise<void> {
        if (this.isInteraction && !this.interaction.deferred && !this.interaction.replied) {
            this.deferredEphemeral = ephemeral;
            this.interaction.defer({ ephemeral });
            this.interaction.deferred = true;
        }
    }

    private assertReplied(): void {
        if (!this.interaction.replied) {
            throw new Error(`No reply content available for this interaction. Make sure to reply first.`);
        }
    }

    private async respondInteraction(res: SendResponse & ReplyResponse & EditResponse): Promise<CommandSource> {
        const interaction = this.interaction;
        const ephemeral = typeof res !== 'string' && (res as any).ephemeral === true;

        // No initial reply sent
        if (!interaction.replied) {
            // Interaction has not been deferred, so we use the original reply method
            if (!interaction.deferred) {
                await interaction.reply(res);

                if (ephemeral || this.deferredEphemeral) {
                    return new CommandSource(interaction);
                }
                else {
                    const reply = await interaction.fetchReply();
                    return new CommandSource(reply as Message);
                }
            }
            // Interaction was deferred, use editReply
            else {
                const reply = await interaction.editReply(res) as Message;

                // For consistency, set that the interaction has been replied to
                // If we don't do this, future responses on this interaction will also call editReply
                // causing all messages to blend together
                // This is very likely to not be intentional by the command, so it makes more sense to split things up
                interaction.replied = true;

                return new CommandSource(ephemeral || this.deferredEphemeral ? interaction : reply);
            }
        }
        // Send a follow-up message
        else {
            const reply = await interaction.followUp(res) as Message;
            return new CommandSource(ephemeral || this.deferredEphemeral ? interaction : reply);
        }
    }

    // Inline reply for message, reply/follow up for interaction
    public async reply(res: ReplyResponse): Promise<CommandSource> {
        return this.isMessage
            ? new CommandSource(await (this.native as Message).reply(res))
            : await this.respondInteraction(res);
    }

    // Send to channel for message, reply/follow up for interaction
    public async send(res: SendResponse): Promise<CommandSource> {
        return this.isMessage
            ? new CommandSource(await (this.native as Message).channel.send(res))
            : await this.respondInteraction(res);
    }

    // Edit message or interaction reply
    public async edit(res: EditResponse): Promise<CommandSource> {
        let edited: Message;

        if (this.isMessage) {
            edited = await this.message.edit(res);
        }
        else {
            // Having a replied interaction here means the reply must be ephemeral
            this.assertReplied();
            edited = await this.interaction.editReply(res) as Message;
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
    
    // Direct message, ephemeral reply for interaction
    public async sendDirect(res: SendResponse): Promise<CommandSource> {
        if (typeof res !== 'string') {
            res.ephemeral = true;
        }
        return this.isMessage
            ? new CommandSource(await (this.native as Message).author.send(res))
            : await this.respondInteraction(res);
    }
}