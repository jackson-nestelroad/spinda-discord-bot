import { CommandSource } from 'panda-discord';

import { SpindaDiscordBot } from '../../../../bot';

export namespace FunUtil {
    export async function addSuspense(
        bot: SpindaDiscordBot,
        src: CommandSource,
        content: string,
        iterations: number,
    ): Promise<CommandSource> {
        let ellipses = '...';
        for (let i = 0; i < iterations; ++i) {
            await bot.wait(1000);
            content += ellipses;
            src = await src.edit(content);
            content += ' ';
        }
        await bot.wait(1500 * Math.random());
        return src;
    }
}
