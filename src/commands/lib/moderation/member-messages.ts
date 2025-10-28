import { ChannelType, GuildTextBasedChannel, Message, PermissionFlagsBits } from 'discord.js';
import {
    ArgumentType,
    ArgumentsConfig,
    CommandParameters,
    ComplexCommand,
    EmbedTemplates,
    MockCommandSourceBase,
    NestedCommand,
    SendResponse,
    SimpleCommand,
    StandardCooldowns,
} from 'panda-discord';

import { CommandCategory, CommandPermission, SpindaDiscordBot } from '../../../bot';
import { CustomCommandEngine } from '../../../custom-commands/custom-command-engine';

export class MockCommandSourceForMemberMessages extends MockCommandSourceBase {
    public async send(res: SendResponse): Promise<Message> {
        if (!this.channel.isSendable()) {
            throw new Error('Message cannot be sent to channel');
        }
        return await this.channel.send(res);
    }

    public async sendDirect(res: SendResponse): Promise<Message> {
        return await this.member.send(res);
    }
}

interface MemberMessagesJoinedArgs {
    message?: string;
    test: boolean;
}

export class MemberMessagesJoinedSubCommand extends ComplexCommand<SpindaDiscordBot, MemberMessagesJoinedArgs> {
    public name = 'joined';
    public description = 'Sets the message sent when a member joins.';
    public moreDescription = `The message can use the same code as any custom command (see \`/help set-command\`).`;
    public category = CommandCategory.Inherit;
    public permission = CommandPermission.Inherit;

    public args: ArgumentsConfig<MemberMessagesJoinedArgs> = {
        message: {
            description: 'Message code for member joined. Blank for no message.',
            type: ArgumentType.RestOfContent,
            required: false,
        },
        test: {
            description: 'Test the message by sending an example.',
            type: ArgumentType.Boolean,
            required: false,
            default: false,
            named: true,
        },
    };

    public async run({ bot, src, guildId }: CommandParameters<SpindaDiscordBot>, args: MemberMessagesJoinedArgs) {
        const guild = bot.dataService.getCachedGuild(guildId);

        if (!args.message) {
            guild.memberJoinedCode = null;
            await bot.dataService.updateGuild(guild);
            const embed = bot.createEmbed(EmbedTemplates.Success);
            embed.setDescription('Successfully removed public member joined message.');
            await src.send({ embeds: [embed], ephemeral: true });
        } else {
            const { code } = CustomCommandEngine.parseMetadata(args.message);
            guild.memberJoinedCode = code;

            if (args.test) {
                await bot.customCommandService.run(guild.memberJoinedCode, {
                    params: {
                        bot,
                        src,
                        guildId,
                        extraArgs: {},
                    },
                });
            }

            await bot.dataService.updateGuild(guild);
            const embed = bot.createEmbed(EmbedTemplates.Success);
            embed.setDescription('Successfully updated public member joined message.');
            await src.send({ embeds: [embed], ephemeral: true });
        }
    }
}

interface MemberMessagesLeftArgs {
    message?: string;
    test: boolean;
}

export class MemberMessagesLeftSubCommand extends ComplexCommand<SpindaDiscordBot, MemberMessagesLeftArgs> {
    public name = 'left';
    public description = 'Sets the message sent when a member leaves.';
    public moreDescription = `The message can use the same code as any custom command (see \`/help set-command\`).`;
    public category = CommandCategory.Inherit;
    public permission = CommandPermission.Inherit;

    public args: ArgumentsConfig<MemberMessagesLeftArgs> = {
        message: {
            description: 'Message code for member left. Blank for no message.',
            type: ArgumentType.RestOfContent,
            required: false,
        },
        test: {
            description: 'Test the message by sending an example.',
            type: ArgumentType.Boolean,
            required: false,
            default: false,
            named: true,
        },
    };

    public async run({ bot, src, guildId }: CommandParameters<SpindaDiscordBot>, args: MemberMessagesLeftArgs) {
        const guild = bot.dataService.getCachedGuild(guildId);

        if (!args.message) {
            guild.memberLeftCode = null;
            await bot.dataService.updateGuild(guild);
            const embed = bot.createEmbed(EmbedTemplates.Success);
            embed.setDescription('Successfully removed public member left message.');
            await src.send({ embeds: [embed], ephemeral: true });
        } else {
            const { code } = CustomCommandEngine.parseMetadata(args.message);
            guild.memberLeftCode = code;

            if (args.test) {
                await bot.customCommandService.run(guild.memberLeftCode, {
                    params: {
                        bot,
                        src,
                        guildId,
                        extraArgs: {},
                    },
                });
            }

            await bot.dataService.updateGuild(guild);
            const embed = bot.createEmbed(EmbedTemplates.Success);
            embed.setDescription('Successfully updated public member left message.');
            await src.send({ embeds: [embed], ephemeral: true });
        }
    }
}

