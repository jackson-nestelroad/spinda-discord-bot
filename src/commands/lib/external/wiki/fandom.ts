import { Command, CommandCategory, CommandPermission, CommandParameters, StandardCooldowns } from '../../base';

export class FandomCommand extends Command {
    public name = 'fandom';
    public args = 'wiki-subdomain query';
    public description = 'Searches a Fandom wiki (**wiki-subdomain**.fandom.com) for a page matching the given query.'
    public category = CommandCategory.External;
    public permission = CommandPermission.Everyone;
    public cooldown = StandardCooldowns.medium;

    public async run({ bot, msg, args }: CommandParameters) {
        if (args.length < 1) {
            throw new Error(`Fandom wiki subdomain is required.`);
        }

        const site = args.shift();
        const search = args.join(' ');
        const fandomURL = `https://${site}.fandom.com`;

        if (args.length === 0) {
            await msg.channel.send(fandomURL);
        }
        else {
            if (/^https?:\/\//.test(site)) {
                throw new Error(`Only the Fandom wiki's subdomain (**example**.fandom.com) is required.`)
            }
            
            await bot.mediaWikiService.searchSite(msg, fandomURL, search);
        }
    }
}