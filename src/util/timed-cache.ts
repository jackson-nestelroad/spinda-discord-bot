export interface TimedCacheEntry<T> {
    expireAt: number;
    data: T;
}

export interface ExpireAgeFormat {
    hours?: number;
    minutes?: number;
    seconds?: number;
    milliseconds?: number;
}

export type ExpireAge = number | ExpireAgeFormat;

export namespace ExpireAgeConversion {
    export function toMilliseconds(time: ExpireAge): number {
        if (typeof time === 'number') {
            return time;
        }
        else {
            let value = 0;
            if (time.hours) {
                value += time.hours * 60 * 60 * 1000;
            }
            if (time.minutes) {
                value += time.minutes * 60 * 1000;
            }
            if (time.seconds) {
                value += time.seconds * 1000;
            }
            if (time.milliseconds) {
                value += time.milliseconds;
            }
            return value;
        }
    }

    export function toExpireAgeFormat(time: number): ExpireAgeFormat {
        const format: ExpireAgeFormat = { };
        if (time >= 3600000) {
            format.hours = Math.floor(time / 3600000);
            time %= 3600000;
        }
        if (time >= 60000) {
            format.minutes = Math.floor(time / 60000);
            time %= 60000;
        }
        if (time >= 1000) {
            format.seconds = Math.floor(time / 1000);
            time %= 1000;
        }
        if (time !== 0) {
            format.milliseconds = time;
        }
        return format;
    }
    
    export function toString(time: ExpireAge): string {
        if (typeof time === 'number') {
            return toString(toExpireAgeFormat(time));
        }
        else {
            const values: string[] = [];
            if (time.hours) {
                values.push(`${time.hours} hour${time.hours !== 1 ? 's' : ''}`);
            }
            if (time.minutes) {
                values.push(`${time.minutes} minute${time.minutes !== 1 ? 's' : ''}`);
            }
            if (time.seconds) {
                values.push(`${time.seconds} second${time.seconds !== 1 ? 's' : ''}`);
            }
            if (time.milliseconds) {
                values.push(`${time.milliseconds} millisecond${time.milliseconds !== 1 ? 's' : ''}`);
            }
            return values.join(', ');
        }
    }
}

class BaseTimedCache<K, T> {
    protected readonly cache: Map<K, TimedCacheEntry<T>> = new Map();

    public has(key: K): boolean {
        if (this.cache.has(key)) {
            const entry = this.cache.get(key);
            if (new Date().valueOf() >= entry.expireAt) {
                return false;
            }
            return true;
        }
        return false;
    }

    public get(key: K): T | undefined {
        if (this.cache.has(key)) {
            const entry = this.cache.get(key);
            if (new Date().valueOf() >= entry.expireAt) {
                return undefined;
            }
            return entry.data;
        }
        return undefined;
    }

    public clear(): void {
        this.cache.clear();
    }
}

export class TimedCache<K, T> extends BaseTimedCache<K, T> {
    public readonly expireAge: number;

    constructor(
        expireAge: number | ExpireAgeFormat,
    ) {
        super();
        this.expireAge = ExpireAgeConversion.toMilliseconds(expireAge);
    }

    public set(key: K, value: T): void {
        this.cache.set(key, { expireAt: new Date().valueOf() + this.expireAge, data: value });
    }

    public update(key: K, value: T): void {
        if (this.cache.has(key)) {
            const entry = this.cache.get(key);
            entry.data = value;
        }
    }
}

export class TimedCacheSet<T> extends BaseTimedCache<T, T> {
    private readonly expireAge: number;

    constructor(
        expireAge: number | ExpireAgeFormat,
    ) {
        super();
        this.expireAge = ExpireAgeConversion.toMilliseconds(expireAge);

        if (this.expireAge < 0) {
            this.expireAge = Infinity;
        }
    }

    public add(value: T): void {
        this.cache.set(value, { expireAt: new Date().valueOf() + this.expireAge, data: value });
    }
}

export class VariableTimedCache<K, T> extends BaseTimedCache<K, T> {
    public set(key: K, value: T, expireAge: ExpireAge): void {
        this.cache.set(key, { expireAt: new Date().valueOf() + ExpireAgeConversion.toMilliseconds(expireAge), data: value });
    }

    public update(key: K, value: T): void {
        if (this.cache.has(key)) {
            const entry = this.cache.get(key);
            entry.data = value;
        }
    }
}

export class VariableTimedCacheSet<T> extends BaseTimedCache<T, T> {
    public set(value: T, expireAge: ExpireAge): void {
        this.cache.set(value, { expireAt: new Date().valueOf() + ExpireAgeConversion.toMilliseconds(expireAge), data: value });
    }
}