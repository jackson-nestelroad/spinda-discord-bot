import { HSVAColor } from './hsv';
import { RGBAColor } from './rgb';

export { HSVAColor } from './hsv';
export { RGBAInterface, RGBAColor } from './rgb';
export * from './blend';

export namespace Color {
    export function Hex(hex: number) {
        return RGBAColor.Hex(hex);
    }

    export function HexAlpha(hex: number) {
        return RGBAColor.HexAlpha(hex);
    }

    export function RGB(r: number, g: number, b: number) {
        return RGBAColor.RGBA(r, g, b);
    }

    export function RGBA(r: number, g: number, b: number, a: number) {
        return RGBAColor.RGBA(r, g, b, a);
    }

    export function HSV(h: number, s: number, v: number) {
        return HSVAColor.HSVA(h, s, v);
    }

    export function HSVA(h: number, s: number, v: number, a?: number) {
        return HSVAColor.HSVA(h, s, v, a);
    }
}
