import { MessageAttachment } from 'discord.js';
import {
    ArgumentsConfig,
    ArgumentType,
    CommandParameters,
    ComplexCommand,
    StandardCooldowns,
} from 'panda-discord';

import { CommandCategory, CommandPermission, SpindaDiscordBot } from '../../../bot';
import { SpindaColorChange } from '../../../data/model/caught-spinda';
import { SpindaCommandNames } from './command-names';
import { SpindaGeneratorService } from './generator';

interface MySpindaArgs {
    position?: number;
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
            const prefix = bot.dataService.getCachedGuild(guildId);
            throw new Error(
                `You have not yet caught a Spinda! Use \`${prefix}${SpindaCommandNames.Catch}\` to catch one of the last generated Spinda in the channel.`,
            );
        }

        if (args.position === undefined) {
            const result = await bot.spindaGeneratorService.horde(caughtSpinda);
            await src.send({ files: [new MessageAttachment(result.buffer)] });
        } else {
            if (args.position <= 0) {
                throw new Error(`Position must be a positive integer.`);
            } else if (args.position > SpindaGeneratorService.partySize) {
                throw new Error(`Position too large.`);
            } else if (args.position > caughtSpinda.length) {
                throw new Error(`Invalid position. You only have ${caughtSpinda.length} Spinda caught.`);
            }

            const result = await bot.spindaGeneratorService.generate(caughtSpinda[args.position - 1]);

            const embed = bot.createEmbed();
            const attachment = new MessageAttachment(result.buffer, 'thumbnail.png');
            embed.setThumbnail('attachment://thumbnail.png');

            embed.setTitle(`${src.author.username}'s Spinda`);
            embed.addField('PID', result.info.pid.toString(), true);

            if (result.info.colorChange !== SpindaColorChange.None) {
                embed.addField('Classification', this.classifications[result.info.colorChange], true);
            }

            embed.addField('Generated At', result.info.generatedAt.toLocaleString(), true);

            await src.send({ embeds: [embed], files: [attachment] });
        }
    }
}
