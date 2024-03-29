import {
    ActionRowBuilder,
    EmbedBuilder,
    GuildMember,
    ModalActionRowComponentBuilder,
    ModalBuilder,
    ModalSubmitInteraction,
    PermissionFlagsBits,
    TextInputBuilder,
    TextInputStyle,
} from 'discord.js';
import { Duration, duration } from 'moment';
import {
    ArgumentType,
    ArgumentsConfig,
    CommandParameters,
    CommandSource,
    ComplexCommand,
    EmbedTemplates,
    GuildMemberContextMenuCommand,
    InteractionCommandParameters,
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

class WarnContextMenuCommand extends GuildMemberContextMenuCommand<SpindaDiscordBot, WarnArgs> {
    public name = 'Warn User';

    public async run(
        { bot, src, guildId, extraArgs }: InteractionCommandParameters<SpindaDiscordBot>,
        member: GuildMember,
    ) {
        const modal = new ModalBuilder().setCustomId('warnModal').setTitle(`Warn ${member.user.tag}`);

        modal.addComponents(
            new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
                new TextInputBuilder()
                    .setCustomId('reasonInput')
                    .setLabel('Reason')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(),
            ),
            new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
                new TextInputBuilder()
                    .setCustomId('timeoutInput')
                    .setLabel('Timeout')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('"6 hours", "2 days", or blank to use guild configuration')
                    .setRequired(false),
            ),
            new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
                new TextInputBuilder()
                    .setCustomId('silentInput')
                    .setLabel('Silent?')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('"true" or "false"')
                    .setRequired(false),
            ),
        );

        await src.interaction.showModal(modal);

        let modalSubmit: ModalSubmitInteraction;
        try {
            modalSubmit = await src.interaction.awaitModalSubmit({
                filter: interaction => {
                    return interaction.customId === 'warnModal' && interaction.user.id === src.author.id;
                },
                time: 5 * 60 * 1000,
            });
        } catch (error) {
            throw new Error('You did not respond in time. Please try again.');
        }

        const reason = modalSubmit.fields.getTextInputValue('reasonInput').trim();
        const timeout = modalSubmit.fields.getTextInputValue('timeoutInput')?.trim() || undefined;
        const silent = modalSubmit.fields.getTextInputValue('silentInput')?.trim() || undefined;

        const newSrc = new CommandSource(modalSubmit);
        try {
            const params: CommandParameters<SpindaDiscordBot> = {
                bot,
                src: newSrc,
                guildId,
                extraArgs,
            };
            await this.command.run(
                params,
                await this.command.parseArguments(params, { reason, timeout, silent }, { user: member }),
            );
        } catch (error) {
            await bot.sendError(newSrc, error);
        }
    }
}

export class WarnCommand extends ComplexCommand<SpindaDiscordBot, WarnArgs> {
    public name = 'warn';
    public description = 'Warns the given user and logs the warning.';
    public category = CommandCategory.Moderation;
    public permission = CommandPermission.Moderator;
    public cooldown = StandardCooldowns.Low;

    public contextMenu = [WarnContextMenuCommand];

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
            if (args.timeout) {
                if (!args.timeout.none && args.timeout.duration) {
                    timeoutDuration = args.timeout.duration;
                }
            } else if (
                guild.warnsToBeginTimeouts !== null &&
                numWarnings >= guild.warnsToBeginTimeouts &&
                guild.timeoutSequence !== null
            ) {
                const timeoutSequence = guild.timeoutSequence.split(WarningConfigSubCommand.timeoutSequenceSeparator);
                const index = Math.min(numWarnings - guild.warnsToBeginTimeouts, timeoutSequence.length - 1);
                timeoutDuration = duration(...timeoutSequence[index].trim().split(' '));
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
