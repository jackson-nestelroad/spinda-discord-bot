export namespace NumberUtil {
    export function mod(x: number, m: number): number {
        const r = x % m;
        return r < 0 ? r + m : r;
    }
}