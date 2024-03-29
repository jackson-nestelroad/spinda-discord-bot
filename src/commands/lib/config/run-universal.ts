import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageComponentInteraction,
    PermissionFlagsBits,
} from 'discord.js';
import {
    ArgumentType,
    ArgumentsConfig,
    CommandParameters,
    ComplexCommand,
    EmbedTemplates,
    SplitArgumentArray,
} from 'panda-discord';

import { CommandCategory, CommandPermission, SpindaDiscordBot } from '../../../bot';

interface RunUniversalArgs {
    code: string;
}

export class RunUniversalCommand extends ComplexCommand<SpindaDiscordBot, RunUniversalArgs> {
    public name = 'run-universal';
    public description = 'Runs custom command code for every member in the guild.';
    public moreDescription = [
        'Universal commands are extremely dangerous. It is recommended to save a guild member snapshot prior to running commands that alter members.',
        'Guilds with two or more members with the Administrator role require confirmation before executing the command.',
    ];
    public category = CommandCategory.Config;
    public permission = CommandPermission.Administrator;
    public cooldown = { minutes: 5 };

    public disableInCustomCommand = true;

    public args: ArgumentsConfig<RunUniversalArgs> = {
        code: {
            description: 'Custom command code.',
            type: ArgumentType.RestOfContent,
            required: true,
        },
    };

    public async run({ bot, src, guildId, extraArgs }: CommandParameters<SpindaDiscordBot>, args: RunUniversalArgs) {
        const members = await bot.memberListService.getMemberListForGuild(guildId);
        const otherAdmins = members.filter(
            member => member.permissions.has(PermissionFlagsBits.Administrator) && !member.user.bot,
        );
        otherAdmins.delete(src.author.id);

        if (otherAdmins.size > 0) {
            const button = new ButtonBuilder();
            button.setCustomId('confirm');
            button.setLabel('Run Universal Command');
            button.setEmoji(`\u{2755}`);
            button.setStyle(ButtonStyle.Danger);

            let response = await src.reply({
                content:
                    'Running a universal command is an extremely dangerous action. Please have another Administrator confirm this command.',
                components: [new ActionRowBuilder<ButtonBuilder>().addComponents(button)],
            });

            if (!response.isMessage()) {
                throw new Error(`Response to universal command should have produced a message.`);
            }

            const disableButton = async () => {
                button.setDisabled(true);
                return await response.edit({
                    components: [new ActionRowBuilder<ButtonBuilder>().addComponents(button)],
                });
            };

            let interaction: MessageComponentInteraction;
            try {
                interaction = await response.message.awaitMessageComponent({
                    filter: interaction => {
                        return interaction.customId === 'confirm' && otherAdmins.has(interaction.member.user.id);
                    },
                    time: 60 * 1000,
                });
            } catch (error) {
                response = await disableButton();
                const embed = bot.createEmbed(EmbedTemplates.Error);
                embed.setDescription('Universal command confirmation timed out.');
                await src.reply({ embeds: [embed] });
                return;
            }

            response = await disableButton();
            await interaction.reply(`Confirmation given by ${interaction.member.toString()}.`);
        }

        await bot.customCommandService.runUniversal(args.code, {
            params: { bot, src, guildId, extraArgs },
            content: 'content',
            args: SplitArgumentArray.Empty(),
        });
    }
}
