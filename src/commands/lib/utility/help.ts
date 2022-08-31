import { CommandParameters, ExpireAgeConversion, HelpArgs, HelpCommand } from 'panda-discord';

import { CommandCategory, CommandPermission, SpindaDiscordBot } from '../../../bot';
import { CustomCommandEngine } from '../../../custom-commands/custom-command-engine';
import { CustomCommandData, CustomCommandFlag } from '../../../data/model/custom-command';

// TODO: Export needed Discord type from Panda.
type MessageEmbed = ReturnType<SpindaDiscordBot['createEmbed']>;

export class SpindaHelpCommand extends HelpCommand<SpindaDiscordBot> {
    private readonly customHelpQueries: Record<string, (embed: MessageEmbed) => void> = {
        panda: embed => {
            embed.setTitle('Panda Command Framework');
            embed.setAuthor(null);
            embed.setDescription(
                `Spinda is built on Panda, an extensible framework for building bots with discord.js.
Panda provides a strongly-typed class-based structure for writing complex commands.

You can find out more at the [GitHub repository](https://github.com/jackson-nestelroad/panda-discord/).`,
            );
        },
    };

    private customCommandString(data: CustomCommandData, prefix: string): string {
        let str = prefix + data.name;
        if (!(data.flags & CustomCommandFlag.NoContent)) {
            str += ' ' + (data.flags & CustomCommandFlag.ContentRequired ? data.contentName : `(${data.contentName})`);
        }
        return str;
    }

    public async handleHelpQueryBeforeCommands(
        { bot, src, guildId }: CommandParameters<SpindaDiscordBot>,
        { query }: HelpArgs,
        embed: MessageEmbed,
    ) {
        const prefix = bot.dataService.getCachedGuild(guildId).prefix;

        if (CommandCategory.Custom.localeCompare(query, undefined, { sensitivity: 'base' }) === 0) {
            // Query is the custom category.
            embed.setTitle(`${CommandCategory.Custom} Commands for ${src.guild.name}`);
            const customCommands = await bot.dataService.getCustomCommands(src.guild.id);
            const commandsString = Object.values(customCommands)
                .map(data => `\`${prefix}${data.name}\``)
                .join(', ');
            embed.setDescription(commandsString);
            return true;
        }

        // Custom query handlers.
        const handler = this.customHelpQueries[query.toLocaleLowerCase()];
        if (handler) {
            handler(embed);
            return true;
        }
        return false;
    }

    public async handleHelpQueryAfterCommands(
        { bot, src, guildId }: CommandParameters<SpindaDiscordBot>,
        { query }: HelpArgs,
        embed: MessageEmbed,
    ) {
        const prefix = bot.dataService.getCachedGuild(guildId).prefix;
        // Query may be a guild-specific custom command
        const customCommands = await bot.dataService.getCustomCommands(src.guild.id);
        const customCommand = customCommands[query.toLowerCase()];
        if (customCommand) {
            embed.setTitle(this.customCommandString(customCommand, prefix));
            embed.addFields(
                { name: 'Description', value: customCommand.description },
                { name: 'Category', value: CommandCategory.Custom, inline: true },
                { name: 'Permission', value: CommandPermission[customCommand.permission].name, inline: true },
                {
                    name: 'Cooldown',
                    value: ExpireAgeConversion.toString(bot.customCommandService.cooldownTime),
                    inline: true,
                },
            );

            if (!(customCommand.flags & CustomCommandFlag.NoContent)) {
                embed.addFields({
                    name: 'Arguments',
                    value: `\`${customCommand.contentName}\` - ${customCommand.contentDescription}`,
                    inline: true,
                });
            }
            embed.addFields({ name: 'Code', value: `\`${CustomCommandEngine.addMetadata(customCommand)}\`` });
            return true;
        }
        return false;
    }
}
