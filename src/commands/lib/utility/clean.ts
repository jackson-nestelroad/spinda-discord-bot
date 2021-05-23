import { CommandCategory, CommandPermission, CommandParameters, StandardCooldowns, ComplexCommand, ArgumentsConfig, ArgumentType } from '../base';
import { DiscordUtil } from '../../../util/discord';

interface CleanArgs {
    count?: number;
}

export class CleanCommand extends ComplexCommand<CleanArgs> {
    public name = 'clean';
    public description = 'Cleans up the bot responses for the current channel.';
    public category = CommandCategory.Utility;
    public permission = CommandPermission.Administrator;
    public cooldown = StandardCooldowns.Low;

    public readonly defaultNumberToDelete: number = 100;
    public readonly ageLimit: number = 14 * 24 * 60 * 60 * 1000;

    public args: ArgumentsConfig<CleanArgs> = {
        count: {
            description: `Number of messages to delete. Default is ${this.defaultNumberToDelete}`,
            type: ArgumentType.Integer,
            required: false,
        },
    };

    public async run({ bot, src }: CommandParameters, args: CleanArgs) {
        const numberToDelete = args.count ?? this.defaultNumberToDelete;

        if (numberToDelete <= 0) {
            throw new Error('Number of messages to delete must be a positive integer.');
        }

        const channelHistory = await src.channel.messages.fetch({ limit: 100 });
        const now = new Date();
        const toDelete = channelHistory
            .filter(msg => msg.author.id === bot.client.user.id && now.valueOf() - msg.createdAt.valueOf() < this.ageLimit)
            .array().slice(0, numberToDelete);
        

        try {
            await src.channel.bulkDelete(toDelete);
        } catch (error) {
            if (error.message === DiscordUtil.APIErrorMessages.Permissions) {
                error.message = 'Missing "Manage Messages" Permission';
            }
            throw error;
        }
    }
}