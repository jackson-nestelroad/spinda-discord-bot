import { Message } from 'discord.js';
import { DiscordBot } from '../../../bot';
import { DiscordUtil } from '../../../util/discord';
import { EmbedTemplates } from '../../../util/embed';
import { EvalUtil } from '../../../util/eval';
import { ArgumentsConfig, ArgumentType, CommandCategory, CommandParameters, CommandPermission, ComplexCommand, NestedCommand } from '../base';

type MessageListener = (msg: Message) => Promise<any>;

class SharedMessageListeners {
    public nextId: number = 0;
    public readonly listeners: Map<number, MessageListener> = new Map();

    public async removeListenerFromBot(bot: DiscordBot, id: number) {
        bot.client.removeListener('message', this.listeners.get(id));
        this.listeners.delete(id);
    }
}

interface AddMessageListenerArgs {
    code: string;
}

class AddMessageListenerSubCommand extends ComplexCommand<AddMessageListenerArgs, SharedMessageListeners> {
    public name = 'add';
    public description = 'Adds a new message listener to the bot.';
    public category = CommandCategory.Secret;
    public permission = CommandPermission.Owner;

    public args: ArgumentsConfig<AddMessageListenerArgs> = {
        code: {
            description: 'JavaScript code to execute for each message.',
            type: ArgumentType.RestOfContent,
            required: true,
        },
    };

    public async run({ bot, src }: CommandParameters, args: AddMessageListenerArgs) {
        const code = DiscordUtil.getCodeBlockOrLine(args.code) ?? args.code;

        const id = this.shared.nextId++;
        const listener = async (newMsg: Message) => {
            if (newMsg.author.bot) {
                return;
            }

            try {
                await EvalUtil.runCode(code, {
                    bot,
                    msg: newMsg,
                    spawner: src,
                    setTimeout,
                });
            } catch (error) {
                try {
                    this.shared.removeListenerFromBot(bot, id);
                    await bot.sendError(src, error);
                } catch (error) {
                    await bot.sendError(src, error);
                }
            }
        };

        this.shared.listeners.set(id, listener);
        bot.client.on('message', listener);

        const embed = bot.createEmbed(EmbedTemplates.Success);
        embed.setDescription(`Message listener attached, id = \`${id}\`.`);
        await src.send({ embeds: [embed] });
    }
}

interface RemoveMessageListenerArgs {
    id: number;
}

class RemoveMessageListenerSubCommand extends ComplexCommand<RemoveMessageListenerArgs, SharedMessageListeners> {
    public name = 'remove';
    public description = 'Removes one of the message listeners added to the bot.';
    public category = CommandCategory.Secret;
    public permission = CommandPermission.Administrator;

    public args: ArgumentsConfig<RemoveMessageListenerArgs> = {
        id: {
            description: 'Integer ID of the message listener to remove, as given when added.',
            type: ArgumentType.Integer,
            required: true,
        },
    };

    public async run({ bot, src }: CommandParameters, args: RemoveMessageListenerArgs) {
        if (!this.shared.listeners.has(args.id)) {
            throw new Error(`Invalid ID.`);
        }

        this.shared.removeListenerFromBot(bot, args.id);

        const embed = bot.createEmbed(EmbedTemplates.Success);
        embed.setDescription(`Message listener removed.`);
        await src.send({ embeds: [embed] });
    }
}

export class MessageListenerCommand extends NestedCommand<SharedMessageListeners> {
    public name = 'message-listener';
    public description = 'Adds or removes a new message listener to the bot.';
    public category = CommandCategory.Secret;
    public permission = CommandPermission.Owner;

    public initializeShared() {
        return new SharedMessageListeners();
    }

    public subCommandConfig = [
        AddMessageListenerSubCommand,
        RemoveMessageListenerSubCommand,
    ];
}