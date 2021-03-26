import { HSVColor } from './hsv';
import { RGBColor } from './rgb';

export * from './hsv';
export * from './rgb';

export namespace Color {
    export function Hex(hex: number) {
        return RGBColor.Hex(hex);
    }

    export function HexAlpha(hex: number) {
        return RGBColor.HexAlpha(hex);
    }

    export function RGB(r: number, g: number, b: number) {
        return RGBColor.RGBA(r, g, b);
    }

    export function RGBA(r: number, g: number, b: number, a: number) {
        return RGBColor.RGBA(r, g, b, a);
    }

    export function HSV(h: number, s: number, v: number) {
        return HSVColor.HSVA(h, s, v);
    }

    export function HSVA(h: number, s: number, v: number, a?: number) {
        return HSVColor.HSVA(h, s, v, a);
    }
}