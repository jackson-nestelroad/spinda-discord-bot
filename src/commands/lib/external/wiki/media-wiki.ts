import { Command, CommandCategory, CommandPermission, CommandParameters, StandardCooldowns } from '../../base';

export class MediaWikiCommand extends Command {
    public name = 'media-wiki';
    public args = 'MediaWiki-URL query';
    public description = 'Searches a MediaWiki website for a page matching the given query.'
    public category = CommandCategory.Secret;
    public permission = CommandPermission.Owner;
    public cooldown = StandardCooldowns.Medium;

    public async run({ bot, msg, args }: CommandParameters) {
        if (args.length < 2) {
            throw new Error(`MediaWiki URL and search query is required.`);
        }
        const site = args.shift();
        const search = args.join(' ');
        await bot.mediaWikiService.searchSite(msg, site, search);
    }
}