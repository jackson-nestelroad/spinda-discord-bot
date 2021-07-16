import { BaseEvent } from './base';
import { DiscordBot } from '../bot';
import { DiscordUtil } from '../util/discord';
import { ApplicationCommandManager, GuildApplicationCommandManager } from 'discord.js';
import { BaseCommand } from '../commands/lib/base';

const event = 'ready';

export class ReadyEvent extends BaseEvent<typeof event> {
    constructor(bot: DiscordBot) {
        super(bot, event);
    }

    // Get the proper command manager this command would belong to
    private async getCommandManager(cmd: BaseCommand): Promise<GuildApplicationCommandManager | ApplicationCommandManager> {
        if (cmd.slashGuildId) {
            const cmdGuild = this.bot.client.guilds.cache.get(cmd.slashGuildId);
            if (cmdGuild.commands.cache.size === 0) {
                await cmdGuild.commands.fetch();
            }
            return cmdGuild.commands;
        }
        else {
            return this.bot.client.application.commands;
        }
    }

    public async run() {
        console.log(`Bot is logged in as ${this.bot.client.user.tag}.`);
        this.bot.client.user.setActivity(`@${this.bot.name} help`, { 
            type: 'PLAYING',
        }); 

        // Create all global commands 
        await this.bot.client.application.commands.fetch();

        for (const [name, cmd] of this.bot.commands) {
            if (cmd.isSlashCommand) {
                const newData = cmd.commandData();
                const cmdManager = await this.getCommandManager(cmd);

                // Check if command already exists
                // If so, check if it has been updated in any way
                const old = cmdManager.cache.find(cmd => cmd.name === name);
                if (old) {
                    if (DiscordUtil.slashCommandNeedsUpdate(old, newData)) {
                        console.log(`Updating slash command "${name}"`);
                        await cmdManager.edit(old, newData);
                    }
                }
                else {
                    console.log(`Creating slash command "${cmd}"`);
                    await cmdManager.create(newData);
                }
            }
            else {
                // Remove command if it exists when it should not
                const cmdManager = await this.getCommandManager(cmd);
                const old = cmdManager.cache.find(cmd => cmd.name === name);
                if (old) {
                    console.log(`Deleting slash command "${cmd}"`);
                    await cmdManager.delete(old);
                }
            }
        }

        this.bot.enableSlashCommands();
    }
}