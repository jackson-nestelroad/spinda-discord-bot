import { Command, CommandCategory, CommandPermission, CommandParameters, StandardCooldowns } from '../../base';

export class BulbapediaCommand extends Command {
    public name = 'bulba';
    public args = 'query';
    public description = 'Searches Bulbapedia for a page matching the given query.'
    public category = CommandCategory.External;
    public permission = CommandPermission.Everyone;
    public cooldown = StandardCooldowns.medium;

    public async run({ bot, msg, content }: CommandParameters) {
        await bot.mediaWikiService.searchSite(msg, 'https://bulbapedia.bulbagarden.net/w', content);
    }
}