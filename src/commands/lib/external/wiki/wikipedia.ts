import { CommandCategory, CommandPermission, CommandParameters, StandardCooldowns, ComplexCommand, ArgumentsConfig, ArgumentType } from '../../base';

interface WikipediaArgs {
    query: string;
}

export class WikipediaCommand extends ComplexCommand<WikipediaArgs> {
    public name = 'wikipedia';
    public description = 'Searches Wikipedia for a page matching the given query.'
    public category = CommandCategory.External;
    public permission = CommandPermission.Everyone;
    public cooldown = StandardCooldowns.Medium;

    public args: ArgumentsConfig<WikipediaArgs> = {
        query: {
            description: 'Search query.',
            type: ArgumentType.String,
            required: true,
        },
    };

    public async run({ bot, src }: CommandParameters, args: WikipediaArgs) {
        await bot.mediaWikiService.searchSite(src, 'https://wikipedia.org/w', args.query);
    }
}