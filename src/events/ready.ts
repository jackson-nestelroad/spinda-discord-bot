import { BaseEvent } from './base';
import { DiscordBot } from '../bot';
import { DiscordUtil } from '../util/discord';
import { ApplicationCommandManager } from 'discord.js';

const event = 'ready';

export class ReadyEvent extends BaseEvent<typeof event> {
    constructor(bot: DiscordBot) {
        super(bot, event);
    }

    public async run() {
        console.log(`Bot is logged in as ${this.bot.client.user.tag}`);
        this.bot.client.user.setActivity(`@${this.bot.name} help`, { 
            type: 'PLAYING',
        }); 

        // Create all global commands 
        await this.bot.client.application.commands.fetch();

        for (const [name, cmd] of this.bot.commands) {
            if (cmd.isSlashCommand) {
                const newData = cmd.commandData();

                // Get proper command manager this command would belong to
                let cmdManager: ApplicationCommandManager;
                if (cmd.slashGuildId) {
                    const cmdGuild = this.bot.client.guilds.cache.get(cmd.slashGuildId);
                    if (cmdGuild.commands.cache.size === 0) {
                        await cmdGuild.commands.fetch();
                    }
                    cmdManager = cmdGuild.commands;
                }
                else {
                    cmdManager = this.bot.client.application.commands;
                }

                // Check if command already exists
                // If so, check if it has been updated in any way
                const old = cmdManager.cache.find(cmd => cmd.name === name);
                if (old) {
                    if (DiscordUtil.slashCommandNeedsUpdate(old, newData)) {
                        cmdManager.edit(old, newData);
                    }
                }
                else {
                    cmdManager.create(newData);
                }
            }
        }

        this.bot.enableSlashCommands();
    }
}