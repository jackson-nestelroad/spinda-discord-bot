import { CommandInteraction, Guild, GuildMember, Interaction, InteractionReplyOptions, Message, MessageEditOptions, MessageOptions, ReplyMessageOptions, TextChannel, User, WebhookEditMessageOptions } from 'discord.js';

export type Receivable = Message | CommandInteraction;

type DisableSplit = { split?: false };
type CommonReplyOptions = ReplyMessageOptions & InteractionReplyOptions & DisableSplit;
type CommonSendOptions = MessageOptions & InteractionReplyOptions & DisableSplit;
type CommonEditOptions = MessageEditOptions & WebhookEditMessageOptions;

export type ReplyResponse = string | CommonReplyOptions;
export type SendResponse = string | CommonSendOptions;
export type EditResponse = string | CommonEditOptions;

enum CommandSourceType {
    Message,
    Interaction,
    Unsupported,
};

interface CommandSourceTypeMetadata {
    type: { new(...args: any[]): any },
    field: string,
}

const CommandSourceTypeMap = {
    [CommandSourceType.Message]: {
        type: Message,
        field: 'message',
    },
    [CommandSourceType.Interaction]: {
        type: CommandInteraction,
        field: 'interaction',
    },
    [CommandSourceType.Unsupported]: {
        type: null,
        field: 'unsupported',
    },
} as const;

const StronglyTypedCommandSourceTypes: { [type in CommandSourceType]: CommandSourceTypeMetadata } = CommandSourceTypeMap;

type ExposePropertyOnClass<Class extends object, Prop extends string, Type extends object> = Class & { [field in Prop]: Type };
type KnownCommandSource<T extends CommandSourceType> = ExposePropertyOnClass<
    CommandSource,
    typeof CommandSourceTypeMap[T]['field'],
    InstanceType<typeof CommandSourceTypeMap[T]['type']>
>;
 
type MessageCommandSource = KnownCommandSource<CommandSourceType.Message>;
type InteractionCommandSource = KnownCommandSource<CommandSourceType.Interaction>;

// A wrapper around a message or an interaction, whichever receives the command
// This class provides a common interface for replying to a command
// All replies or messages sent through this interface produce another interface
// If an ephemeral reply is sent to an interaction, the same interaction is exposed
// In any other case, the sent message is exposed, which is easier to work with
export class CommandSource {
    private deferredEphemeral: boolean = false;
    // A single flag records if the internal instance is a message so it is only checked once
    private readonly type: CommandSourceType;
    protected native: Receivable;

    public constructor(received: Receivable) {
        this.native = received;
        for (const type in CommandSourceTypeMap) {
            const metadata = CommandSourceTypeMap[type] as CommandSourceTypeMetadata;
            if (metadata.type === null || received instanceof metadata.type) {
                this.type = parseInt(type);
                this[metadata.field] = this.native;
                break;
            }
        }
    }

    public isMessage(): this is MessageCommandSource {
        return this.type === CommandSourceType.Message;
    }

    public isInteraction(): this is InteractionCommandSource {
        return this.type === CommandSourceType.Interaction;
    }

    public isUnsupported(): boolean {
        return this.type === CommandSourceType.Unsupported;
    }

    private throwUnsupported(): never {
        throw new Error(`Unsupported command source: ${this.native.constructor.name}.`);
    }
    
    public get author(): User {
        if (this.isMessage()) {
            return this.message.author;
        }
        else if (this.isInteraction()) {
            return this.interaction.user;
        }
        this.throwUnsupported();
    }

    public async content(): Promise<string> {
        if (this.isMessage()) {
            return this.message.content;
        }
        else if (this.isInteraction()) {
            this.assertReplied();
            return (await this.interaction.fetchReply()).content;
        }
        this.throwUnsupported();
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
        return this.isMessage() && this.message.deletable;
    }
    
    public setReplied() {
        if (this.isInteraction()) {
            this.interaction.replied = true;
        }
    }

    // Only messages can be deleted
    public async delete(): Promise<void> {
        if (this.isMessage()) {
            await this.message.delete();
        }
        else if (this.isInteraction()) {
            await this.interaction.deleteReply();
        }
    }

    // Only interactions can be deferred
    public async defer(ephemeral: boolean = false): Promise<void> {
        if (this.isInteraction() && !this.interaction.deferred && !this.interaction.replied) {
            this.deferredEphemeral = ephemeral;
            this.interaction.defer({ ephemeral });
            this.interaction.deferred = true;
        }
    }

    private assertReplied(): void {
        if (this.isInteraction() && !this.interaction.replied) {
            throw new Error(`No reply content available for this interaction. Make sure to reply first.`);
        }
    }

    private async respondInteraction(res: SendResponse & ReplyResponse & EditResponse): Promise<CommandSource> {
        if (!this.isInteraction()) {
            throw new Error(`Attempted to respond to a ${CommandSourceType[this.type]} command as an Interaction.`);
        }

        const interaction = (this as InteractionCommandSource).interaction;
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
        if (this.isMessage()) {
            return new CommandSource(await this.message.reply(res));
        }
        else if (this.isInteraction()) {
            return await this.respondInteraction(res);
        }
        this.throwUnsupported();
    }

    // Send to channel for message, reply/follow up for interaction
    public async send(res: SendResponse): Promise<CommandSource> {
        if (this.isMessage()) {
            return new CommandSource(await this.message.channel.send(res));
        }
        else if (this.isInteraction()) {
            return await this.respondInteraction(res);
        }
        this.throwUnsupported();
    }

    // Edit message or interaction reply
    public async edit(res: EditResponse): Promise<CommandSource> {
        let edited: Message;

        if (this.isMessage()) {
            edited = await this.message.edit(res);
        }
        else if (this.isInteraction()) {
            // Having a replied interaction here means the reply must be ephemeral
            this.assertReplied();
            edited = await this.interaction.editReply(res) as Message;
        }
        else {
            this.throwUnsupported();
        }

        return new CommandSource(edited);
    }

    // Append to message content or interaction reply
    public async append(res: string): Promise<CommandSource> {
        if (this.isMessage()) {
            return new CommandSource(await this.message.edit(this.message.content + res));
        }
        else if (this.isInteraction()) {
            this.assertReplied();
            const content = (await this.interaction.fetchReply()).content;
            await this.interaction.editReply(content + res);
        }
        this.throwUnsupported();
    }
    
    // Direct message, ephemeral reply for interaction
    public async sendDirect(res: SendResponse): Promise<CommandSource> {
        if (typeof res !== 'string') {
            res.ephemeral = true;
        }
        if (this.isMessage()) {
            return new CommandSource(await this.message.author.send(res));
        }
        else if (this.isInteraction()) {
            return await this.respondInteraction(res);
        }
        this.throwUnsupported();
    }
}