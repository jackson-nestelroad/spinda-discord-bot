import { ChannelType, GuildTextBasedChannel } from 'discord.js';
import moment, { Duration } from 'moment';
import {
    ArgumentType,
    ArgumentsConfig,
    CommandParameters,
    ComplexCommand,
    NestedCommand,
    SimpleCommand,
    SplitArgumentArray,
    StandardCooldowns,
} from 'panda-discord';

import { CommandCategory, CommandPermission, SpindaDiscordBot } from '../../../bot';

interface PollCreateArgs {
    question: string;
    duration?: Duration;
    channel?: GuildTextBasedChannel;
    options: SplitArgumentArray;
}

class PollCreateCommand extends ComplexCommand<SpindaDiscordBot, PollCreateArgs> {
    public name = 'create';
    public description = 'Creates a poll.';
    public moreDescription = [
        'Separate options using quotations. For example, `"Bulbasaur" "Charmander" "Squirtle"`.',
        'When using the chat command, wrap question in quotations as well.',
        'You can specify button style and emoji using brackets. For example, `"{style success} {emoji \u{1F343}} Bulbasaur"`. Available styles are `primary`, `secondary`, `success`, and `danger`.',
        '**Note:** polls do not currently persist past bot refresh or restart. End time is the latest end time, and polls will end early if the bot restarts.',
    ];
    public category = CommandCategory.Inherit;
    public permission = CommandPermission.Inherit;
    public examples = [
        'duration:1 week question:Should we continue to disallow spoilers? options:"Yes" "No" "I don\'t care!"',
        'duration:6 hours question:What is the best starter? options:"{style success} {emoji \u{1F343}} Bulbasaur" "{style danger} {emoji \u{1F525}} Charmander" "{style primary} {emoji \u{1F30A}} Squirtle"',
    ];

    public args: ArgumentsConfig<PollCreateArgs> = {
        question: {
            description: 'Question to ask.',
            type: ArgumentType.String,
            required: true,
        },
        options: {
            description: 'Poll options. Surround each option in quotations. Example: "Yes" "No"',
            type: ArgumentType.SplitArguments,
            required: true,
        },
        duration: {
            description: 'Poll duration. Number followed by unit, such as "1 week" or "3 hours". Default is "1 hour".',
            type: ArgumentType.String,
            required: false,
            named: true,
            default: '1 hour',
            transformers: {
                any: (value, result) => {
                    result.value = moment.duration(...value.trim().split(' '));
                    if (!result.value.isValid()) {
                        result.error = 'Invalid duration.';
                    }
                },
            },
        },
        channel: {
            description: 'Channel to host poll in. Default is current channel.',
            type: ArgumentType.Channel,
            required: false,
            named: true,
            channelTypes: [ChannelType.GuildText],
            transformers: {
                any: (value, result) => {
                    if (!value.isTextBased() || value.isDMBased()) {
                        result.error = 'Invalid channel.';
                    } else {
                        result.value = value;
                    }
                },
            },
        },
    };

    public async run({ bot, src }: CommandParameters<SpindaDiscordBot>, args: PollCreateArgs) {
        const channel = args.channel ?? src.channel;
        await bot.pollsService.createPoll({
            user: src.author,
            guild: src.guild,
            channelId: channel.id,
            startedAt: new Date(),
            duration: args.duration,
            question: args.question,
            options: [...args.options.args.map(arg => arg.content)],
        });
        await src.reply({
            content: `Created poll in ${channel}. Use \`/poll end\` to end it manually.`,
            ephemeral: true,
        });
    }
}

class PollEndCommand extends SimpleCommand<SpindaDiscordBot> {
    public name = 'end';
    public description = 'Ends your current poll.';
    public category = CommandCategory.Inherit;
    public permission = CommandPermission.Inherit;

    public async run({ bot, src }: CommandParameters<SpindaDiscordBot>) {
        await bot.pollsService.endPoll(src.author.id);
        await src.reply({ content: 'Poll ended.', ephemeral: true });
    }
}

export class PollCommand extends NestedCommand<SpindaDiscordBot> {
    public name = 'poll';
    public description = 'Creates or manages a poll.';
    public category = CommandCategory.Fun;
    public permission = CommandPermission.Everyone;
    public cooldown = StandardCooldowns.Minute;

    public subcommands = [PollCreateCommand, PollEndCommand];
}
