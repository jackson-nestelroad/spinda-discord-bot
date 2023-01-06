import { GuildMember, Message, TextBasedChannel } from 'discord.js';
import {
    ArgumentType,
    ArgumentsConfig,
    CommandParameters,
    ComplexCommand,
    EmbedTemplates,
    InteractionCommandParameters,
    MessageContextMenuCommand,
    StandardCooldowns,
} from 'panda-discord';

import { CommandCategory, CommandPermission, SpindaDiscordBot } from '../../../bot';

interface PruneArgs {
    user: GuildMember;
    count: number;
    channel?: TextBasedChannel;
}

class PruneContextMenuCommand extends MessageContextMenuCommand<SpindaDiscordBot, PruneArgs> {
    public name = 'Prune Messages';

    public async run(params: InteractionCommandParameters<SpindaDiscordBot>, message: Message) {
        const args = await this.command.parseArguments(params, {}, { user: message.member, channel: message.channel });
        await this.command.run(params, args);
    }
}

export class PruneCommand extends ComplexCommand<SpindaDiscordBot, PruneArgs> {
    public name = 'prune';
    public description = 'Prunes the most recent chunk of messages, over the last two weeks, from a given user.';
    public category = CommandCategory.Moderation;
    public permission = CommandPermission.Moderator;
    public cooldown = StandardCooldowns.Medium;

    public contextMenu = [PruneContextMenuCommand];

    public readonly defaultNumberToDelete = 100;

    public args: ArgumentsConfig<PruneArgs> = {
        user: {
            description: 'Author of messages to delete.',
            type: ArgumentType.User,
            required: true,
        },
        count: {
            description: `Number of messages. Default is ${this.defaultNumberToDelete}.`,
            type: ArgumentType.Integer,
            required: false,
            default: this.defaultNumberToDelete,
            transformers: {
                any: (number, result) => {
                    if (number <= 0) {
                        result.error = 'Number of messages to delete must be a positive integer.';
                    } else {
                        result.value = number;
                    }
                },
            },
        },
        channel: {
            description: 'Text channel to delete messages from. Default is current channel.',
            type: ArgumentType.Channel,
            required: false,
            named: true,
            transformers: {
                any: (channel, result) => {
                    if (!channel.isTextBased()) {
                        result.error = 'Channel must be a text channel.';
                    } else {
                        result.value = channel;
                    }
                },
            },
        },
    };

    public async run({ bot, src }: CommandParameters<SpindaDiscordBot>, args: PruneArgs) {
        if (!args.channel) {
            args.channel = src.channel;
        }

        if (args.channel.isDMBased()) {
            throw new Error('Cannot prune from DMs.');
        }

        const channelHistory = await args.channel.messages.fetch();
        const toDelete = channelHistory.filter(msg => msg.author.id === args.user.id).first(args.count);
        const deleted = await args.channel.bulkDelete(toDelete, true);
        const embed = bot.createEmbed(EmbedTemplates.Success);
        embed.setDescription(`Pruned ${deleted.size} messages from ${args.user.user.username} in ${args.channel}.`);
        await src.reply({ embeds: [embed], ephemeral: true });
    }
}
