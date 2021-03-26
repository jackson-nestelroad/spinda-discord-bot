import { NumberUtil } from '../number';
import { HSVColor } from './hsv';

enum RGBColorConstructor {
    RGB,
    Hex,
    HexAlpha,
}

interface RGBInterface {
    red: number;
    green: number;
    blue: number;
    alpha: number;
}

export class RGBColor implements RGBInterface {
    private r: number;
    private g: number;
    private b: number;
    private a: number = 0xFF;

    private _hex: number;

    private updateHex(pos: number, byte: number) {
        const shift = pos << 3;
        this._hex = this._hex & ~(0xFF << shift) | (byte << shift);
    }

    public get hex(): number {
        return this._hex;
    }

    public get red(): number {
        return this.r;
    }
    public set red(r: number) {
        if (r > 0xFF) {
            this.r = 0xFF;
        }
        else if (r < 0) {
            this.r = 0;
        }
        else {
            this.r = Math.round(r);
        }
        this.updateHex(2, r);
    }

    public get green(): number {
        return this.g;
    }
    public set green(g: number) {
        if (g > 0xFF) {
            this.g = 0xFF;
        }
        else if (g < 0) {
            this.g = 0;
        }
        else {
            this.g = Math.round(g);
        }
        this.updateHex(1, g);
    }

    public get blue(): number {
        return this.b;
    }
    public set blue(b: number) {
        if (b > 0xFF) {
            this.b = 0xFF;
        }
        else if (b < 0) {
            this.b = 0;
        }
        else {
            this.b = Math.round(b);
        }
        this.updateHex(0, b);
    }

    public get alpha(): number {
        return this.a;
    }
    public set alpha(a: number) {
        if (a > 0xFF) {
            this.a = 0xFF;
        }
        else if (a < 0) {
            this.a = 0;
        }
        else {
            this.a = Math.round(a);
        }
    }

    private constructor(call: RGBColorConstructor, ...args: number[]) {
        switch (call) {
            case RGBColorConstructor.RGB: {
                this.red = args[0];
                this.green = args[1];
                this.blue = args[2];

                if (args[3] !== undefined) {
                    this.alpha = args[3];
                }
        
                this._hex = (this.red << 16) + (this.green << 8) + this.blue;
            } break;
            case RGBColorConstructor.Hex: {
                this._hex = Math.round(args[0]);
                this.r = NumberUtil.getDoubleHexDigit(this.hex, 2);
                this.g = NumberUtil.getDoubleHexDigit(this.hex, 1);
                this.b = NumberUtil.getDoubleHexDigit(this.hex, 0);
            } break;
            case RGBColorConstructor.HexAlpha: {
                this._hex = Math.round(args[0]);
                this.r = NumberUtil.getDoubleHexDigit(this.hex, 3);
                this.g = NumberUtil.getDoubleHexDigit(this.hex, 2);
                this.b = NumberUtil.getDoubleHexDigit(this.hex, 1);
                this.a = NumberUtil.getDoubleHexDigit(this.hex, 0);
            }
        }
    }

    public rgb(): string {
        return `rgb(${this.red}, ${this.green}, ${this.blue})`;
    }

    public rgba(): string {
        return `rgba(${this.red}, ${this.green}, ${this.blue}, ${this.alpha / 0xFF})`;
    }

    public hexString(): string {
        const str = this.hex.toString(16).toUpperCase();
        return str.length < 6 ? '0'.repeat(6 - str.length) + str : str;
    }

    public toHSV(): HSVColor {
        const r = this.red / 0xFF;
        const g = this.green / 0xFF;
        const b = this.blue / 0xFF;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h: number, s: number, v = max;

        const d = max - min;
        s = max === 0 ? 0 : d / max;

        if (max === min) {
            h = 0;
        }
        else {
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }

            h /= 6;
        }

        return HSVColor.HSVA(h, s, v, this.alpha / 0xFF);
    }

    public static Hex(hex: number) {
        return new RGBColor(RGBColorConstructor.Hex, hex);
    }

    public static HexAlpha(hex: number) {
        return new RGBColor(RGBColorConstructor.HexAlpha, hex);
    }

    public static RGBA(r: number, g: number, b: number, a?: number) {
        return new RGBColor(RGBColorConstructor.RGB, r, g, b, a);
    }
}