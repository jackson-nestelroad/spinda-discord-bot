type Dictionary<T> = { [key: string]: T };
type ReadonlyDictionary<T> = { readonly[key: string]: T };

interface TimedCacheEntry<T> {
    lastFetched: Date;
    data: T;
}

type TimedCache<K, T> = Map<K, TimedCacheEntry<T>>;