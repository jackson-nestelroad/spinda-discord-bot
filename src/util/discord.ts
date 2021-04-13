import { User } from 'discord.js';
import { DiscordBot } from '../bot';

export namespace DiscordUtil {
    export const codeBlockRegex = /```(?:[^\s]*\n)?((?:.|\n)+)\n?```/s;
    export const codeLineRegex = /^(`{1,2})([^`]*)\1$/;
    export const userMentionRegex = /^<@!?(\d+)>$/;
    export const channelMentionRegex = /^<#(\d+)>$/;

    export const APIErrorMessages = {
        Access: 'Missing Access',
        Permissions: 'Missing Permissions',
    } as const;

    interface RegexMatchResult {
        match: boolean;
        index: number;
        content?: string;
    }

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
}