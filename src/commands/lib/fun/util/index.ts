import { Message } from 'discord.js';
import { DiscordBot } from '../../../../bot';

export namespace FunUtil {
    export async function addSuspense(bot: DiscordBot, msg: Message, content: string, iterations: number): Promise<Message> {
        let ellipses = '...';
        for (let i = 0; i < iterations; ++i) {
            await bot.wait(1000);
            content += ellipses;
            msg = await msg.edit(content);
            content += ' ';
        }
        await bot.wait(1500 * Math.random());
        return msg;
    }
}