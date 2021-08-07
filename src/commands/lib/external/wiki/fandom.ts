import {
    ArgumentsConfig,
    ArgumentType,
    CommandParameters,
    ComplexCommand,
    StandardCooldowns,
} from 'panda-discord';

import { CommandCategory, CommandPermission, SpindaDiscordBot } from '../../../../bot';

interface FandomArgs {
    subdomain: string;
    query?: string;
}

export class FandomCommand extends ComplexCommand<SpindaDiscordBot, FandomArgs> {
    public name = 'fandom';
    public description = 'Searches a Fandom wiki for a page matching the given query.';
    public category = CommandCategory.External;
    public permission = CommandPermission.Everyone;
    public cooldown = StandardCooldowns.Medium;

    public args: ArgumentsConfig<FandomArgs> = {
        subdomain: {
            description: 'Wiki subdomain, which precedes the Fandom link ([subdomain].fandom.com).',
            type: ArgumentType.String,
            required: true,
        },
        query: {
            description: 'Search query.',
            type: ArgumentType.RestOfContent,
            required: false,
        },
    };

    public async run({ bot, src }: CommandParameters<SpindaDiscordBot>, args: FandomArgs) {
        const fandomURL = `https://${args.subdomain}.fandom.com`;

        if (!args.query) {
            await src.send(fandomURL);
        } else {
            if (/^https?:\/\//.test(args.subdomain)) {
                throw new Error(`Only the Fandom wiki's subdomain (**example**.fandom.com) is required.`);
            }

            await bot.mediaWikiService.searchSite(src, fandomURL, args.query);
        }
    }
}
