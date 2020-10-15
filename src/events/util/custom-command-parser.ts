import { Message, TextChannel } from 'discord.js';

export namespace CustomCommandParser {
    const parameterRegex = /\$(\d+)/g;
    const userRegex = /\{user\}/g;
    const serverRegex = /\{server\}/g;
    const channelRegex = /\{channel\}/g;

    export function parse(msg: Message, args: string[], response: string): string {
        // Replace all arguments
        let match = null;
        while ((match = parameterRegex.exec(response)) !== null) {
            const index = parseInt(match[1]);
            response = response.replace(match[0], args[index - 1]);
        }

        response = response.replace(userRegex, msg.author.username);
        response = response.replace(serverRegex, msg.guild.name);
        response = response.replace(channelRegex, (msg.channel as TextChannel).name || 'undefined');

        return response;
    }
}