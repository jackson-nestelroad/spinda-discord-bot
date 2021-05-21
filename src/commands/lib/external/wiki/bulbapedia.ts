import { CommandCategory, CommandPermission, CommandParameters, StandardCooldowns, ComplexCommand, ArgumentsConfig, ArgumentType } from '../../base';

interface BulbapediaArgs {
    query: string;
}

export class BulbapediaCommand extends ComplexCommand<BulbapediaArgs> {
    public name = 'bulba';
    public description = 'Searches Bulbapedia for a page matching the given query.'
    public category = CommandCategory.External;
    public permission = CommandPermission.Everyone;
    public cooldown = StandardCooldowns.Medium;

    public args: ArgumentsConfig<BulbapediaArgs> = {
        query: {
            description: 'Search query.',
            type: ArgumentType.RestOfContent,
            required: true,
        },
    };

    public async run({ bot, src }: CommandParameters, args: BulbapediaArgs) {
        await bot.mediaWikiService.searchSite(src, 'https://bulbapedia.bulbagarden.net/w', args.query);
    }
}