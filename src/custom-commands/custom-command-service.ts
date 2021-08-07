import { Snowflake } from 'discord.js';
import { BaseService, EmbedTemplates, ExpireAge, TimedCache } from 'panda-discord';

import { SpindaDiscordBot } from '../bot';
import { CustomCommandEngine, CustomCommandEngineExecutionContext } from './custom-command-engine';

export class CustomCommandService extends BaseService<SpindaDiscordBot> {
    public readonly cooldownTime: ExpireAge = { seconds: 3 };
    private readonly cooldownSet: TimedCache<Snowflake, number> = new TimedCache(this.cooldownTime);

    public clearCooldowns(): void {
        this.cooldownSet.clear();
    }

    public async run(code: string, context: CustomCommandEngineExecutionContext) {
        if (await this.bot.handleCooldown(context.params.src, this.cooldownSet)) {
            const engine = new CustomCommandEngine(context);
            await engine.run(code);
        }
    }

    public async runUniversal(code: string, context: CustomCommandEngineExecutionContext) {
        const engine = new CustomCommandEngine(context);
        const results = await engine.runUniversal(code);
        const attachment = this.bot.createJSONAttachment(results, 'universal-results', context.params.src);
        const embed = this.bot.createEmbed(EmbedTemplates.Success);
        embed.setDescription(
            `Finished running universal command with ${results.errorCount} error${
                results.errorCount !== 1 ? 's' : ''
            }.`,
        );
        await context.params.src.send({ embeds: [embed], files: [attachment] });
    }
}
