import { Command, CommandCategory, CommandPermission, CommandParameters } from '../base';
import { DiscordUtil } from '../../../util/discord';
import { TextChannel } from 'discord.js';

export class CleanCommand implements Command {
    public name = 'clean';
    public args = '(number)';
    public description = 'Cleans up the bot responses for the current channel.';
    public category = CommandCategory.Utility;
    public permission = CommandPermission.Administrator;

    public readonly defaultNumberToDelete: number = 100;
    public readonly ageLimit: number = 14 * 24 * 60 * 60 * 1000;

    public async run({ bot, msg, args }: CommandParameters) {
        let numberToDelete = parseInt(args[0]);
        if (isNaN(numberToDelete)) {
            numberToDelete = this.defaultNumberToDelete;
        }

        const channelHistory = await msg.channel.messages.fetch({ limit: 100 });
        const now = new Date();
        const toDelete = channelHistory
            .filter(msg => msg.author.id === bot.client.user.id && (now as any) - (msg.createdAt as any) < this.ageLimit)
            .array().slice(0, numberToDelete);
        

        try {
            await (msg.channel as TextChannel).bulkDelete(toDelete);
        } catch (error) {
            if (error.message === DiscordUtil.APIErrorMessages.Permissions) {
                error.message = 'Missing "Manage Messages" Permission';
            }
            throw error;
        }
    }
}