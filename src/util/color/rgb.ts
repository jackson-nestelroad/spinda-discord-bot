import { Blender } from './blend';
import { HSVAColor } from './hsv';

enum RGBAColorConstructor {
    RGB,
    Hex,
    HexAlpha,
}

export interface RGBAInterface {
    red: number;
    green: number;
    blue: number;
    alpha: number;
}

const enum Shift {
    Red = 3 << 3,
    Green = 2 << 3,
    Blue = 1 << 3,
    Alpha = 0 << 3,
}

const enum Mask {
    Red = (0xff << Shift.Red) >>> 0,
    Green = (0xff << Shift.Green) >>> 0,
    Blue = (0xff << Shift.Blue) >>> 0,
    Alpha = (0xff << Shift.Alpha) >>> 0,
}

export class RGBAColor implements RGBAInterface {
    private value: number;

    public get hexAlpha(): number {
        return this.value;
    }
    public get hex(): number {
        return (this.value & ~Mask.Alpha) >>> 8;
    }

    public get red(): number {
        return (this.value >>> Shift.Red) & 0xff;
    }
    public set red(r: number) {
        this.value = ((this.value & ~Mask.Red) | ((r & 0xff) << Shift.Red)) >>> 0;
    }

    public get green(): number {
        return (this.value >>> Shift.Green) & 0xff;
    }
    public set green(g: number) {
        this.value = ((this.value & ~Mask.Green) | ((g & 0xff) << Shift.Green)) >>> 0;
    }

    public get blue(): number {
        return (this.value >>> Shift.Blue) & 0xff;
    }
    public set blue(b: number) {
        this.value = ((this.value & ~Mask.Blue) | ((b & 0xff) << Shift.Blue)) >>> 0;
    }

    public get alpha(): number {
        return (this.value >>> Shift.Alpha) & 0xff;
    }
    public set alpha(a: number) {
        this.value = ((this.value & ~Mask.Alpha) | ((a & 0xff) << Shift.Alpha)) >>> 0;
    }

    private constructor(call: RGBAColorConstructor, ...args: number[]) {
        switch (call) {
            case RGBAColorConstructor.RGB:
                {
                    const alpha =
                        args[3] === undefined || args[3] === null
                            ? 0xff
                            : args[3] < 1 && args[3] > 0
                            ? 0xff * args[3]
                            : args[3];

                    this.value =
                        (((args[0] & 0xff) << Shift.Red) |
                            ((args[1] & 0xff) << Shift.Green) |
                            ((args[2] & 0xff) << Shift.Blue) |
                            ((alpha & 0xff) << Shift.Alpha)) >>>
                        0;
                }
                break;
            case RGBAColorConstructor.Hex:
                {
                    this.value = Math.trunc((args[0] << 8) | 0xff) >>> 0;
                }
                break;
            case RGBAColorConstructor.HexAlpha:
                {
                    this.value = Math.trunc(args[0]) >>> 0;
                }
                break;
        }
    }

    public rgb(): `rgb(${number}, ${number}, ${number})` {
        return `rgb(${this.red}, ${this.green}, ${this.blue})` as `rgb(${number}, ${number}, ${number})`;
    }

    public rgba(): `rgba(${number}, ${number}, ${number}, ${number})` {
        return `rgba(${this.red}, ${this.green}, ${this.blue}, ${
            this.alpha / 0xff
        })` as `rgba(${number}, ${number}, ${number}, ${number})`;
    }

    public hexString(): `#${string}` {
        const str = this.hex.toString(16).toUpperCase();
        return ('#' + (str.length < 6 ? '0'.repeat(6 - str.length) + str : str)) as `#${string}`;
    }

    public blend(source: RGBAColor, options: Partial<Blender.Options> = {}): RGBAColor {
        const result = Blender.BlendTwoColors(this, source, options);
        return RGBAColor.RGBA(result.red, result.green, result.blue, result.alpha);
    }

    public toHSV(): HSVAColor {
        const r = this.red / 0xff;
        const g = this.green / 0xff;
        const b = this.blue / 0xff;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h: number,
            s: number,
            v = max;

        const d = max - min;
        s = max === 0 ? 0 : d / max;

        if (max === min) {
            h = 0;
        } else {
            switch (max) {
                case r:
                    h = (g - b) / d + (g < b ? 6 : 0);
                    break;
                case g:
                    h = (b - r) / d + 2;
                    break;
                case b:
                    h = (r - g) / d + 4;
                    break;
            }

            h /= 6;
        }

        return HSVAColor.HSVA(h, s, v, this.alpha / 0xff);
    }

    public static Hex(hex: number) {
        return new RGBAColor(RGBAColorConstructor.Hex, hex);
    }

    public static HexAlpha(hex: number) {
        return new RGBAColor(RGBAColorConstructor.HexAlpha, hex);
    }

    public static RGBA(r: number, g: number, b: number, a?: number) {
        return new RGBAColor(RGBAColorConstructor.RGB, r, g, b, a);
    }
}
