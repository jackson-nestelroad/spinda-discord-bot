import { EmbedBuilder } from '@discordjs/builders';
import {
    ArgumentAutocompleteOption,
    BaseHelpService,
    BuiltInHelpHandlers,
    ExpireAgeConversion,
    HelpHandler,
    HelpHandlerMatcherReturnType,
    HelpServiceArgs,
    HelpServiceContext,
    PandaDiscordBot,
} from 'panda-discord';

import { CommandCategory, CommandPermission, SpindaDiscordBot } from '../bot';
import { CustomCommandEngine } from '../custom-commands/custom-command-engine';
import { CustomCommandData, CustomCommandFlag } from '../data/model/custom-command';

namespace CustomHelpHandlers {
    export class PandaHelpHandler extends HelpHandler {
        public autocompleteOptions(context: HelpServiceContext<PandaDiscordBot>): ArgumentAutocompleteOption[] {
            return [{ name: 'Panda', value: 'panda' }];
        }

        public async match(
            context: HelpServiceContext,
            { query }: HelpServiceArgs,
        ): Promise<HelpHandlerMatcherReturnType> {
            return 'panda'.localeCompare(query, undefined, { sensitivity: 'base' }) === 0;
        }

        public async run(context: HelpServiceContext, args: HelpServiceArgs, embed: EmbedBuilder): Promise<void> {
            embed.setTitle('Panda Command Framework');
            embed.setAuthor(null);
            embed.setDescription(
                `Spinda is built on Panda, an extensible framework for building bots with discord.js.
Panda provides a strongly-typed class-based structure for writing complex commands.

You can find out more at the [GitHub repository](https://github.com/jackson-nestelroad/panda-discord/).`,
            );
        }
    }

    export class CustomCommandCategoryHelpHandler extends HelpHandler<SpindaDiscordBot> {
        public autocompleteOptions({
            bot,
            guildId,
        }: HelpServiceContext<SpindaDiscordBot>): ArgumentAutocompleteOption[] {
            return [{ name: `${CommandCategory.Custom} Category`, value: CommandCategory.Custom }];
        }

        public async match(
            ontext: HelpServiceContext,
            { query }: HelpServiceArgs,
        ): Promise<HelpHandlerMatcherReturnType> {
            return CommandCategory.Custom.localeCompare(query, undefined, { sensitivity: 'base' }) === 0;
        }

        public async run(
            { bot, guildId }: HelpServiceContext<SpindaDiscordBot>,
            args: HelpServiceArgs,
            embed: EmbedBuilder,
        ): Promise<void> {
            // Query is the custom category.
            const guild = bot.client.guilds.cache.get(guildId);
            embed.setTitle(`${CommandCategory.Custom} Commands for ${guild.name}`);
            const customCommands = await bot.dataService.getCustomCommands(guildId);
            const guildPrefix = bot.dataService.getCachedGuild(guildId).prefix;
            const commandsString = Object.values(customCommands)
                .map(data => {
                    const prefix = (data.flags & CustomCommandFlag.EnableSlash) !== 0 ? '/' : guildPrefix;
                    return `\`${prefix}${data.name}\``;
                })
                .join(', ');
            embed.setDescription(commandsString || 'None!');
        }
    }

    export class CustomCommandHelpHandler extends HelpHandler<SpindaDiscordBot> {
        private customCommandString(data: CustomCommandData, prefix: string): string {
            let str = prefix + data.name;
            if (!(data.flags & CustomCommandFlag.NoContent)) {
                str +=
                    ' ' + (data.flags & CustomCommandFlag.ContentRequired ? data.contentName : `(${data.contentName})`);
            }
            return str;
        }

        private getPrefix(
            customCommand: CustomCommandData,
            { bot, guildId }: HelpServiceContext<SpindaDiscordBot>,
        ): string {
            return (customCommand.flags & CustomCommandFlag.EnableSlash) !== 0
                ? '/'
                : bot.dataService.getCachedGuild(guildId).prefix;
        }

        public autocompleteOptions(context: HelpServiceContext<SpindaDiscordBot>): ArgumentAutocompleteOption[] {
            const { bot, guildId } = context;
            const customCommands = bot.dataService.getCachedCustomCommands(guildId);
            if (!customCommands) {
                return [];
            }

            return Object.values(customCommands).map(data => ({
                name: `${this.getPrefix(data, context)}${data.name}`,
                value: data.name,
            }));
        }

        public async match(
            { bot, guildId }: HelpServiceContext<SpindaDiscordBot>,
            { query }: HelpServiceArgs,
        ): Promise<HelpHandlerMatcherReturnType> {
            const prefix = bot.dataService.getCachedGuild(guildId).prefix;
            if (query.startsWith('/')) {
                query = query.slice(1);
            } else if (query.startsWith(prefix)) {
                query = query.slice(prefix.length);
            }
            const customCommands = await bot.dataService.getCustomCommands(guildId);
            const customCommand = customCommands[query.toLowerCase()];
            return { matched: !!customCommand, matchedString: customCommand?.name };
        }

        public async run(
            context: HelpServiceContext<SpindaDiscordBot>,
            { query }: HelpServiceArgs,
            embed: EmbedBuilder,
        ): Promise<void> {
            // Query is a custom command.
            const { bot, guildId } = context;
            const customCommand = (await bot.dataService.getCustomCommands(guildId))[query];
            embed.setTitle(this.customCommandString(customCommand, this.getPrefix(customCommand, context)));
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
        }
    }
}

export class SpindaHelpService extends BaseHelpService {
    public handlers = [
        BuiltInHelpHandlers.BlankHelpHandler,
        CustomHelpHandlers.PandaHelpHandler,
        CustomHelpHandlers.CustomCommandCategoryHelpHandler,
        BuiltInHelpHandlers.CategoryHelpHandler,
        BuiltInHelpHandlers.CommandHelpHandler,
        CustomHelpHandlers.CustomCommandHelpHandler,
        BuiltInHelpHandlers.CatchAllHandler,
    ];
}
