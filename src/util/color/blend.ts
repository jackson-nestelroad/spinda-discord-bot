import { RGBAInterface } from './rgb';

export enum BlendMode {
    Normal,
    Lighten,
    Darken,
    Multiply,
    Average,
    Additive,
    Subtract,
    Difference,
    Negation,
    Exclusion,
    Screen,
    Overlay,
    SoftLight,
    HardLight,
    ColorDodge,
    ColorBurn,
    LinearDodge,
    LinearBurn,
    LinearLight,
    VividLight,
    PinLight,
    HardMix,
    Reflect,
    Glow,
    Phoenix,
    Xor,
}

export enum AlphaMode {
    Clear,
    Source,
    Destination,
    SourceOver,
    DestinationOver,
    SourceIn,
    DestinationIn,
    SourceOut,
    DestinationOut,
    SourceAtop,
    DestinationAtop,
    Xor,
    Add,
}

export type BlendFunction = (backdrop: number, source: number) => number;
export type AlphaFunction = (source: number, destination: number) =>[number, number];

const int = Math.trunc;

// export const Div255 = (val: number) => (val + 1 + (val >>> 8)) >>> 8;
// export const Div255 = (val: number) => val >>> 8;
// export const Div255 = (val: number) => Math.round(val / 255);
// const Div255 = (val: number) => ((val >>> 8) + val + 0x80) >>> 8;

// Multiples two integers from 0-255 and divides them by 255
const MulDiv255 = (a: number, b: number) => {
    const c = a * b + 0x80;
    return ((c >>> 8) + c) >>> 8;
}

// See https://stackoverflow.com/questions/5919663/how-does-photoshop-blend-two-images-together
// See http://www.pegtop.net/delphi/articles/blendmodes/
// b is over a
export const BlendTransformations: { [blend in BlendMode]: BlendFunction } = {
    [BlendMode.Normal]: (b, s) => s,
    [BlendMode.Lighten]: (b, s) => Math.max(b, s),
    [BlendMode.Darken]: (b, s) => Math.min(b, s),
    [BlendMode.Multiply]: (b, s) => MulDiv255(b, s),
    [BlendMode.Average]: (b, s) => (b + s) >>> 1,
    [BlendMode.Additive]: (b, s) => Math.min(255, b + s),
    [BlendMode.Subtract]: (b, s) => Math.max(0, b + s - 255),
    [BlendMode.Difference]: (b, s) => Math.abs(b - s),
    [BlendMode.Negation]: (b, s) => 255 - Math.abs(255 - b - s),
    [BlendMode.Exclusion]: (b, s) => b + s - (MulDiv255(b, s) << 1),
    [BlendMode.Screen]: (b, s) => 255 - MulDiv255((255 - b), (255 - s)),
    [BlendMode.Overlay]: (b, s) => b < 128 ? (MulDiv255(b, s) << 1) : 255 - (MulDiv255(255 - b, 255 - s) << 1),
    [BlendMode.SoftLight]: (b, s) => {
        const c = MulDiv255(b, s);
        return c + MulDiv255(b, 255 - MulDiv255(255 - b, 255 - s) - c);
    },
    [BlendMode.HardLight]: (b, s) => BlendTransformations[BlendMode.Overlay](s, b),
    [BlendMode.ColorDodge]: (b, s) => s === 255 ? s : Math.min(255, int((b << 8) / (255 - s))),
    [BlendMode.ColorBurn]: (b, s) => s === 0 ? s : Math.max(0, int(255 - (((255 - b) << 8) / s))),
    [BlendMode.LinearDodge]: (b, s) => BlendTransformations[BlendMode.Additive](b, s),
    [BlendMode.LinearBurn]: (b, s) => BlendTransformations[BlendMode.Subtract](b, s),
    [BlendMode.LinearLight]: (b, s) => s < 128 ? BlendTransformations[BlendMode.LinearBurn](b, s << 1) : BlendTransformations[BlendMode.LinearDodge](b, (s - 128) << 1),
    [BlendMode.VividLight]: (b, s) => s < 128 ? BlendTransformations[BlendMode.ColorBurn](b, s << 1) : BlendTransformations[BlendMode.ColorDodge](b, (s - 128) << 1),
    [BlendMode.PinLight]: (b, s) => s < 128 ? BlendTransformations[BlendMode.Darken](b, s << 1) : BlendTransformations[BlendMode.Lighten](b, (s - 128) << 1),
    [BlendMode.HardMix]: (b, s) => BlendTransformations[BlendMode.VividLight](b, s) < 128 ? 0 : 255,
    [BlendMode.Reflect]: (b, s) => s === 255 ? b : Math.min(255, int((b * b) / (255 - s))),
    [BlendMode.Glow]: (b, s) => BlendTransformations[BlendMode.Reflect](s, b),
    [BlendMode.Phoenix]: (b, s) => Math.min(b, s) - Math.max(b, s) + 255,
    [BlendMode.Xor]: (b, s) => b ^ s,
} as const;

