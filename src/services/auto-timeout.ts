import { Snowflake, User } from 'discord.js';
import { BaseService } from 'panda-discord';

import { SpindaDiscordBot } from '../bot';

export class AutoTimeoutService extends BaseService<SpindaDiscordBot> {
    private consecutiveErrors: Map<Snowflake, number> = new Map();

    constructor(private errorsToTimeoutAt: number, bot: SpindaDiscordBot) {
        super(bot);
        if (this.errorsToTimeoutAt <= 0) {
            throw new Error(`Number of consecutive errors to timeout user for must be positive.`);
        }
    }

    public async addError(user: User): Promise<void> {
        // Disabling this until Spinda can DM users again.
        return;
        const previousErrors = this.consecutiveErrors.get(user.id) ?? 0;
        const errors = previousErrors + 1;
        if (errors === this.errorsToTimeoutAt) {
            await this.bot.timeoutService.timeout(
                user,
                `Caused commands to error out ${errors} time${errors === 1 ? '' : 's'} in a row.`,
            );
            this.consecutiveErrors.delete(user.id);
            return;
        }
        this.consecutiveErrors.set(user.id, errors);
    }

    public clearErrors(user: User): void {
        this.consecutiveErrors.delete(user.id);
    }
}
