import { Command, CommandCategory, CommandPermission, CommandParameters, StandardCooldowns } from '../../base';

export class WikipediaCommand extends Command {
    public name = 'wikipedia';
    public args = 'query';
    public description = 'Searches Wikipedia for a page matching the given query.'
    public category = CommandCategory.External;
    public permission = CommandPermission.Everyone;
    public cooldown = StandardCooldowns.Medium;

    public async run({ bot, msg, content }: CommandParameters) {
        await bot.mediaWikiService.searchSite(msg, 'https://wikipedia.org/w', content);
    }
}