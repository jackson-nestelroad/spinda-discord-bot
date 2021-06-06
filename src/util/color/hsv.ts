import { RGBAColor } from './rgb';

interface HSVAInterface {
    hue: number;
    saturation: number;
    value: number;
    alpha: number;  
}

export class HSVAColor implements HSVAInterface {
    private h: number;
    private s: number;
    private v: number;
    private a: number;

    public get hue(): number {
        return this.h;
    }
    public set hue(h: number) {
        if (h > 1) {
            this.h = h % 1
        }
        else if (h < 0) {
            this.h = 1 - h % 1;
        }
        else {
            this.h = h;
        }
    }

    public get saturation(): number {
        return this.s;
    }
    public set saturation(s: number) {
        if (s > 1) {
            this.s = 1;
        }
        else if (s < 0) {
            this.s = 0;
        }
        else {
            this.s = s;
        }
    }

    public get value(): number {
        return this.v;
    }
    public set value(v: number) {
        if (v > 1) {
            this.v = 1;
        }
        else if (v < 0) {
            this.v = 0;
        }
        else {
            this.v = v;
        }
    }

    public get alpha(): number {
        return this.a;
    }
    public set alpha(a: number) {
        if (a > 1) {
            this.a = 1;
        }
        else if (a < 0) {
            this.a = 0;
        }
        else {
            this.a = a;
        }
    }

    private constructor(
        hue: number,
        saturation: number,
        value: number,
        alpha: number = 1,
    ) { 
        this.hue = hue;
        this.saturation = saturation;
        this.value = value;
        this.alpha = alpha;
    }

    public integer(): HSVAInterface {
        return {
            hue: Math.round(this.hue * 360),
            saturation: Math.round(this.saturation * 100),
            value: Math.round(this.value * 100),
            alpha: Math.round(this.alpha * 100),
        }
    }

    public toRGB(): RGBAColor {
        let r: number, g: number, b: number;

        const i = Math.floor(this.hue * 6);
        const f = this.hue * 6 - i;
        const p = this.value * (1 - this.saturation);
        const q = this.value * (1 - f * this.saturation);
        const t = this.value * (1 - (1 - f) * this.saturation);
        
        switch (i % 6) {
            case 0: r = this.value, g = t, b = p; break;
            case 1: r = q, g = this.value, b = p; break;
            case 2: r = p, g = this.value, b = t; break;
            case 3: r = p, g = q, b = this.value; break;
            case 4: r = t, g = p, b = this.value; break;
            case 5: r = this.value, g = p, b = q; break;
        }
        
        return RGBAColor.RGBA(
            Math.round(r * 0xFF),
            Math.round(g * 0xFF),
            Math.round(b * 0xFF),
            Math.round(this.alpha * 0xFF),
        );
    }

    public static HSVA(h: number, s: number, v: number, a?: number) {
        return new HSVAColor(h, s, v, a);
    }
}