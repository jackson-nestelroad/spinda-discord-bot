import { CommandCategory, CommandPermission, CommandParameters, SimpleCommand } from '../base';

export class RefreshCommand extends SimpleCommand {
    public name = 'refresh';
    public description = 'Refreshes the bot commands and data service, clearing out all cached data.';
    public category = CommandCategory.Secret;
    public permission = CommandPermission.Owner;

    public async run({ bot, src }: CommandParameters) {
        bot.refreshCommands();
        bot.dataService.clearCache();
        await src.reply('Refresh successful.');
    }
}