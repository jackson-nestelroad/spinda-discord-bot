import { ArgumentType, ArgumentsConfig, CommandParameters, ComplexCommand, StandardCooldowns } from 'panda-discord';

import { CommandCategory, CommandPermission, SpindaDiscordBot } from '../../../../bot';

interface MediaWikiArgs {
    url: string;
    query: string;
}

export class MediaWikiCommand extends ComplexCommand<SpindaDiscordBot, MediaWikiArgs> {
    public name = 'media-wiki';
    public description = 'Searches a MediaWiki website for a page matching the given query.';
    public category = CommandCategory.Secret;
    public permission = CommandPermission.Owner;
    public cooldown = StandardCooldowns.Medium;

    public args: ArgumentsConfig<MediaWikiArgs> = {
        url: {
            description: 'MediaWiki URL.',
            type: ArgumentType.String,
            required: true,
        },
        query: {
            description: 'Search query.',
            type: ArgumentType.RestOfContent,
            required: true,
        },
    };

    public async run({ bot, src }: CommandParameters<SpindaDiscordBot>, args: MediaWikiArgs) {
        await bot.mediaWikiService.searchSite(src, args.url, args.query);
    }
}
