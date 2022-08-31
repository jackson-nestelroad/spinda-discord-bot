import { GuildMember } from 'discord.js';
import {
    ArgumentType,
    ArgumentsConfig,
    CommandParameters,
    ComplexCommand,
    EmbedTemplates,
    NestedCommand,
    StandardCooldowns,
} from 'panda-discord';

import { CommandCategory, CommandPermission, SpindaDiscordBot } from '../../../bot';

interface ToggleMemberOnBlocklistArgs {
    member: GuildMember;
}

class AddMemberOnBlocklistSubCommand extends ComplexCommand<SpindaDiscordBot, ToggleMemberOnBlocklistArgs> {
    public name = 'add';
    public description = "Adds a member to the guild's blocklist, preventing them from using commands.";
    public category = CommandCategory.Inherit;
    public permission = CommandPermission.Inherit;

    public args: ArgumentsConfig<ToggleMemberOnBlocklistArgs> = {
        member: {
            description: 'Member to blocklist.',
            type: ArgumentType.User,
            required: true,
        },
    };

    public async run({ bot, src, guildId }: CommandParameters<SpindaDiscordBot>, args: ToggleMemberOnBlocklistArgs) {
        if (args.member.id === src.author.id) {
            throw new Error(`You cannot add yourself to the blocklist.`);
        }

        await bot.dataService.addToBlocklist(guildId, args.member.id);

        const embed = bot.createEmbed(EmbedTemplates.Success);
        embed.setDescription(`Added ${args.member.user.username} to the blocklist.`);

        await src.send({ embeds: [embed] });
    }
}

class RemoveMemberFromBlocklistSubCommand extends ComplexCommand<SpindaDiscordBot, ToggleMemberOnBlocklistArgs> {
    public name = 'remove';
    public description = "Removes a member from the guild's blocklist.";
    public category = CommandCategory.Inherit;
    public permission = CommandPermission.Inherit;

    public args: ArgumentsConfig<ToggleMemberOnBlocklistArgs> = {
        member: {
            description: 'Member to remove from the blocklist.',
            type: ArgumentType.User,
            required: true,
        },
    };

    public async run({ bot, src, guildId }: CommandParameters<SpindaDiscordBot>, args: ToggleMemberOnBlocklistArgs) {
        await bot.dataService.removeFromBlocklist(guildId, args.member.id);

        const embed = bot.createEmbed(EmbedTemplates.Success);
        embed.setDescription(`Removed ${args.member.user.username} from the blocklist.`);

        await src.send({ embeds: [embed] });
    }
}

interface ViewBlocklistPageArgs {
    page?: number;
}

class ViewBlocklistPageSubCommand extends ComplexCommand<SpindaDiscordBot, ViewBlocklistPageArgs> {
    private readonly pageSize = 10;

    public name = 'view';
    public description = `Views the guild's blocklist in pages of ${this.pageSize} members.`;
    public category = CommandCategory.Inherit;
    public permission = CommandPermission.Inherit;

    public args: ArgumentsConfig<ViewBlocklistPageArgs> = {
        page: {
            description: 'Page number to view, starting at 1.',
            type: ArgumentType.Integer,
            required: false,
            default: 1,
            transformers: {
                any: (value, result) => {
                    result.value = value - 1;
                    if (result.value < 0) {
                        result.error = 'Invalid page number.';
                    }
                },
            },
        },
    };

    public async run({ bot, src, guildId }: CommandParameters<SpindaDiscordBot>, args: ViewBlocklistPageArgs) {
        const blocklist = await bot.dataService.getBlocklist(guildId);

        // Display blocklist
        const embed = bot.createEmbed(EmbedTemplates.Bare);
        embed.setTitle(`Blocklist for ${src.guild.name}`);
        const blocklistArray = [...blocklist.values()];

        const lastPageNumber = Math.ceil(blocklistArray.length / 10) - 1;
        const pageNumber = Math.min(args.page, lastPageNumber);

        if (blocklistArray.length === 0) {
            embed.setDescription('No one!');
        } else {
            const index = pageNumber * this.pageSize;
            const description = [`**Page ${pageNumber + 1}/${lastPageNumber + 1}**`]
                .concat(blocklistArray.slice(index, index + this.pageSize).map(id => `<@${id}>`))
                .join('\n');
            embed.setDescription(description);
        }

        await src.send({ embeds: [embed] });
    }
}

export class BlocklistCommand extends NestedCommand<SpindaDiscordBot> {
    public name = 'blocklist';
    public description = "Adds or removes a member from the guild's blocklist.";
    public moreDescription = 'Blocklisted members will be unable to use bot commands in the guild.';
    public category = CommandCategory.Config;
    public permission = CommandPermission.Moderator;
    public cooldown = StandardCooldowns.Medium;

    public initializeShared() {}

    public subcommands = [
        AddMemberOnBlocklistSubCommand,
        RemoveMemberFromBlocklistSubCommand,
        ViewBlocklistPageSubCommand,
    ];
}
