import { VariableTimedCacheSet } from '../util/timed-cache';
import { Snowflake, User } from 'discord.js';
import { BaseService } from './base';

export class TimeoutService extends BaseService {
    public readonly timeoutCount: Map<Snowflake, number> = new Map();
    public readonly timeoutUsers: VariableTimedCacheSet<Snowflake> = new VariableTimedCacheSet();

    private getTimeoutDuration(offenses: number) {
        return 2 * offenses - 1;
    }

    public async timeout(user: User) {
        let offenses = this.timeoutCount.get(user.id) ?? 0;
        this.timeoutCount.set(user.id, ++offenses);
        const minutes = this.getTimeoutDuration(offenses);
        this.timeoutUsers.set(user.id, { minutes });
        await user.send(`You are being timed out for command spam. Your messages will be ignored for ${minutes} minute${minutes === 1 ? '' : 's'}.`);
    }

    public onTimeout(user: User): boolean {
        return this.timeoutUsers.has(user.id);
    }
}