import { ArgumentType, ArgumentsConfig, CommandParameters, ComplexCommand, StandardCooldowns } from 'panda-discord';
import { CommandCategory, CommandPermission, SpindaDiscordBot } from '../../../bot';
import { SpindaColorChange, SpindaGeneration } from './util/spinda';

import { MessageAttachment } from 'discord.js';
import { SpindaCommandNames } from './command-names';
import { SpindaGeneratorService } from './generator';

interface MySpindaArgs {
    position?: number;
    generation?: SpindaGeneration;
}

export class MySpindaCommand extends ComplexCommand<SpindaDiscordBot, MySpindaArgs> {
    public name = SpindaCommandNames.View;
    public description = `Regenerates one, or all, of the Spinda you have previously caught.`;
    public category = CommandCategory.Spinda;
    public permission = CommandPermission.Everyone;
    public cooldown = StandardCooldowns.High;

    public args: ArgumentsConfig<MySpindaArgs> = {
        position: {
            description: 'Position to regenerate. If none is given, your entire party will be generated.',
            type: ArgumentType.Integer,
            required: false,
        },
        generation: {
            description: 'Generation style. Displays your Spinda in a different style than what it was caught in.',
            type: ArgumentType.Integer,
            required: false,
            hidden: true,
            choices: [
                { name: 'Modern', value: SpindaGeneration.Normal },
                { name: 'Hoenn', value: SpindaGeneration.Gen3 },
                { name: 'Sinnoh', value: SpindaGeneration.Gen4 },
                { name: 'Unova', value: SpindaGeneration.Gen5 },
                { name: 'Retro', value: SpindaGeneration.Retro },
            ],
        },
    };

    private readonly classifications: Partial<Record<SpindaColorChange, string>> = {
        [SpindaColorChange.Shiny]: 'Shiny \u{2728}',
        [SpindaColorChange.Retro]: 'Retro \u{1F579}',
        [SpindaColorChange.Gold]: 'Gold \u{1F947}',
        [SpindaColorChange.Green]: 'Forest \u{1F332}',
        [SpindaColorChange.Blue]: 'Ocean \u{1F30A}',
        [SpindaColorChange.Purple]: 'Ghost \u{1F47B}',
        [SpindaColorChange.Pink]: 'Valentine \u{1F495}',
        [SpindaColorChange.Gray]: 'Panda \u{1F43C}',
        [SpindaColorChange.Custom]: 'Random \u{1F3B2}',
        [SpindaColorChange.Rainbow]: 'Rainbow \u{1F308}',
    };

    public async run({ bot, src, guildId }: CommandParameters<SpindaDiscordBot>, args: MySpindaArgs) {
        await src.deferReply();

        const caughtSpinda = await bot.dataService.getCaughtSpinda(src.author.id);
        if (caughtSpinda.length === 0) {
            const prefix = bot.dataService.getCachedGuild(guildId).prefix;
            throw new Error(
                `You have not yet caught a Spinda! Use \`${prefix}${SpindaCommandNames.Catch}\` to catch one of the last generated Spinda in the channel.`,
            );
        }

        if (args.position === undefined) {
            const result = await bot.spindaGeneratorService.horde(caughtSpinda, { genOverride: args.generation });
            await src.send({ files: [new MessageAttachment(result.buffer)] });
        } else {
            if (args.position <= 0) {
                throw new Error(`Position must be a positive integer.`);
            } else if (args.position > SpindaGeneratorService.partySize) {
                throw new Error(`Position too large.`);
            } else if (args.position > caughtSpinda.length) {
                throw new Error(`Invalid position. You only have ${caughtSpinda.length} Spinda caught.`);
            }

            const result = await bot.spindaGeneratorService.generate(caughtSpinda[args.position - 1], {
                genOverride: args.generation,
            });

            const embed = bot.createEmbed();
            const attachment = new MessageAttachment(result.buffer, 'thumbnail.png');
            embed.setThumbnail('attachment://thumbnail.png');

            embed.setTitle(`${src.author.username}'s Spinda`);
            embed.addField('PID', result.spinda.pid.toString(), true);

            const color = result.spinda.getColor();
            if (color !== SpindaColorChange.None) {
                embed.addField('Classification', this.classifications[color], true);
            }

            embed.addField('Generated At', result.spinda.generatedAt.toLocaleString(), true);

            await src.send({ embeds: [embed], files: [attachment] });
        }
    }
}
