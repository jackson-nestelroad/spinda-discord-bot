import {
    ArgumentsConfig,
    ArgumentType,
    CommandParameters,
    ComplexCommand,
    EmbedTemplates,
    StandardCooldowns,
} from 'panda-discord';

import { CommandCategory, CommandPermission, SpindaDiscordBot } from '../../../bot';
import { SpindaCommandNames } from './command-names';
import { SpindaGeneratorService } from './generator';

export class GotAwayError extends Error {}

interface CatchArgs {
    position?: number;
}

export class CatchCommand extends ComplexCommand<SpindaDiscordBot, CatchArgs> {
    public name = SpindaCommandNames.Catch;
    public description = `Catches one of the last ${SpindaGeneratorService.historySize} Spinda generated in the channel.`;
    public moreDescription = [
        `Once one Spinda is caught, the others run away.`,
        `Caught Spinda can be regenerated at any time using the \`${SpindaCommandNames.View}\` command. You may have up to ${SpindaGeneratorService.partySize} Spinda in your party at given time.`,
    ];
    public category = CommandCategory.Spinda;
    public permission = CommandPermission.Everyone;
    public cooldown = StandardCooldowns.High;

    public args: ArgumentsConfig<CatchArgs> = {
        position: {
            description: `The Spinda to catch. Ranges top-to-bottom, left-to-right from 1 to ${SpindaGeneratorService.partySize}, or none for the most recent.`,
            type: ArgumentType.Integer,
            required: false,
        },
    };

    public async run({ bot, src, guildId }: CommandParameters<SpindaDiscordBot>, args: CatchArgs) {
        const wantedPosition = args.position ?? 0;
        if (wantedPosition < 0) {
            throw new Error('Position must be a positive integer.');
        }
        if (wantedPosition > SpindaGeneratorService.historySize) {
            throw new Error('Position is out of range.');
        }

        let wantedSpinda = bot.spindaGeneratorService.getFromChannelHistory(src.channel.id, wantedPosition);

        if (!wantedSpinda) {
            const prefix = bot.dataService.getCachedGuild(guildId);
            const generateMessage = `Use \`${prefix}${SpindaCommandNames.Generate}\` to generate a Spinda to catch.`;
            if (wantedPosition === 0) {
                throw new Error('No new Spinda found in this channel. ' + generateMessage);
            } else {
                throw new Error(`Spinda at position ${wantedPosition} could not be found. ` + generateMessage);
            }
        }

        const caughtSpinda = await bot.dataService.getCaughtSpinda(src.author.id);

        let pos: number = caughtSpinda.length;

        // User must replace an existing Spinda
        if (caughtSpinda.length >= SpindaGeneratorService.partySize) {
            // Save the numeric timestamp of the targeted Spinda
            // Checked after the replacement segment to make sure a newer Spinda has not taken this spot
            const generatedAt = wantedSpinda.generatedAt.valueOf();

            const embed = bot.createEmbed(EmbedTemplates.Error);
            embed.setDescription(
                `You have too many Spinda in your party. Respond with a number 1 through ${SpindaGeneratorService.partySize} to replace one of your party slots with this new Spinda. Send anything else to cancel.`,
            );
            await src.reply({ embeds: [embed] });

            try {
                const messages = await src.channel.awaitMessages({
                    filter: newMsg => newMsg.author.id === src.author.id,
                    max: 1,
                    time: 10000,
                    errors: ['time'],
                });
                const response = messages.first();
                const num = parseInt(response.content);
                if (isNaN(num) || num < 1 || num > SpindaGeneratorService.partySize) {
                    return;
                }

                pos = num - 1;

                // Fetch Spinda again, to make sure it wasn't caught before responding
                wantedSpinda = bot.spindaGeneratorService.getFromChannelHistory(src.channel.id, wantedPosition);

                if (!wantedSpinda || wantedSpinda.generatedAt.valueOf() !== generatedAt) {
                    throw new GotAwayError(`It got away...`);
                }
            } catch (error) {
                if (error instanceof GotAwayError) {
                    throw error;
                }
                const embed = bot.createEmbed(EmbedTemplates.Error);
                embed.setDescription('You did not respond in time.');
                const reply = await src.reply({ embeds: [embed] });
                await bot.wait(10000);
                await reply.delete();
                return;
            }
        }

        await bot.dataService.catchSpinda(src.author.id, wantedSpinda, pos);
        bot.spindaGeneratorService.clearChannelHistory(src.channel.id);

        const remaining = SpindaGeneratorService.partySize - caughtSpinda.length;

        const prefix = bot.dataService.getCachedGuild(guildId).prefix;
        const embed = bot.createEmbed(EmbedTemplates.Success);
        embed.setDescription(
            `Successfully caught! The other Spinda ran away. You can regenerate your Spinda at any time using \`${prefix}${
                SpindaCommandNames.View
            } ${pos + 1}\`. You have ${remaining} party slot${remaining === 1 ? '' : 's'} remaining.`,
        );
        await src.send({ embeds: [embed] });
    }
}
