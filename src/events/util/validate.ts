import { GuildMember } from 'discord.js';
import { CommandPermission, CommandParameters, BaseCommand } from '../../commands/lib/base';
import { Environment } from '../../data/environment';

export namespace Validation {
    export class NotAllowedError extends Error { }
    
    export function validate(params: CommandParameters, command: BaseCommand, member: GuildMember): boolean {
        switch (command.permission) {
            case CommandPermission.Owner: return isOwner(member);
            case CommandPermission.Administrator: return isAdministrator(member);
            case CommandPermission.Everyone:
            default: return true;
        }
    }

    export function isOwner(member: GuildMember): boolean {
        return member.id === Environment.getGlobalOwner();
    }

    export function isAdministrator(member: GuildMember): boolean {
        return member.permissions.has("ADMINISTRATOR");
    }
}