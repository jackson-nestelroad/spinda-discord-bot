import axios, { AxiosError, AxiosResponse } from 'axios';
import {
    ArgumentType,
    ArgumentsConfig,
    CommandParameters,
    ComplexCommand,
    EmbedTemplates,
    StandardCooldowns,
} from 'panda-discord';

import { CommandCategory, CommandPermission, SpindaDiscordBot } from '../../../bot';
import { Environment } from '../../../data/environment';

interface PasswordArgs {
    password: string;
}

export class PasswordCommand extends ComplexCommand<SpindaDiscordBot, PasswordArgs> {
    public name = 'password';
    public description = 'Changes the password to your Pok\u{00E9}ngine account.';
    public category = CommandCategory.Pokengine;
    public permission = CommandPermission.Everyone;
    public cooldown = StandardCooldowns.Minute;

    public disableChat = true;
    public disableInCustomCommand = true;
    public guildId = Environment.Pokengine.getGuildId();

    public args: ArgumentsConfig<PasswordArgs> = {
        password: {
            description: 'New password. Be sure to write this down!',
            type: ArgumentType.String,
            required: true,
        },
    };

    public async run({ bot, src }: CommandParameters<SpindaDiscordBot>, args: PasswordArgs) {
        // This MUST be ephemeral because we are using a password
        // Only the user who initiates the command should see it
        await src.deferReply(true);

        // User must have been previously validated for this to work
        if (!src.member.roles.cache.has(Environment.Pokengine.getAccessRoleId())) {
            throw new Error(
                'You may not change your password without linking your Pok\u{00E9}ngine account to Discord first. Use `/access` to link your account to Discord. If you do not remember your password, contact a staff member for manual validation.',
            );
        }

        let response: AxiosResponse;
        try {
            response = await axios.request({
                url: Environment.Pokengine.getSecretPasswordLink(),
                method: 'post',
                headers: {
                    Cookie: Environment.Pokengine.getCookie(),
                },
                data: {
                    username: src.member.nickname ?? src.author.username,
                    password: args.password,
                },
            });
        } catch (error) {
            if (error.response) {
                const axiosError = error as AxiosError;
                switch (axiosError.response.status) {
                    case 404:
                        throw new Error(
                            'Your nickname does not match any Pok\u{00E9}ngine username. Contact a staff member to change your Discord nickname so you may change your password.',
                        );
                    default:
                        throw new Error(
                            `An unknown error occurred (status = ${axiosError.response.status}). Please contact a staff member for help.`,
                        );
                }
            }
        }

        if (response.status !== 200) {
            throw new Error(
                `Unexpected HTTP response code ${response.status}. Please contact a staff member for help.`,
            );
        }

        const embed = bot.createEmbed(EmbedTemplates.Success);
        embed.setDescription('Success! You may now login to Pok\u{00E9}ngine with your new password.');
        await src.reply({ embeds: [embed], ephemeral: true });
    }
}
