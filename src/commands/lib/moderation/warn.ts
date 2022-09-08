import { EmbedBuilder, GuildMember, PermissionFlagsBits } from 'discord.js';
import {
    ArgumentType,
    ArgumentsConfig,
    CommandParameters,
    ComplexCommand,
    EmbedTemplates,
    StandardCooldowns,
} from 'panda-discord';

import { CommandCategory, CommandPermission, SpindaDiscordBot } from '../../../bot';

interface WarnArgs {
    user: GuildMember;
    reason: string;
}

export class WarnCommand extends ComplexCommand<SpindaDiscordBot, WarnArgs> {
    public name = 'warn';
    public description = 'Warns the given user and logs the warning.';
    public category = CommandCategory.Moderation;
    public permission = CommandPermission.Moderator;
    public cooldown = StandardCooldowns.Low;

    public args: ArgumentsConfig<WarnArgs> = {
        user: {
            description: 'User to warn.',
            type: ArgumentType.User,
            required: true,
        },
        reason: {
            description: 'Reason.',
            type: ArgumentType.RestOfContent,
            required: true,
        },
    };

    private async sendToUserIfPossible(user: GuildMember, embed: EmbedBuilder): Promise<void> {
        try {
            await user.send({ embeds: [embed] });
        } catch (error) {
            // Ignore error.
        }
    }

    public async run({ bot, src }: CommandParameters<SpindaDiscordBot>, args: WarnArgs) {
        await src.deferReply(true);

        const warning = await bot.dataService.addWarning(src.guildId, args.user.id, src.author.id, args.reason);
        bot.client.emit('warning', warning);

        const warningEmbed = bot.createEmbed(EmbedTemplates.Warning);
        warningEmbed.setTitle(`Warning from ${src.guild.name}`);
        warningEmbed.addFields({ name: 'Reason', value: args.reason });
        await this.sendToUserIfPossible(args.user, warningEmbed);

        const guild = bot.dataService.getCachedGuild(src.guildId);
        const numWarnings = await bot.dataService.countWarnings(src.guildId, args.user.id);
        if (guild.warnsToBan && numWarnings >= guild.warnsToBan) {
            if (!args.user.bannable || !src.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
                throw new Error('Bot has inadequate permissions to ban user.');
            }

            const banEmbed = bot.createEmbed(EmbedTemplates.Error);
            banEmbed.setTitle('Banned');
            banEmbed.setDescription(
                `You have been permanently banned from ${src.guild.name} for receiving ${numWarnings} warning${
                    numWarnings === 1 ? '' : 's'
                }.`,
            );
            await this.sendToUserIfPossible(args.user, banEmbed);
            await args.user.ban({
                reason: `Received ${numWarnings} warning${numWarnings === 1 ? '' : 's'}.`,
                deleteMessageDays: 1,
            });
        } else if (guild.warnsToBeginTimeouts && guild.timeoutPerWarning && numWarnings >= guild.warnsToBeginTimeouts) {
            if (!src.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
                throw new Error('Bot has inadequate permissions to timeout user.');
            }

            const banEmbed = bot.createEmbed(EmbedTemplates.Error);
            banEmbed.setTitle('Banned');
            banEmbed.setDescription(
                `You have been timed out for ${guild.timeoutPerWarning} hours from ${
                    src.guild.name
                } for receiving ${numWarnings} warning${numWarnings === 1 ? '' : 's'}.`,
            );
            await this.sendToUserIfPossible(args.user, banEmbed);
            await args.user.timeout(
                1000 * 60 * 60 * guild.timeoutPerWarning * (numWarnings - guild.timeoutPerWarning + 1),
                `Received ${numWarnings} warning${numWarnings === 1 ? '' : 's'}.`,
            );
        }

        const successEmbed = bot.createEmbed(EmbedTemplates.Success);
        successEmbed.setDescription(`Successfully warned ${args.user.toString()}.`);
        await src.reply({ embeds: [successEmbed], ephemeral: true });
    }
}
