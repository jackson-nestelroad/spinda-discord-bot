import { Command, CommandCategory, CommandPermission, CommandParameters } from '../base';

export class RefreshCommand extends Command {
    public name = 'refresh';
    public args = '';
    public description = 'Refreshes the bot commands and data service, clearing out all cached data.';
    public category = CommandCategory.Secret;
    public permission = CommandPermission.Owner;

    public async run({ bot, msg }: CommandParameters) {
        bot.refreshCommands();
        bot.dataService.clearCache();
        await msg.channel.send('Refresh successful.');
    }
}