import { MessageEmbed } from 'discord.js';
import {
    ArgumentsConfig,
    ArgumentType,
    CommandParameters,
    ComplexCommand,
    DiscordUtil,
    EmbedTemplates,
    StandardCooldowns,
} from 'panda-discord';

import { CommandCategory, CommandPermission, SpindaDiscordBot } from '../../../bot';

interface PrefixArgs {
    prefix?: string;
}

export class PrefixCommand extends ComplexCommand<SpindaDiscordBot, PrefixArgs> {
    public name = 'prefix';
    public description = "Sets the guild's prefix.";
    public category = CommandCategory.Config;
    public permission = CommandPermission.Administrator;
    public cooldown = StandardCooldowns.Medium;

    public args: ArgumentsConfig<PrefixArgs> = {
        prefix: {
            description: 'New guild prefix.',
            type: ArgumentType.String,
            required: false,
        },
    };

    public async run({ bot, src, guildId }: CommandParameters<SpindaDiscordBot>, args: PrefixArgs) {
        let newPrefix = args.prefix;

        const codeLine = DiscordUtil.getCodeLine(newPrefix);
        if (codeLine.match) {
            newPrefix = codeLine.result.content;
        }

        const guild = bot.dataService.getCachedGuild(guildId);
        let embed: MessageEmbed;
        if (!newPrefix) {
            embed = bot.createEmbed(EmbedTemplates.Bare);
            embed.setDescription(`The prefix for this guild is \`${guild.prefix}\``);
        } else {
            embed = bot.createEmbed(EmbedTemplates.Success);
            guild.prefix = newPrefix;
            await bot.dataService.updateGuild(guild);
            embed.setDescription(`Changed guild prefix to \`${guild.prefix}\``);
        }
        await src.send({ embeds: [embed] });
    }
}
