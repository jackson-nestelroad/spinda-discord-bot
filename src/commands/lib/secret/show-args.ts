import {
    ArgumentType,
    ArgumentsConfig,
    CommandParameters,
    ComplexCommand,
    EmbedTemplates,
    SplitArgumentArray,
    StandardCooldowns,
} from 'panda-discord';

import { CommandCategory, CommandPermission, SpindaDiscordBot } from '../../../bot';

interface ShowArgsArgs {
    args: SplitArgumentArray;
}

export class ShowArgsCommand extends ComplexCommand<SpindaDiscordBot, ShowArgsArgs> {
    public name = 'show-args';
    public description = 'Shows the chat command arguments and how they were split by the bot.';
    public category = CommandCategory.Secret;
    public permission = CommandPermission.Everyone;
    public cooldown = StandardCooldowns.Low;

    public args: ArgumentsConfig<ShowArgsArgs> = {
        args: {
            type: ArgumentType.SplitArguments,
            description: 'Arguments to parse.',
            required: false,
        },
    };

    public async run({ bot, src, extraArgs }: CommandParameters, args: ShowArgsArgs) {
        const embed = bot.createEmbed(EmbedTemplates.Bare);
        embed.setTitle('Command Arguments');
        if (!args.args || args.args.length === 0) {
            embed.setDescription('None!');
        } else {
            for (let i = 0; i < args.args.length; ++i) {
                embed.addFields({ name: `Argument ${i}`, value: args.args.get(i), inline: true });
            }

            const extraArgsEntries = Object.entries(extraArgs);
            if (extraArgsEntries.length > 0) {
                embed.addFields({
                    name: 'Extra Arguments',
                    value: extraArgsEntries.map(([name, value]) => `\`${name}\`: ${value}`).join('\n'),
                });
            }
        }
        await src.send({ embeds: [embed] });
    }
}