interface MemberMessagesSetChannelArgs {
    channel?: GuildTextBasedChannel;
    disable: boolean;
}

export class MemberMessagesSetChannelSubCommand extends ComplexCommand<SpindaDiscordBot, MemberMessagesSetChannelArgs> {
    public name = 'channel';
    public description = 'Sets the channel where public member message are sent.';
    public category = CommandCategory.Inherit;
    public permission = CommandPermission.Inherit;

    public args: ArgumentsConfig<MemberMessagesSetChannelArgs> = {
        channel: {
            description: 'Channel to send member messages. Blank to view current channel.',
            type: ArgumentType.Channel,
            required: false,
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
        disable: {
            description: 'Disable member messages by unsetting the channel.',
            type: ArgumentType.Boolean,
            required: false,
            default: false,
        },
    };

    public async run({ bot, src, guildId }: CommandParameters<SpindaDiscordBot>, args: MemberMessagesSetChannelArgs) {
        const guild = bot.dataService.getCachedGuild(guildId);
        if (args.disable) {
            guild.memberMessagesChannelId = null;
            await bot.dataService.updateGuild(guild);
            const embed = bot.createEmbed(EmbedTemplates.Success);
            embed.setDescription('Successfully disabled public member messages.');
            await src.send({ embeds: [embed], ephemeral: true });
        } else if (!args.channel) {
            const embed = bot.createEmbed(EmbedTemplates.Bare);
            if (!guild.memberMessagesChannelId) {
                embed.setDescription('Public member messages are currently not sent to any channel.');
            } else {
                const channel = await src.guild.channels.fetch(guild.memberMessagesChannelId);
                embed.setDescription(`Public member messages are currently sent to ${channel ?? '[DELETED CHANNEL]'}`);
            }
            await src.send({ embeds: [embed], ephemeral: true });
        } else if (args.channel.guildId !== guildId) {
            throw new Error('Channel must be in this guild.');
        } else if (
            !args.channel.viewable ||
            !args.channel.permissionsFor(bot.client.user).has(PermissionFlagsBits.SendMessages)
        ) {
            throw new Error(`Bot is missing permissions for ${args.channel}.`);
        } else {
            guild.memberMessagesChannelId = args.channel.id;
            await bot.dataService.updateGuild(guild);
            const embed = bot.createEmbed(EmbedTemplates.Success);
            embed.setDescription(`Successfully configured public member messages to send to ${args.channel}.`);
            await src.send({ embeds: [embed], ephemeral: true });
        }
    }
}

export class MemberMessagesViewConfigSubCommand extends SimpleCommand<SpindaDiscordBot> {
    public name = 'view-config';
    public description = "Views the guild's configuration for public member messages.";
    public category = CommandCategory.Inherit;
    public permission = CommandPermission.Inherit;

    private readonly noneString: string = 'None!';

    public async run({ bot, src, guildId }: CommandParameters<SpindaDiscordBot>) {
        const guild = bot.dataService.getCachedGuild(guildId);
        const embed = bot.createEmbed(EmbedTemplates.Bare);
        embed.setTitle(`Member Messages Configuration for ${src.guild.name}`);
        embed.addFields(
            {
                name: 'Channel',
                value: src.guild.channels.cache.get(guild.memberMessagesChannelId)?.toString() ?? this.noneString,
            },
            {
                name: 'Member Joined',
                value: guild.memberJoinedCode ?? this.noneString,
            },
            {
                name: 'Member Left',
                value: guild.memberLeftCode ?? this.noneString,
            },
        );
        await src.send({ embeds: [embed] });
    }
}

export class MemberMessagesCommand extends NestedCommand<SpindaDiscordBot> {
    public name = 'member-messages';
    public description = 'Configures public messages about members, such joined and left updates.';
    public category = CommandCategory.Moderation;
    public permission = CommandPermission.Moderator;
    public cooldown = StandardCooldowns.Low;

    public subcommands = [
        MemberMessagesJoinedSubCommand,
        MemberMessagesLeftSubCommand,
        MemberMessagesSetChannelSubCommand,
        MemberMessagesViewConfigSubCommand,
    ];
}
