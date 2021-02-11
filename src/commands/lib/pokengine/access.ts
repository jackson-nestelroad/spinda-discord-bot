import { Command, CommandCategory, CommandPermission, CommandParameters } from '../base';
import { Environment } from '../../../data/environment';
import axios, { AxiosResponse } from 'axios';
import * as cheerio from 'cheerio';
import { Role, TextChannel } from 'discord.js';

export class AccessCommand implements Command {
    private readonly serverName = 'Official Pok\u00E9ngine Discord Server';
    private readonly site = 'http://pokengine.org';
    private readonly playerPath = '/players/';

    private accessRole: Role = null;
    private accessChannel: TextChannel = null;

    public name = 'access';
    public args = '(Pok\u00E9ngine username)';
    public description = `Requests access to the ${this.serverName}.`
    public category = CommandCategory.Pokengine;
    public permission = CommandPermission.Everyone;

    public async run({ bot, msg, guild, content }: CommandParameters) {
        if (msg.guild.id !== Environment.Pokengine.getGuildId()) {
            const embed = bot.createEmbed();
            embed.setDescription(`Access to the ${this.serverName} can only be granted in that server. Sign up for Pok\u00E9ngine and the Discord server at ${this.site}.`);
            await msg.channel.send(embed);
        }
        else {
            // Make sure the role we are granting exists
            if (!this.accessRole) {
                const id = Environment.Pokengine.getAccessRoleId();
                this.accessRole = msg.guild.roles.cache.find(role => role.id === id);
                if (!this.accessRole) {
                    throw new Error(`Role id \`${id}\` does not exist in this server.`);
                }
            }
            // Make sure access channel exists and is a text channel
            if (!this.accessChannel) {
                const id = Environment.Pokengine.getAccessChannelId();
                this.accessChannel = msg.guild.channels.cache.find(channel => channel.id === id) as TextChannel;
                if (!this.accessChannel) {
                    throw new Error(`Channel id \`${id}\` does not exist in this server.`);
                }
                if (this.accessChannel.type !== 'text') {
                    throw new Error(`Access channel must be a text channel.`);
                }
            }

            // Ignore members that already have access
            if (!msg.member.roles.cache.has(this.accessRole.id)) {
                if (msg.channel.id !== this.accessChannel.id) {
                    await msg.reply(`please go to ${this.accessChannel.toString()}.`);
                }
                else if (!content) {
                    await msg.reply('please provide your Pok\u00E9ngine username.');
                }
                else {
                    const username = content;
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
                        throw new Error(`Player ${username} does not exist on ${this.site}.`);
                    }

                    const profile = cheerio(response.data).find('.content-inner.profile');
                    const siteName = profile.find('.scroll').eq(0).find('b').text();
                    const betaNode = profile.find('.flavor.other').eq(1).find('a').eq(0);
                    if (betaNode.text() === 'take it') {
                        throw new Error(`${siteName} already has access. If you already have MMO access or are rejoining the server, please contact a staff member for access.`);
                    }

                    // Update guild member
                    let newMember = await msg.member.roles.add(this.accessRole);

                    // Don't fail the operation if setting the nickname fails
                    try {
                        newMember = await newMember.setNickname(siteName);
                    } catch (error) {
                        await msg.reply('your nickname could not be updated. Please contact a staff member.');
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
                    
                    // Try to send a DM
                    // If it fails, just reply in the channel
                    try {
                        await msg.author.send(embed);
                    } catch (error) {
                        await msg.reply(embed);
                    }

                    await msg.react('\u2705');
                }
            }
        }
    }
}