import axios, { AxiosError, AxiosResponse } from 'axios';
import {
    ActionRowBuilder,
    ModalBuilder,
    ModalSubmitInteraction,
    Role,
    TextInputBuilder,
    TextInputStyle,
} from 'discord.js';
import { CommandParameters, EmbedTemplates, SimpleCommand, StandardCooldowns } from 'panda-discord';

import { CommandCategory, CommandPermission, SpindaDiscordBot } from '../../../bot';
import { Environment } from '../../../data/environment';

export class AccessCommand extends SimpleCommand<SpindaDiscordBot> {
    private readonly serverName = 'Official Pok\u{00E9}ngine Discord Server';
    private readonly site = 'https://pokengine.org';
    private readonly successReact = '\u{2705}';
    private readonly nicknameFailMsg =
        'Your nickname in the Discord server could not be updated. Please contact a staff member to change your nickname.';

    private readonly translatorMsg =
        "If you're having trouble with registering or finding your account, **please disable your translator**.\n\nSi vous rencontrez des difficultés pour vous inscrire ou trouver votre compte, **veuillez désactiver votre traducteur et essayer de vous inscrire au jeu**.";

    private accessRole: Role = null;

    public name = 'access';
    public description = `Requests access to the ${this.serverName} and the Pok\u{00E9}ngine MMO.`;
    public category = CommandCategory.Pokengine;
    public permission = CommandPermission.Everyone;
    public cooldown = StandardCooldowns.Low;

    public disableChat = true;
    public disableInCustomCommand = false;
    public guildId = Environment.Pokengine.getGuildId();

    public async run({ bot, src }: CommandParameters<SpindaDiscordBot>) {
        if (!src.isCommandInteraction()) {
            return;
        }

        // Make sure the role we are granting exists
        if (!this.accessRole) {
            const id = Environment.Pokengine.getAccessRoleId();
            this.accessRole = src.guild.roles.cache.find(role => role.id === id);
            if (!this.accessRole) {
                throw new Error(`Role id \`${id}\` does not exist in this server.`);
            }
        }

        // Ignore members that already have access
        if (src.member.roles.cache.has(this.accessRole.id)) {
            const embed = bot.createEmbed(EmbedTemplates.Error);
            embed.setDescription(`You already have access!`);
            await src.reply({ embeds: [embed], ephemeral: true });
            return;
        }

        const modal = new ModalBuilder().setCustomId('accessModal').setTitle(`${this.serverName} Access`);

        modal.addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                new TextInputBuilder()
                    .setCustomId('usernameInput')
                    .setLabel('Pok\u{00E9}ngine Username')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(),
            ),
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                new TextInputBuilder()
                    .setCustomId('passwordInput')
                    .setLabel('Pok\u{00E9}ngine Password')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(),
            ),
        );

        await src.interaction.showModal(modal);

        let modalSubmit: ModalSubmitInteraction;
        try {
            modalSubmit = await src.interaction.awaitModalSubmit({
                filter: interaction => {
                    return interaction.customId === 'accessModal' && interaction.user.id === src.author.id;
                },
                time: 5 * 60 * 1000,
            });
        } catch (error) {
            throw new Error('You did not respond in time. Please try again.');
        }

        await modalSubmit.deferReply();

        await bot.sendErrorsToInteraction(modalSubmit, async () => {
            const username = modalSubmit.fields.getTextInputValue('usernameInput').trim();
            const password = modalSubmit.fields.getTextInputValue('passwordInput');

            let response: AxiosResponse;
            try {
                response = await axios.request({
                    url: Environment.Pokengine.getSecretAccessLink(),
                    method: 'post',
                    headers: {
                        Cookie: Environment.Pokengine.getCookie(),
                    },
                    data: {
                        username,
                        password,
                    },
                });
            } catch (error) {
                if (error.response) {
                    const axiosError = error as AxiosError;
                    switch (axiosError.response.status) {
                        case 401:
                            throw new Error(`Invalid password!\n\n${this.translatorMsg}`);
                        case 404:
                            throw new Error(
                                `Player ${username} does not exist on ${this.site}. Register an account at ${this.site}/register.\n\n${this.translatorMsg}`,
                            );
                        default:
                            throw new Error(
                                `An unknown error occurred (status = ${axiosError.response.status}). Please contact a staff member for access.`,
                            );
                    }
                } else {
                    throw new Error('An unknown error occurred. Please contact a staff member for access.');
                }
            }

            if (response.status !== 200) {
                throw new Error(
                    `Unexpected HTTP response code ${response.status}. Please contact a staff member for access.`,
                );
            }

            const siteName = response.data as string;

            // Update guild member
            let newMember = await src.member.roles.add(this.accessRole);

            let nicknameFailed = false;
            // Don't fail the operation if setting the nickname fails
            try {
                newMember = await newMember.setNickname(siteName);
            } catch (error) {
                nicknameFailed = true;
            }

            const embed = bot.createEmbed();
            embed.setTitle(this.serverName);
            const description = [
                `You have been granted access to ${this.serverName}!`,
                'You may access all channels and our browser-based MMO.',
                `[Click here to access the MMO!](${this.site}/mmo)`,
            ];

            if (nicknameFailed) {
                description.push(this.nicknameFailMsg);
            }

            embed.setDescription(description.join('\n'));

            await modalSubmit.followUp({ content: this.successReact, ephemeral: true });
            await src.reply({ embeds: [embed], ephemeral: true });
        });
    }
}
