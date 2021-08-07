import { DiscordAPIError } from 'discord.js';
import {
    ArgumentsConfig,
    ArgumentType,
    CommandParameters,
    ComplexCommand,
    StandardCooldowns,
} from 'panda-discord';

import { CommandCategory, CommandPermission, SpindaDiscordBot } from '../../../bot';

interface CleanArgs {
    count?: number;
}

export class CleanCommand extends ComplexCommand<SpindaDiscordBot, CleanArgs> {
    public name = 'clean';
    public description = 'Cleans up the bot responses for the current channel.';
    public category = CommandCategory.Utility;
    public permission = CommandPermission.Administrator;
    public cooldown = StandardCooldowns.Low;

    public readonly defaultNumberToDelete: number = 100;

    public args: ArgumentsConfig<CleanArgs> = {
        count: {
            description: `Number of messages to delete. Default is ${this.defaultNumberToDelete}`,
            type: ArgumentType.Integer,
            required: false,
        },
    };

    public async run({ bot, src }: CommandParameters<SpindaDiscordBot>, args: CleanArgs) {
        const numberToDelete = args.count ?? this.defaultNumberToDelete;

        if (numberToDelete <= 0) {
            throw new Error('Number of messages to delete must be a positive integer.');
        }

        const channelHistory = await src.channel.messages.fetch({ limit: 100 });
        const toDelete = channelHistory.filter(msg => msg.author.id === bot.client.user.id).first(numberToDelete);

        try {
            await src.channel.bulkDelete(toDelete, true);
        } catch (error) {
            if (error.message === 'Missing Permissions') {
                error.message = 'Missing "Manage Messages" Permission';
            }
            throw error;
        }
    }
}
