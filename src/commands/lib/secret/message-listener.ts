import { Message } from 'discord.js';
import {
    ArgumentsConfig,
    ArgumentType,
    CommandParameters,
    ComplexCommand,
    DiscordUtil,
    EmbedTemplates,
    EvalUtil,
    NestedCommand,
} from 'panda-discord';

import { CommandCategory, CommandPermission, SpindaDiscordBot } from '../../../bot';

type MessageListener = (msg: Message) => Promise<any>;

class SharedMessageListeners {
    public nextId: number = 0;
    public readonly listeners: Map<number, MessageListener> = new Map();

    public async removeListenerFromBot(bot: SpindaDiscordBot, id: number) {
        bot.client.removeListener('message', this.listeners.get(id));
        this.listeners.delete(id);
    }
}

interface AddMessageListenerArgs {
    code: string;
}

class AddMessageListenerSubCommand extends ComplexCommand<
    SpindaDiscordBot,
    AddMessageListenerArgs,
    SharedMessageListeners
> {
    public name = 'add';
    public description = 'Adds a new message listener to the bot.';
    public category = CommandCategory.Inherit;
    public permission = CommandPermission.Owner;

    public args: ArgumentsConfig<AddMessageListenerArgs> = {
        code: {
            description: 'JavaScript code to execute for each message.',
            type: ArgumentType.RestOfContent,
            required: true,
        },
    };

    public async run({ bot, src }: CommandParameters<SpindaDiscordBot>, args: AddMessageListenerArgs) {
        const match = DiscordUtil.getCodeBlockOrLine(args.code);
        const code = match.match ? match.result.content : args.code;

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

class RemoveMessageListenerSubCommand extends ComplexCommand<
    SpindaDiscordBot,
    RemoveMessageListenerArgs,
    SharedMessageListeners
> {
    public name = 'remove';
    public description = 'Removes one of the message listeners added to the bot.';
    public category = CommandCategory.Inherit;
    public permission = CommandPermission.Administrator;

    public args: ArgumentsConfig<RemoveMessageListenerArgs> = {
        id: {
            description: 'Integer ID of the message listener to remove, as given when added.',
            type: ArgumentType.Integer,
            required: true,
        },
    };

    public async run({ bot, src }: CommandParameters<SpindaDiscordBot>, args: RemoveMessageListenerArgs) {
        if (!this.shared.listeners.has(args.id)) {
            throw new Error(`Invalid ID.`);
        }

        this.shared.removeListenerFromBot(bot, args.id);

        const embed = bot.createEmbed(EmbedTemplates.Success);
        embed.setDescription(`Message listener removed.`);
        await src.send({ embeds: [embed] });
    }
}

export class MessageListenerCommand extends NestedCommand<SpindaDiscordBot, SharedMessageListeners> {
    public name = 'message-listener';
    public description = 'Adds or removes a new message listener to the bot.';
    public category = CommandCategory.Secret;
    public permission = CommandPermission.Owner;

    public initializeShared() {
        return new SharedMessageListeners();
    }

    public subcommands = [AddMessageListenerSubCommand, RemoveMessageListenerSubCommand];
}
