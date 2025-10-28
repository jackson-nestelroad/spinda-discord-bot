import { ChannelType, GuildTextBasedChannel, Message, PermissionFlagsBits } from 'discord.js';
import {
    ArgumentType,
    ArgumentsConfig,
    CommandParameters,
    ComplexCommand,
    EmbedTemplates,
    SimpleCommand,
    StandardCooldowns,
} from 'panda-discord';

import { CommandCategory, CommandPermission, SpindaDiscordBot } from '../../../bot';

interface HoneypotArgs {
    channel?: GuildTextBasedChannel;
    disable: boolean;
    enablebans: boolean;
}

export class HoneypotCommand extends ComplexCommand<SpindaDiscordBot, HoneypotArgs> {
    public name = 'honeypot';
    public description = 'Enables a honeypot channel: any member posting in the channel is banned.';
    public category = CommandCategory.Moderation;
    public permission = CommandPermission.Moderator;
    public cooldown? = StandardCooldowns.Medium;

    public args: ArgumentsConfig<HoneypotArgs> = {
        channel: {
            description: 'Channel to ban users in. Blank to view current channel.',
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
            description: 'Disable the honeypot by unsetting the channel.',
            type: ArgumentType.Boolean,
            required: false,
            default: false,
        },
        enablebans: {
            description: 'Members posting to the honeypot channel will be banned (default false).',
            type: ArgumentType.Boolean,
            required: false,
            default: false,
        },
    };

    public async run({ bot, src, guildId }: CommandParameters<SpindaDiscordBot>, args: HoneypotArgs) {
        const guild = bot.dataService.getCachedGuild(guildId);
        if (args.disable) {
            guild.honeypotChannelId = null;
            await bot.dataService.updateGuild(guild);
            const embed = bot.createEmbed(EmbedTemplates.Success);
            embed.setDescription('Successfully disabled honeypot channel.');
            await src.send({ embeds: [embed], ephemeral: true });
        } else if (!args.channel) {
            const embed = bot.createEmbed(EmbedTemplates.Bare);
            if (!guild.honeypotChannelId) {
                embed.setDescription('No honeypot channel set.');
            } else {
                const channel = await src.guild.channels.fetch(guild.honeypotChannelId);
                embed.setDescription(
                    `The honeypot channel is set to ${channel ?? '[DELETED CHANNEL]'}. ${
                        guild.honeypotEnableBans
                            ? 'Any message in this channel results in a ban.'
                            : 'Messages only result in a warning (banning must be explicitly enabled by setting the `enablebans` option to `True` when running the `/honeypot` command.'
                    }`,
                );
            }
            await src.send({ embeds: [embed], ephemeral: true });
        } else if (args.channel.guildId !== guildId) {
            throw new Error('Channel must be in this guild.');
        } else if (
            !args.channel.viewable ||
            !args.channel.permissionsFor(bot.client.user).has(PermissionFlagsBits.SendMessages)
        ) {
            throw new Error(`Bot is missing permissions for ${args.channel}.`);
        } else if (!src.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
            throw new Error('Bot does not have permission to ban members.');
        } else {
            guild.honeypotChannelId = args.channel.id;
            guild.honeypotEnableBans = args.enablebans;
            await bot.dataService.updateGuild(guild);
            const embed = bot.createEmbed(EmbedTemplates.Success);
            embed.setDescription(`Successfully set honeypot channel to ${args.channel}.`);
            await src.send({ embeds: [embed], ephemeral: true });
        }
    }
}
