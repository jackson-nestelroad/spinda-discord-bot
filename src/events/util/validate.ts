import { GuildMember } from 'discord.js';
import { DiscordBot } from '../../bot';
import { Command, CommandPermission } from '../../commands/lib/base';
import { Environment } from '../../data/environment';

export namespace Validation {
    export function validate(bot: DiscordBot, command: Command, member: GuildMember): boolean {
        switch (command.permission) {
            case CommandPermission.Owner: return isOwner(bot, member);
            case CommandPermission.Administrator: return isAdministrator(bot, member);
            case CommandPermission.Everyone:
            default: return true;
        }
    }

    function isOwner(bot: DiscordBot, member: GuildMember): boolean {
        return member.id === Environment.getGlobalOwner();
    }

    function isAdministrator(bot: DiscordBot, member: GuildMember): boolean {
        return member.hasPermission("ADMINISTRATOR");
    }
}