import { CommandParameters, SimpleCommand } from 'panda-discord';

import { CommandCategory, CommandPermission, SpindaDiscordBot } from '../../../bot';

export class RefreshCommand extends SimpleCommand<SpindaDiscordBot> {
    public name = 'refresh';
    public description = 'Refreshes the bot commands and data service, clearing out all cached data.';
    public category = CommandCategory.Secret;
    public permission = CommandPermission.Owner;

    public async run({ bot, src }: CommandParameters<SpindaDiscordBot>) {
        bot.refreshCommands();
        bot.dataService.clearCache();
        bot.customCommandService.clearCooldowns();
        await src.reply('Refresh successful.');
    }
}
