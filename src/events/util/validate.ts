import { GuildMember } from 'discord.js';
import { Command, CommandPermission, CommandParameters } from '../../commands/lib/base';
import { Environment } from '../../data/environment';

export namespace Validation {
    export class NotAllowedError extends Error { }
    
    export function validate(params: CommandParameters, command: Command, member: GuildMember): boolean {
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