import { CommandCategory, CommandPermission, CommandParameters, StandardCooldowns, ArgumentsConfig, ComplexCommand, ArgumentType } from '../base';
import { MessageEmbed } from 'discord.js';
import { EmbedTemplates } from '../../../util/embed';

interface BlocklistArgs {
    arg?: string;
}

export class BlocklistCommand extends ComplexCommand<BlocklistArgs> {
    public name = 'blocklist';
    public description = 'Adds or removes a member from the guild\'s blocklist.';
    public moreDescription = 'Blocklisted members will be unable to use bot commands in the guild. If no member is given, members on the blocklist will be given in pages of 10.';
    public category = CommandCategory.Config;
    public permission = CommandPermission.Administrator;
    public cooldown = StandardCooldowns.Medium;

    public args: ArgumentsConfig<BlocklistArgs> = {
        arg: {
            description: 'User to add or remove, or page number to view.',
            type: ArgumentType.RestOfContent,
            required: false,
        },
    };

    private readonly pageSize = 10;

    public async run({ bot, src, guild }: CommandParameters, args: BlocklistArgs) {
        let embed: MessageEmbed;
        const blocklist = await bot.dataService.getBlocklist(guild.id);
        const member = args.arg ? await bot.getMemberFromString(args.arg, guild.id) : null;

        // Member was not found or not given
        if (!member) {
            // Content may be blank, a page number, or an unknown member
            let pageNumber: number;
            const givenPageNumber = parseInt(args.arg);

            // Blank
            if (!args.arg) {
                pageNumber = 0;
            }
            // Not a page number, so must be an unknown member
            else if (isNaN(givenPageNumber) || givenPageNumber <= 0) {
                throw new Error(`Member "${args.arg}" could not be found`);
            }
            // A page number
            else {
                pageNumber = givenPageNumber - 1;
            }

            // Display blocklist
            embed = bot.createEmbed(EmbedTemplates.Bare);
            embed.setTitle(`Blocklist for ${src.guild.name}`);
            const blocklistArray = [...blocklist.values()];
            
            const lastPageNumber = Math.ceil(blocklistArray.length / 10) - 1;
            pageNumber = Math.min(pageNumber, lastPageNumber);

            if (blocklistArray.length === 0) {
                embed.setDescription('No one!');
            }
            else {
                const index = pageNumber * this.pageSize;
                const description = [`**Page ${pageNumber + 1}**`]
                    .concat(blocklistArray
                        .slice(index, index + this.pageSize)
                        .map(id => `<@${id}>`))
                    .join('\n');
                embed.setDescription(description);
            }
        }
        else if (member.id === src.author.id) {
            throw new Error(`You cannot add yourself to the blocklist`);
        }
        // Add or remove member
        else {
            embed = bot.createEmbed(EmbedTemplates.Success);
            if (blocklist.has(member.id)) {
                await bot.dataService.removeFromBlocklist(guild.id, member.id);
                embed.setDescription(`Removed ${member.user.username} from the blocklist`);
            }
            else {
                await bot.dataService.addToBlocklist(guild.id, member.id);
                embed.setDescription(`Added ${member.user.username} to the blocklist`);
            }
        }

        await src.send({ embeds: [embed] });
    }
}