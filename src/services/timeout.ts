import { TimeoutService } from 'panda-discord';

export class SpindaTimeoutService extends TimeoutService {
    protected getTimeoutDuration(offenses: number): number {
        return 5 * (1 << (offenses - 1));
    }
}
