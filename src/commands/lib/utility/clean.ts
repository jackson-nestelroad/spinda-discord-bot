import { Command, CommandCategory, CommandPermission } from '../base';
import { DiscordBot } from '../../../bot';
import { Message } from 'discord.js';

export class CleanCommand implements Command {
    public names = ['clean'];
    public args = '(number)';
    public description = 'Cleans up the bot responses for the current channel.';
    public category = CommandCategory.Utility;
    public permission = CommandPermission.Administrator;

    public readonly defaultNumberToDelete: number = 100;
    public readonly ageLimit: number = 14 * 24 * 60 * 60 * 1000;

    public async run(bot: DiscordBot, msg: Message, args: string[]) {
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
            await msg.channel.bulkDelete(toDelete);
        } catch (error) {
            if (error.message === 'Missing Permissions') {
                throw new Error('Missing "Manage Messages" permission for this operation.');
            }
            throw error;
        }
    }
}