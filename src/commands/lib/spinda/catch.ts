import { Message } from 'discord.js';
import { GeneratedSpinda } from '../../../data/model/caught-spinda';
import { EmbedTemplates } from '../../../util/embed';
import { Command, CommandCategory, CommandPermission, CommandParameters, StandardCooldowns } from '../base';
import { SpindaCommandNames } from './command-names';
import { SpindaGeneratorService } from './generator';

export class CatchCommand extends Command {
    public name = SpindaCommandNames.Catch;
    public args = '(position)';
    public description = [
        `Catches one of the last ${SpindaGeneratorService.historySize} Spinda generated in the channel. Once one Spinda is caught, the others run away.`,
        `Caught Spinda can be regenerated at any time using the \`${SpindaCommandNames.View}\` command. You may have up to ${SpindaGeneratorService.partySize} Spinda in your party at given time.`,
        `The position specifies the Spinda to catch, with 1 being the top-most (left-most in a horde) and ${SpindaGeneratorService.historySize} being the bottom-most (right-most in a horde). Give no index to catch the newest Spinda.`
    ];
    public category = CommandCategory.Spinda;
    public permission = CommandPermission.Everyone;
    public cooldown = StandardCooldowns.High;

    private async getSpinda({ bot, msg, guild }: CommandParameters, position: number): Promise<GeneratedSpinda> {
        const lastSpinda = bot.spindaGeneratorService.getFromChannelHistory(msg.channel.id, position);

        if (!lastSpinda) {
            const generateMessage = `Use \`${guild.prefix}${SpindaCommandNames.Generate}\` to generate a Spinda to catch.`;
            if (position === 0) {
                throw new Error('No new Spinda found in this channel. ' + generateMessage);
            }
            else {
                throw new Error(`Spinda at position ${position} could not be found. ` + generateMessage);
            }
        }

        return lastSpinda;
    }

    public async run(params: CommandParameters) {
        const { bot, msg, guild, content } = params;

        const wantedPosition = content ? parseInt(content) : 0;
        if (isNaN(wantedPosition) || wantedPosition < 0) {
            throw new Error('Position must be a positive integer.');
        }

        let wantedSpinda = await this.getSpinda(params, wantedPosition);

        const caughtSpinda = await bot.dataService.getCaughtSpinda(msg.author.id);

        let pos: number = caughtSpinda.length;

        // User must replace an existing Spinda
        if (caughtSpinda.length >= SpindaGeneratorService.partySize) {
            const embed = bot.createEmbed(EmbedTemplates.Error);
            embed.setDescription(`You have too many Spinda in your party. Respond with a number 1 through ${SpindaGeneratorService.partySize} to replace one of your party slots with this new Spinda. Send anything else to cancel.`);
            await msg.reply(embed);

            try {
                const messages = await msg.channel.awaitMessages((newMsg: Message) => newMsg.author.id === msg.author.id, {
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
                wantedSpinda = await this.getSpinda(params, wantedPosition)

            } catch (error) {
                const embed = bot.createEmbed(EmbedTemplates.Error);
                embed.setDescription('You did not respond in time.');
                const reply = await msg.reply(embed);
                await reply.delete({ timeout: 10000 });
                return;
            }
        }

        await bot.dataService.catchSpinda(msg.author.id, wantedSpinda, pos);
        bot.spindaGeneratorService.clearChannelHistory(msg.channel.id);
        
        const remaining = SpindaGeneratorService.partySize - caughtSpinda.length;

        const embed = bot.createEmbed(EmbedTemplates.Success);
        embed.setDescription(`Successfully caught! The other Spinda ran away. You can regenerate your Spinda at any time using \`${guild.prefix}${SpindaCommandNames.View} ${pos + 1}\`. You have ${remaining} party slot${remaining === 1 ? '' : 's'} remaining.`);
        await msg.channel.send(embed);
    }
}