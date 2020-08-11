import { Command, CommandCategory, CommandPermission } from '../base';
import { DiscordBot } from '../../../bot';
import { Message } from 'discord.js';

export class BotsnackCommand implements Command {
    public name = 'botsnack';
    public args = '';
    public description = 'Rewards the bot for good behavior.'
    public category = CommandCategory.Fun;
    public permission = CommandPermission.Everyone;

    public async run(bot: DiscordBot, msg: Message) {
        msg.channel.send('botsnack, mmmmmm...')
    }
}