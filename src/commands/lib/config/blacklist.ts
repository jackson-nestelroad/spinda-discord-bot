import { Command, CommandCategory, CommandPermission, CommandParameters } from '../base';
import { MessageEmbed } from 'discord.js';

export class BlacklistCommand implements Command {
    public name = 'blacklist';
    public args = ' user|page#';
    public description = 'Adds or removes a member from the guild\'s blacklist. Blacklisted members will be unable to use bot commands in the guild. If no member is given, members on the blacklist will be given in pages of 10.';
    public category = CommandCategory.Config;
    public permission = CommandPermission.Administrator;

    private readonly pageSize = 10;

    public async run({ bot, msg, content, guild }: CommandParameters) {
        let embed: MessageEmbed;
        const blacklist = await bot.dataService.getBlacklist(guild.id);
        const member = content ? await bot.getMemberFromString(content, guild.id) : null;

        // Member was not found or not given
        if (!member) {
            // Content may be blank, a page number, or an unknown member
            let pageNumber: number;
            const givenPageNumber = parseInt(content);

            // Blank
            if (!content) {
                pageNumber = 0;
            }
            // Not a page number, so must be an unknown member
            else if (isNaN(givenPageNumber) || givenPageNumber <= 0) {
                throw new Error(`Member "${content}" could not be found`);
            }
            // A page number
            else {
                pageNumber = givenPageNumber - 1;
            }

            // Display blacklist
            embed = bot.createEmbed({ footer: false, timestamp: false });
            embed.setTitle(`Blacklist for ${msg.guild.name}`);
            const blacklistArray = [...blacklist.values()];
            
            const lastPageNumber = Math.ceil(blacklistArray.length / 10) - 1;
            pageNumber = Math.min(pageNumber, lastPageNumber);

            if (blacklistArray.length === 0) {
                embed.setDescription('No one!');
            }
            else {
                const index = pageNumber * this.pageSize;
                const description = [`**Page ${pageNumber + 1}**`]
                    .concat(blacklistArray
                        .slice(index, index + this.pageSize)
                        .map(id => `<@${id}>`)
                        .join('\n'));
                embed.setDescription(description);
            }
        }
        else if (member.id === msg.author.id) {
            throw new Error(`You cannot add yourself to the blacklist`);
        }
        // Add or remove member
        else {
            embed = bot.createEmbed({ footer: false, timestamp: false, success: true });
            if (blacklist.has(member.id)) {
                await bot.dataService.removeFromBlacklist(guild.id, member.id);
                embed.setDescription(`Removed ${member.user.username} from the blacklist`);
            }
            else {
                await bot.dataService.addToBlacklist(guild.id, member.id);
                embed.setDescription(`Added ${member.user.username} to the blacklist`);
            }
        }

        await msg.channel.send(embed);
    }
}