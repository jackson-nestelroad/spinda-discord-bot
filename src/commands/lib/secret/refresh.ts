import { Command, CommandCategory, CommandPermission } from '../base';
import { DiscordBot } from '../../../bot';
import { Message } from 'discord.js';

export class RefreshCommand implements Command {
    public names = ['refresh'];
    public args = '';
    public description = 'Refreshes the bot commands, clearing out all cached data.';
    public category = CommandCategory.Secret;
    public permission = CommandPermission.Owner;

    public async run(bot: DiscordBot, msg: Message) {
        bot.refreshCommands();
        msg.channel.send('Refresh successful.');
    }
}