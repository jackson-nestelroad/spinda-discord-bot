import { Message } from 'discord.js';
import { DiscordBot } from '../../../bot';
import { DiscordUtil } from '../../../util/discord';
import { EmbedTemplates } from '../../../util/embed';
import { EvalUtil } from '../../../util/eval';
import { Command, CommandCategory, CommandPermission, CommandParameters } from '../base';
import { ParameterCommand } from '../parameter-base';

type MessageListener = (msg: Message) => Promise<any>;

export class MessageListenerCommand extends ParameterCommand {
    public name = 'message-listener';
    public args = '(add|remove) (code|id)';
    public description = 'Adds or removes a new message listener to the bot.';
    public category = CommandCategory.Secret;
    public permission = CommandPermission.Owner;

    private nextId: number = 0;
    private readonly listeners: Map<number, MessageListener> = new Map();

    protected commands: Dictionary<(params: CommandParameters) => Promise<void>> = {
        add: this.addListener.bind(this),
        remove: this.removeListener.bind(this),
    };

    private async addListener({ bot, msg, content }: CommandParameters) {
        const code = DiscordUtil.getCodeBlockOrLine(content) ?? content;

        const id = this.nextId++;
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

        this.listeners.set(id, listener);
        bot.client.on('message', listener);

        const embed = bot.createEmbed(EmbedTemplates.Success);
        embed.setDescription(`Message listener attached, id = \`${id}\`.`);
        await msg.channel.send(embed);
    }

    private async removeListener({ bot, msg, content }: CommandParameters) {
        const id = parseInt(content);

        if (isNaN(id) || id < 0 || !this.listeners.has(id)) {
            throw new Error('Invalid id');
        }

        this.removeListenerFromBot(bot, id);

        const embed = bot.createEmbed(EmbedTemplates.Success);
        embed.setDescription(`Message listener removed.`);
        await msg.channel.send(embed);
    }

    private async removeListenerFromBot(bot: DiscordBot, id: number) {
        bot.client.removeListener('message', this.listeners.get(id));
        this.listeners.delete(id);
    }
}