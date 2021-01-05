import { Command, CommandCategory, CommandPermission, CommandParameters } from '../../base';

export class FandomCommand implements Command {
    public name = 'fandom';
    public args = 'wiki-subdomain query';
    public description = 'Searches a Fandom wiki (**wiki-subdomain**.fandom.com) for a page matching the given query.'
    public category = CommandCategory.External;
    public permission = CommandPermission.Everyone;

    public async run({ bot, msg, args }: CommandParameters) {
        if (args.length < 2) {
            throw new Error(`Fandom wiki subdomain and search query is required.`);
        }
        const site = args.shift();
        const search = args.join(' ');

        if (/^https?:\/\//.test(site)) {
            throw new Error(`Only the Fandom wiki's subdomain (**example**.fandom.com) is required.`)
        }
        
        await bot.mediaWikiService.searchSite(msg, `https://${site}.fandom.com`, search);
    }
}