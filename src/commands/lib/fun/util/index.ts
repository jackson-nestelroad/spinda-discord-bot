import { Message } from 'discord.js';

export namespace FunUtil {
    export async function wait(ms: number) {
        return new Promise(resolve => setTimeout(() => resolve(), ms));
    }

    export async function addSuspense(msg: Message, content: string, iterations: number): Promise<Message> {
        let ellipses = '...';
        for (let i = 0; i < iterations; ++i) {
            await wait(1000);
            content += ellipses;
            msg = await msg.edit(content);
            content += ' ';
        }
        await wait(1500 * Math.random());
        return msg;
    }
}