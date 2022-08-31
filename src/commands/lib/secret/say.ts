import { GuildBasedChannel } from 'discord.js';
import {
    ArgumentType,
    ArgumentsConfig,
    ChatCommandParameters,
    CommandParameters,
    LegacyCommand,
    StandardCooldowns,
} from 'panda-discord';

import { CommandCategory, CommandPermission, SpindaDiscordBot } from '../../../bot';

interface SayArgs {
    channel: GuildBasedChannel;
    message: string;
}

export class SayCommand extends LegacyCommand<SpindaDiscordBot, SayArgs> {
    public name = 'say';
    public description = 'Repeats your message.';
    public category = CommandCategory.Secret;
    public permission = CommandPermission.Administrator;
    public cooldown = StandardCooldowns.Low;

    public args: ArgumentsConfig<SayArgs> = {
        message: {
            description: 'Message to send.',
            type: ArgumentType.String,
            required: true,
        },
        channel: {
            description: 'Text channel to message.',
            type: ArgumentType.Channel,
            required: false,
        },
    };

    public argsString(): string {
        return '(channel) message';
    }

    public parseChatArgs({ bot, src, args, content }: ChatCommandParameters<SpindaDiscordBot>): SayArgs {
        const parsed: Partial<SayArgs> = {};
        if (src.channel.isDMBased()) {
            throw new Error('Invalid channel.');
        }
        parsed.channel = src.channel;
        // First argument may be a channel mention
        if (src.isMessage()) {
            const msg = src.message;
            if (
                msg.mentions.channels.size > 0 &&
                args.length > 0 &&
                args.get(0) === msg.mentions.channels.first().toString()
            ) {
                const channelMention = args.shift();
                content = content.substring(channelMention.length).trimStart();
                const channel = bot.getChannelFromString(channelMention, src.guild.id);
                if (!channel) {
                    throw new Error(`Channel \`${channelMention}\` not found.`);
                } else if (!channel.isTextBased() || channel.isDMBased()) {
                    throw new Error('Invalid channel.');
                }
            }
        }

        if (!content) {
            throw new Error(`Message content required.`);
        }

        parsed.message = content;

        return parsed as SayArgs;
    }

    public async run({ src }: CommandParameters<SpindaDiscordBot>, args: SayArgs) {
        if (!args.channel.isTextBased()) {
            throw new Error(`Cannot send a message to that channel.`);
        }

        await args.channel.send(args.message);
        if (src.deletable) {
            await src.delete();
        }
    }
}
