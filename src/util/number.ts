export namespace NumberUtil {
    export function mod(x: number, m: number): number {
        const r = x % m;
        return r < 0 ? r + m : r;
    }

    export function getSingleHexDigit(hex: number, digit: number): number {
        return (hex >> (digit << 2)) & 0xf;
    }

    export function getDoubleHexDigit(hex: number, digit: number): number {
        return (hex >> (digit << 3)) & 0xff;
    }
}
