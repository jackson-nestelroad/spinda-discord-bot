import { Message } from 'discord.js';
import { DiscordBot } from '../../../bot';
import { DiscordUtil } from '../../../util/discord';
import { EmbedTemplates } from '../../../util/embed';
import { EvalUtil } from '../../../util/eval';
import { Command, CommandCategory, CommandPermission, CommandParameters } from '../base';

type MessageListener = (msg: Message) => Promise<any>;

export class MessageListenerCommand extends Command {
    public name = 'message-listener';
    public args = '(add|remove) (code|id)';
    public description = 'Adds or removes a new message listener to the bot.';
    public category = CommandCategory.Secret;
    public permission = CommandPermission.Owner;

    private readonly listeners: Array<MessageListener> = [];

    private commands: Dictionary<(params: CommandParameters) => Promise<void>> = {
        add: this.addListener.bind(this),
        remove: this.removeListener.bind(this),
    };

    private runNestedCommand(params: CommandParameters) {
        const command = params.args[0];
        if (!command || !this.commands[command]) {
            throw new Error(`Invalid command: \`${command}\``);
        }

        params.content = params.content.substr(command.length).trimLeft();
        params.args.shift();
        this.commands[command](params);
    }

    private async addListener({ bot, msg, content }: CommandParameters) {
        const code = DiscordUtil.getCodeBlockOrLine(content) ?? content;

        const id = this.listeners.length;
        const listener = async (newMsg: Message) => {
            try {
                await EvalUtil.runCode(code, {
                    bot,
                    msg: newMsg,
                    spawner: msg,
                    setTimeout,
                });
            } catch (error) {
                try {
                    this.removeListenerFromBot(bot, id);
                    await bot.sendError(msg, error);
                } catch (error) {
                    await bot.sendError(msg, error);
                }
            }
        };

        this.listeners.push(listener);
        bot.client.on('message', listener);

        const embed = bot.createEmbed(EmbedTemplates.Success);
        embed.setDescription(`Message listener attached, id = \`${id}\`.`);
        await msg.channel.send(embed);
    }

    private async removeListener({ bot, msg, content }: CommandParameters) {
        const id = parseInt(content);

        if (isNaN(id) || id < 0 || id >= this.listeners.length) {
            throw new Error('Invalid id');
        }

        this.removeListenerFromBot(bot, id);

        const embed = bot.createEmbed(EmbedTemplates.Success);
        embed.setDescription(`Message listener removed.`);
        await msg.channel.send(embed);
    }

    private async removeListenerFromBot(bot: DiscordBot, id: number) {
        bot.client.removeListener('message', this.listeners[id]);
        this.listeners.splice(id, 1);
    }

    public async run(params: CommandParameters) {
        return this.runNestedCommand(params);
    }
}