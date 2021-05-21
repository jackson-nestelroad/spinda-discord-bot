import { CommandCategory, CommandPermission, CommandParameters, StandardCooldowns, ComplexCommand, ArgumentsConfig, ArgumentType } from '../../base';

interface MediaWikiArgs {
    url: string;
    query: string;
}

export class MediaWikiCommand extends ComplexCommand<MediaWikiArgs> {
    public name = 'media-wiki';
    public description = 'Searches a MediaWiki website for a page matching the given query.'
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
            description: 'Search query',
            type: ArgumentType.RestOfContent,
            required: true,
        },
    };

    public async run({ bot, src }: CommandParameters, args: MediaWikiArgs) {
        await bot.mediaWikiService.searchSite(src, args.url, args.query);
    }
}