import {
    ArgumentsConfig,
    ArgumentType,
    CommandParameters,
    ComplexCommand,
    StandardCooldowns,
} from 'panda-discord';

import { CommandCategory, CommandPermission, SpindaDiscordBot } from '../../../../bot';

interface WikipediaArgs {
    query: string;
}

export class WikipediaCommand extends ComplexCommand<SpindaDiscordBot, WikipediaArgs> {
    public name = 'wikipedia';
    public description = 'Searches Wikipedia for a page matching the given query.';
    public category = CommandCategory.External;
    public permission = CommandPermission.Everyone;
    public cooldown = StandardCooldowns.Medium;

    public args: ArgumentsConfig<WikipediaArgs> = {
        query: {
            description: 'Search query.',
            type: ArgumentType.RestOfContent,
            required: true,
        },
    };

    public async run({ bot, src }: CommandParameters<SpindaDiscordBot>, args: WikipediaArgs) {
        await bot.mediaWikiService.searchSite(src, 'https://wikipedia.org/w', args.query);
    }
}
