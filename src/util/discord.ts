import { ApplicationCommandOptionType } from 'discord-api-types';
import { ApplicationCommand, ApplicationCommandData } from 'discord.js';

export namespace DiscordUtil {
    export const codeBlockRegex = /```(?:[^\s]*\n)?((?:.|\n)+)\n?```/s;
    export const codeLineRegex = /^(`{1,2})([^`]*)\1$/;
    export const userMentionRegex = /^<@!?(\d+)>$/;
    export const channelMentionRegex = /^<#(\d+)>$/;
    export const roleMentionRegex = /^<@&(\d+)>$/;

    export const APIErrorMessages = {
        Access: 'Missing Access',
        Permissions: 'Missing Permissions',
    } as const;

    interface RegexMatchResult {
        match: boolean;
        index: number;
        content?: string;
    }

    export const ApplicationCommandOptionTypeConverter = {
        ['SUB_COMMAND']: ApplicationCommandOptionType.SUB_COMMAND,
        ['SUB_COMMAND_GROUP']: ApplicationCommandOptionType.SUB_COMMAND_GROUP,
        ['STRING']: ApplicationCommandOptionType.STRING,
        ['INTEGER']: ApplicationCommandOptionType.INTEGER,
        ['BOOLEAN']: ApplicationCommandOptionType.BOOLEAN,
        ['USER']: ApplicationCommandOptionType.USER,
        ['CHANNEL']: ApplicationCommandOptionType.CHANNEL,
        ['ROLE']: ApplicationCommandOptionType.ROLE,
        ['MENTIONABLE']: ApplicationCommandOptionType.MENTIONABLE,
    } as const;

    export function getCodeBlock(content: string): RegexMatchResult {
        const result: RegexMatchResult = { match: false, index: 0 };
        const match = codeBlockRegex.exec(content);
        if (match) {
            result.match = true;
            result.index = match.index;
            result.content = match[1];
        }
        return result;
    }

    export function getCodeLine(content: string): RegexMatchResult {
        const result: RegexMatchResult = { match: false, index: 0 };
        const match = codeLineRegex.exec(content);
        if (match) {
            result.match = true;
            result.content = match[2];
        }
        return result;
    }

    export function getCodeBlockOrLine(content: string): string | null {
        const codeBlock = DiscordUtil.getCodeBlock(content);
        if (codeBlock.match) {
            return codeBlock.content;
        }
        else {
            const codeLine = DiscordUtil.getCodeLine(content);
            if (codeLine.match) {
                return codeLine.content;
            }
        }
        return null;
    }

    export function baseStringEqual(a: string, b: string): boolean {
        return a.localeCompare(b, undefined, { sensitivity: 'base' }) === 0;
    }

    export function accentStringEqual(a: string, b: string): boolean {
        return a.localeCompare(b, undefined, { sensitivity: 'accent' }) === 0;
    }

    function deepEqual(a: object, b: object): boolean {
        if (a && b && typeof a === 'object' && typeof b === 'object') {
            if (Object.keys(a).length !== Object.keys(b).length) {
                return false;
            }
            for (const key in a) {
                if (!deepEqual(a[key], b[key])) {
                    return false;
                }
            }
            return true;
        }
        else {
            return a === b;
        }
    }

    export function slashCommandNeedsUpdate(old: ApplicationCommand, newData: ApplicationCommandData): boolean {
        // First check description and options length
        let needsUpdate = old.description !== newData.description;
        needsUpdate ||= old.options.length !== (newData.options?.length ?? 0);

        // Options lengths are the same, so check every option
        for (let i = 0; !needsUpdate && i < old.options.length; ++i) {
            const a = old.options[i];
            const b = newData.options[i];
            
            // Check base fields
            needsUpdate ||= a.name !== b.name
                || a.description !== b.description
                || !!a.required !== !!b.required

            // Old command stores a string, new data stores an integer
            // This is a strange inconsistency
                || ApplicationCommandOptionTypeConverter[a.type] !== b.type

            // Compare the choices and nested options themselves
                || !deepEqual(a.choices ?? [], b.choices ?? [])
                || !deepEqual(a.options ?? [], b.options ?? []);
        }
        return needsUpdate;
    }
}