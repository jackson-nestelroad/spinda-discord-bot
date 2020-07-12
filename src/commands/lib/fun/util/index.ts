import { Message } from 'discord.js';

export namespace FunUtil {
    export async function wait(ms: number) {
        return new Promise(resolve => setTimeout(() => resolve(), ms));
    }

    export async function addSuspense(msg: Message, content: string, iterations: number): Promise<Message> {
        for (let i = 0; i < iterations; ++i) {
            await wait(1000);
            msg = await msg.edit(content + '... '.repeat(i + 1));
        }
        await wait(1500 * Math.random());
        return msg;
    }
}