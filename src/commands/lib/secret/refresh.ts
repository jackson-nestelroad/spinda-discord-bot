import { CommandCategory, CommandPermission, SpindaDiscordBot } from '../../../bot';
import { CommandParameters, SimpleCommand } from 'panda-discord';

export class RefreshCommand extends SimpleCommand<SpindaDiscordBot> {
    public name = 'refresh';
    public description = 'Refreshes the bot commands and data service, clearing out all cached data.';
    public category = CommandCategory.Secret;
    public permission = CommandPermission.Owner;

    public async run({ bot, src }: CommandParameters<SpindaDiscordBot>) {
        bot.refreshCommands();
        bot.dataService.clearCache();
        bot.customCommandService.clearCooldowns();
        bot.spindaGeneratorService.restart();
        await src.reply('Refresh successful.');
    }
}
