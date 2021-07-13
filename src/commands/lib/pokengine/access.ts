import { CommandCategory, CommandPermission, CommandParameters, StandardCooldowns, ComplexCommand, ArgumentsConfig, ArgumentType } from '../base';
import { Environment } from '../../../data/environment';
import axios, { AxiosResponse } from 'axios';
import * as cheerio from 'cheerio';
import { Role, TextChannel } from 'discord.js';
import { EmbedTemplates } from '../../../util/embed';

interface AccessArgs {
    username?: string;
}

export class AccessCommand extends ComplexCommand<AccessArgs> {
    private readonly serverName = 'Official Pok\u{00E9}ngine Discord Server';
    private readonly site = 'http://pokengine.org';
    private readonly playerPath = '/players/';
    private readonly successReact = '\u{2705}';
    private readonly nicknameFailMsg = 'Your nickname could not be updated. Please contact a staff member.';

    private accessRole: Role = null;
    private accessChannel: TextChannel = null;

    public name = 'access';
    public description = `Requests access to the ${this.serverName}.`
    public category = CommandCategory.Pokengine;
    public permission = CommandPermission.Everyone;
    public cooldown = StandardCooldowns.Low;

    public slashGuildId = Environment.Pokengine.getGuildId();
    public suppressChatArgumentsError = true;

    public args: ArgumentsConfig<AccessArgs> = {
        username: {
            description: 'Pok\u{00E9}ngine username.',
            type: ArgumentType.RestOfContent,
            required: true,
        },
    }

    public async run({ bot, src }: CommandParameters, args: AccessArgs) {
        if (src.guild.id !== Environment.Pokengine.getGuildId()) {
            const embed = bot.createEmbed();
            embed.setDescription(`Access to the ${this.serverName} can only be granted in that server. Sign up for Pok\u00E9ngine and the Discord server at ${this.site}.`);
            await src.send({ embeds: [embed] });
        }
        else {
            // Make sure the role we are granting exists
            if (!this.accessRole) {
                const id = Environment.Pokengine.getAccessRoleId();
                this.accessRole = src.guild.roles.cache.find(role => role.id === id);
                if (!this.accessRole) {
                    throw new Error(`Role id \`${id}\` does not exist in this server.`);
                }
            }
            // Make sure access channel exists and is a text channel
            if (!this.accessChannel) {
                const id = Environment.Pokengine.getAccessChannelId();
                this.accessChannel = src.guild.channels.cache.find(channel => channel.id === id) as TextChannel;
                if (!this.accessChannel) {
                    throw new Error(`Channel id \`${id}\` does not exist in this server.`);
                }
                if (this.accessChannel.type !== 'text') {
                    throw new Error(`Access channel must be a text channel.`);
                }
            }

            // Ignore members that already have access
            if (src.member.roles.cache.has(this.accessRole.id)) {
                if (src.isInteraction()) {
                    const embed = bot.createEmbed(EmbedTemplates.Error);
                    embed.setDescription(`You already have access!`);
                    await src.reply({ embeds: [embed], ephemeral: true });
                }
                else {
                    return;
                }
            }
            else {
                if (src.channel.id !== this.accessChannel.id) {
                    await src.reply({ content: `Please go to ${this.accessChannel.toString()}.`, ephemeral: true });
                }
                else if (!args.username) {
                    await src.reply({ content: 'Please provide your Pok\u00E9ngine username.', ephemeral: true });
                }
                else {
                    await src.defer();

                    const username = args.username;
                    const url = this.site + this.playerPath + username;
                    let response: AxiosResponse;
                    try {
                        response = await axios.request({
                            url: url,
                            method: 'get',
                            headers: {
                                'Cookie': Environment.Pokengine.getCookie(),
                            },
                        });
                    } catch (error) {
                        throw new Error(`Player ${username} does not exist on ${this.site}. Register an account at ${this.site}/register.`);
                    }

                    const profile = cheerio.load(response.data)('.content-inner.profile');
                    const siteName = profile.find('.scroll').eq(0).find('b').text();
                    const betaNode = profile.find('.flavor.other').eq(1).find('a').eq(0);
                    if (betaNode.text() === 'take it') {
                        throw new Error(`${siteName} already has access. If you already have MMO access or are rejoining the server, please contact a staff member for access.`);
                    }

                    // Update guild member
                    let newMember = await src.member.roles.add(this.accessRole);

                    let nicknameFailed = false;
                    // Don't fail the operation if setting the nickname fails
                    try {
                        newMember = await newMember.setNickname(siteName);
                    } catch (error) {
                        nicknameFailed = true;
                    }

                    // Submit update to site
                    try {
                        await axios.request({
                            url: url + betaNode.attr('href'),
                            method: 'get',
                            headers: {
                                'Cookie': Environment.Pokengine.getCookie(),
                            },
                        });
                    } catch (error) {
                        throw new Error(`Failed to give beta access to ${username}. Please contact a staff member.`);
                    }

                    const embed = bot.createEmbed();
                    embed.setTitle(this.serverName);
                    embed.setDescription(`You have been granted access to ${this.serverName}!\nYou may access all channels and our browser-based MMO.\n[Click here to access the MMO!](${this.site}/mmo)`);

                    if (nicknameFailed) {
                        await src.reply(this.nicknameFailMsg);
                    }
                    else if (src.isMessage()) {
                        await src.message.react(this.successReact);
                    }
                    else {
                        await src.reply(this.successReact);
                    }

                    // We do this after so that there is at least one message of confirmation in the chat
                    // that can be seen by other users

                    // Try to send a DM
                    // If it fails, add a reaction to signal the failure
                    try {
                        await src.sendDirect({ embeds: [embed] });
                    } catch (error) {
                        if (src.isMessage()) {
                            await src.message.react('\u{1F614}');
                        }
                    }
                }
            }
        }
    }
}