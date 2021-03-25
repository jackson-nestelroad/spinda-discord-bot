import { NumberUtil } from '../../../../util/number';

enum ColorConstructor {
    RGB,
    Hex,
    HexAlpha,
}

export class Color {
    public readonly red: number;
    public readonly green: number;
    public readonly blue: number;
    public readonly alpha: number = 0xFF;
    public readonly hex: number;

    private constructor(call: ColorConstructor, ...args: number[]) {
        switch (call) {
            case ColorConstructor.RGB: {
                this.red = Math.min(args[0], 0xFF);
                this.red = Math.max(this.red, 0x00);
                this.green = Math.min(args[1], 0xFF);
                this.green = Math.max(this.green, 0x00);
                this.blue = Math.min(args[2], 0xFF);
                this.blue = Math.max(this.blue, 0x00);

                if (args[3] !== undefined) {
                    this.alpha = Math.min(args[3], 0xFF);
                    this.alpha = Math.max(this.alpha, 0x00);
                }
        
                this.hex = (this.red << 16) + (this.green << 8) + this.blue;
            } break;
            case ColorConstructor.Hex: {
                this.hex = args[0];
                this.red = NumberUtil.getDoubleHexDigit(this.hex, 2);
                this.green = NumberUtil.getDoubleHexDigit(this.hex, 1);
                this.blue = NumberUtil.getDoubleHexDigit(this.hex, 0);
            } break;
            case ColorConstructor.HexAlpha: {
                this.hex = args[0];
                this.red = NumberUtil.getDoubleHexDigit(this.hex, 3);
                this.green = NumberUtil.getDoubleHexDigit(this.hex, 2);
                this.blue = NumberUtil.getDoubleHexDigit(this.hex, 1);
                this.alpha = NumberUtil.getDoubleHexDigit(this.hex, 0);
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

    static Hex(hex: number) {
        return new Color(ColorConstructor.Hex, hex);
    }

    static HexAlpha(hex: number) {
        return new Color(ColorConstructor.HexAlpha, hex);
    }

    static RGB(r: number, g: number, b: number) {
        return new Color(ColorConstructor.RGB, r, g, b);
    }

    static RGBA(r: number, g: number, b: number, a: number) {
        return new Color(ColorConstructor.RGB, r, g, b, a);
    }
}