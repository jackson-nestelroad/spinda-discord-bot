import { User } from 'discord.js';
import { DiscordBot } from '../bot';

export namespace DiscordUtil {
    export const codeBlockRegex = /```[^\s]*\n(.*)\n```/s;
    export const codeLineRegex = /^(`{1,2})([^`]*)\1$/;
    export const userMentionRegex = /^<@!?(\d+)>$/;

    export const APIErrorMessages = {
        Access: 'Missing Access',
        Permissions: 'Missing Permissions',
    } as const;

    interface RegexMatchResult {
        match: boolean;
        content?: string;
    }

    export function getCodeBlock(content: string): RegexMatchResult {
        const result: RegexMatchResult = { match: false };
        const match = codeBlockRegex.exec(content);
        if (match) {
            result.match = true;
            result.content = match[1];
        }
        return result;
    }

    export function getCodeLine(content: string): RegexMatchResult {
        const result: RegexMatchResult = { match: false };
        const match = codeLineRegex.exec(content);
        if (match) {
            result.match = true;
            result.content = match[2];
        }
        return result;
    }
}