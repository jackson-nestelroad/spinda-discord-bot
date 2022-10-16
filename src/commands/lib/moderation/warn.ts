import { EmbedBuilder, GuildMember, PermissionFlagsBits } from 'discord.js';
import { Duration, duration } from 'moment';
import {
    ArgumentType,
    ArgumentsConfig,
    CommandParameters,
    ComplexCommand,
    EmbedTemplates,
    StandardCooldowns,
} from 'panda-discord';

import { CommandCategory, CommandPermission, SpindaDiscordBot } from '../../../bot';
import { WarningConfigSubCommand } from './warnings';

interface WarnDurationArg {
    duration?: Duration;
    none: boolean;
}

interface WarnArgs {
    user: GuildMember;
    reason: string;
    timeout?: WarnDurationArg;
    silent: boolean;
}

export class WarnCommand extends ComplexCommand<SpindaDiscordBot, WarnArgs> {
    public name = 'warn';
    public description = 'Warns the given user and logs the warning.';
    public category = CommandCategory.Moderation;
    public permission = CommandPermission.Moderator;
    public cooldown = StandardCooldowns.Low;

    private noneDurations: string[] = ['none', '0'];

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
        timeout: {
            description: 'Custom amount of time to timeout user (auto timeout settings used if blank).',
            type: ArgumentType.String,
            named: true,
            required: false,
            transformers: {
                any: (value, result) => {
                    if (
                        this.noneDurations.some(
                            str => str.localeCompare(value, undefined, { sensitivity: 'base' }) === 0,
                        )
                    ) {
                        result.value = { none: true };
                    } else {
                        result.value = { duration: duration(...value.split(' ')), none: false };
                        if (!result.value.duration.isValid() || result.value.duration.asMinutes() < 1) {
                            result.error = 'Invalid timeout length.';
                        }
                    }
                },
            },
        },
        silent: {
            description: 'Warn the user without notifying them (no timeout or DM).',
            type: ArgumentType.Boolean,
            named: true,
            required: false,
            default: false,
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
        bot.client.emit('guildMemberWarned', warning);

        const warningEmbed = bot.createEmbed(EmbedTemplates.Warning);
        warningEmbed.setTitle(`Warning from ${src.guild.name}`);
        warningEmbed.addFields({ name: 'Reason', value: args.reason });
        if (!args.silent) {
            await this.sendToUserIfPossible(args.user, warningEmbed);
        }

        const guild = bot.dataService.getCachedGuild(src.guildId);
        const numWarnings = await bot.dataService.countWarnings(src.guildId, args.user.id);
        if (guild.warnsToBan && numWarnings >= guild.warnsToBan) {
            if (!args.user.bannable || !src.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
                throw new Error('Bot has inadequate permissions to ban user.');
            }

            if (!args.silent) {
                const banEmbed = bot.createEmbed(EmbedTemplates.Error);
                banEmbed.setTitle('Banned');
                banEmbed.setDescription(
                    `You have been permanently banned from ${src.guild.name} for receiving ${numWarnings} warning${
                        numWarnings === 1 ? '' : 's'
                    }.`,
                );
                await this.sendToUserIfPossible(args.user, banEmbed);
            }

            await args.user.ban({
                reason: `Received ${numWarnings} warning${numWarnings === 1 ? '' : 's'}.`,
                deleteMessageDays: 1,
            });
        } else {
            let timeoutDuration: Duration = undefined;
            if (!args.timeout.none) {
                if (args.timeout) {
                    timeoutDuration = args.timeout.duration;
                } else if (
                    guild.warnsToBeginTimeouts !== null &&
                    numWarnings >= guild.warnsToBeginTimeouts &&
                    guild.timeoutSequence !== null
                ) {
                    const timeoutSequence = guild.timeoutSequence.split(
                        WarningConfigSubCommand.timeoutSequenceSeparator,
                    );
                    const index = Math.max(numWarnings - guild.warnsToBeginTimeouts, timeoutSequence.length - 1);
                    timeoutDuration = duration(...timeoutSequence[index].trim().split(' '));
                }
            }

            if (timeoutDuration?.isValid() && timeoutDuration.asMinutes() > 1) {
                if (!src.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
                    throw new Error('Bot has inadequate permissions to timeout user.');
                }

                if (!args.silent) {
                    const warnEmbed = bot.createEmbed(EmbedTemplates.Error);
                    warnEmbed.setTitle('Timed Out');
                    warnEmbed.setDescription(
                        `You have been timed out for ${timeoutDuration.humanize()} from ${
                            src.guild.name
                        } for receiving ${numWarnings} warning${numWarnings === 1 ? '' : 's'}.`,
                    );
                    await this.sendToUserIfPossible(args.user, warnEmbed);
                }

                await args.user.timeout(
                    timeoutDuration.asMilliseconds(),
                    `Received ${numWarnings} warning${numWarnings === 1 ? '' : 's'}.`,
                );
            }
        }

        const successEmbed = bot.createEmbed(EmbedTemplates.Success);
        successEmbed.setDescription(`Successfully warned ${args.user.toString()}.`);
        await src.reply({ embeds: [successEmbed], ephemeral: true });
    }
}