// See https://graphics.pixar.com/lisrary/Compositing/paper.pdf
export const AlphaTransformations: { [alpha in AlphaMode]: AlphaFunction } = {
    [AlphaMode.Clear]: (s, d) => [0, 0],
    [AlphaMode.Source]: (s, d) => [255, 0],
    [AlphaMode.Destination]: (s, d) => [0, 255],
    [AlphaMode.SourceOver]: (s, d) => [255, 255 - s],
    [AlphaMode.DestinationOver]: (s, d) => [255 - d, 255],
    [AlphaMode.SourceIn]: (s, d) => [d, 0],
    [AlphaMode.DestinationIn]: (s, d) => [0, s],
    [AlphaMode.SourceOut]: (s, d) => [255 - d, 0],
    [AlphaMode.DestinationOut]: (s, d) => [0, 255 - s],
    [AlphaMode.SourceAtop]: (s, d) => [d, 1 - s],
    [AlphaMode.DestinationAtop]: (s, d) => [1 - d, s],
    [AlphaMode.Xor]: (s, d) => [1 - d, 1 - s],
    [AlphaMode.Add]: (s, d) => [1, 1],
}
export namespace Blender {
    export interface Options {
        blendMode: BlendMode;
        alphaMode: AlphaMode;
        opacity: number;
    }

    export interface Layer extends Options {
        color: RGBAInterface;
    };
    
    const DefaultBlendOptions: Options = {
        blendMode: BlendMode.Normal,
        alphaMode: AlphaMode.DestinationOver,
        opacity: 0xFF,
    };

    function BlendByte(Cb: number, Ab: number, Fa: number, Cs: number, As: number, Fb: number, f: BlendFunction, Ar: number) {
        // Cb = backdrop color
        // Ab = backdrop alpha
        // Cs = source color
        // As = source alpha
        // Fa, Fb = PorterDuff alpha composite coefficients
        // f = blend function
    
        // Cr = result color
        // Cr = 255 * (((Ab * Fa * Cb) + As * (Fb * Cb + f(Cb, Cs) - Cb)) / Ar)
        return int(255 * ((MulDiv255(Ab, MulDiv255(Fa, Cb)) + MulDiv255(As, MulDiv255(Fb, Cb) + f(Cb, Cs) - Cb)) / Ar));
    }

    function BlendTwoColorsInternal(backdrop: Readonly<RGBAInterface>, source: Readonly<RGBAInterface>, options: Options): RGBAInterface {
        const c = AlphaTransformations[options.alphaMode];
    
        // Calculate effective source alpha
        // As = As * opacity
        const As = MulDiv255(source.alpha, options.opacity);
        const Ab = backdrop.alpha;
    
        // Get Porter/Duff alpha composite coefficients
        const [Fa, Fb] = c(Ab, As);
    
        // Calculate result alpha
        const Ar = MulDiv255(Fa, backdrop.alpha) + MulDiv255(Fb, As);
    
        // Blend each color component
        const f = BlendTransformations[options.blendMode];
        const Rr = BlendByte(backdrop.red, Ab, Fa, source.red, As, Fb, f, Ar);
        const Gr = BlendByte(backdrop.green, Ab, Fa, source.green, As, Fb, f, Ar);
        const Br = BlendByte(backdrop.blue, Ab, Fa, source.blue, As, Fb, f, Ar);
    
        return {
            red: Rr,
            green: Gr,
            blue: Br,
            alpha: Ar,
        }
    }

    function AddDefaultOptions(options: Partial<Options>): Options {
        const result: Partial<Options> = { };
        for (const key in DefaultBlendOptions) {
            result[key] = options[key] ?? DefaultBlendOptions[key];
        }
        return result as Options;
    }

    export function BlendTwoColors(backdrop: Readonly<RGBAInterface>, source: Readonly<RGBAInterface>, options: Partial<Options> = { }): RGBAInterface {
        return BlendTwoColorsInternal(backdrop, source, AddDefaultOptions(options));
    }

    export function MakeLayer(color: RGBAInterface, options: Partial<Options> = { }): Layer {
        return {
            color,
            ...AddDefaultOptions(options),
        };
    }

    export function Blend(layers: Array<Layer>): Layer {
        if (layers.length === 0) {
            return null;
        }
        if (layers.length === 1) {
            return layers[0];
        }

        const mergedLayer = { ...layers[0] };
        let backdrop = mergedLayer.color;
        for (let i = 1; i < layers.length; ++i) {
            const source = layers[i];
            backdrop = BlendTwoColors(backdrop, source.color, source);
        }
        mergedLayer.color = backdrop;
        return mergedLayer;
    }

    export function BlendColors(colors: Array<RGBAInterface>, options: Partial<Options> = { }): RGBAInterface {
        if (colors.length === 0) {
            return null;
        }
        if (colors.length === 1) {
            return colors[0];
        }

        const fullOptions = AddDefaultOptions(options);
        let backdrop = colors[0];
        for (let i = 1; i < colors.length; ++i) {
            const source = colors[i];
            backdrop = BlendTwoColors(backdrop, source, fullOptions);
        }
        return backdrop;
    }
}