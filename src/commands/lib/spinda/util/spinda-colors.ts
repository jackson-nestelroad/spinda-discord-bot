import { GeneratedSpinda, SpindaColorChange } from '../../../../data/model/caught-spinda';
import { Color, RGBAColor } from '../../../../util/color';

export interface SpindaColorPalette {
    readonly base: RGBAColor;
    readonly shadow: RGBAColor;
    readonly outline: RGBAColor;
}

export type ColorPositionGetter = (x: number, y: number) => RGBAColor;
type ColorPositionGetterGenerator = (spinda: GeneratedSpinda) => ColorPositionGetter;

export const ShaderConstants = {
    ShadowMultiplier: 0.7093,
    OutlineMultiplier: 0.5,
} as const;

export const SpindaColorPalettes = {
    base: {
        base: Color.Hex(0xFFDBAA),
        shadow: Color.Hex(0xBCA193),
        outline: Color.Hex(0x6B5C65),
    },
    normal: {
        base: Color.Hex(0xF75D5D),
        shadow: Color.Hex(0xB54459),
        outline: Color.Hex(0x682742),
    },
    black: Color.Hex(0x000000),
    white: Color.Hex(0xFFFFFF),
    shadowMask: Color.RGBA(0, 0, 50, 1 - ShaderConstants.ShadowMultiplier),
    outlineMask: Color.RGBA(0, 0, 50, 1 - ShaderConstants.ShadowMultiplier * ShaderConstants.OutlineMultiplier),
    transparent: Color.HexAlpha(0x00000000),
} as const;

// No longer used, but kept here for reference.
const SpindaColorChangePalettes: { readonly[key in SpindaColorChange]?: SpindaColorPalette } = {
    [SpindaColorChange.None]: SpindaColorPalettes.normal,
    [SpindaColorChange.Shiny]: {
        base: Color.Hex(0xACC44E),
        shadow: Color.Hex(0x798955),
        outline: Color.Hex(0x454E4F),
    },
    [SpindaColorChange.Retro]: {
        base: Color.Hex(0xEA8356),
        shadow: Color.Hex(0xA55C5C),
        outline: Color.Hex(0x5B334F),
    },
    [SpindaColorChange.Gold]: {
        base: Color.Hex(0xF7BD1D),
        shadow: Color.Hex(0xB58A36),
        outline: Color.Hex(0x725742),
    },
    [SpindaColorChange.Green]: {
        base: Color.Hex(0x52A55B),
        shadow: Color.Hex(0x366D58),
        outline: Color.Hex(0x1C3852),
    },
    [SpindaColorChange.Blue]: {
        base: Color.Hex(0x40B7F7),
        shadow: Color.Hex(0x2E82D1),
        outline: Color.Hex(0x1B4FA3),
    },
    [SpindaColorChange.Purple]: {
        base: Color.Hex(0xC467EF),
        shadow: Color.Hex(0x8446BA),
        outline: Color.Hex(0x45268E),
    },
    [SpindaColorChange.Pink]: {
        base: Color.Hex(0xFF84EE),
        shadow: Color.Hex(0xAD5AC2),
        outline: Color.Hex(0x663693),
    },
    [SpindaColorChange.Gray]: {
        base: Color.Hex(0x717187),
        shadow: Color.Hex(0x46466D),
        outline: Color.Hex(0x29295E),
    },
} as const;

function RainbowGenerator(pid: number): ColorPositionGetter {
    const hueIncrement = 0.05;  // or 18/360
    const startingHue = (pid % 360) / 360;
    const hsv = Color.HSV(0, 0.60, 0.95);

    return function(x, y) {
        hsv.hue = y * hueIncrement + startingHue;
        return hsv.toRGB();
    }
}

export const SpindaColorChangeGetterGenerators: { readonly[key in SpindaColorChange]?: ColorPositionGetterGenerator } = {
    [SpindaColorChange.None]: () => () => SpindaColorPalettes.normal.base,
    [SpindaColorChange.Shiny]: () => () => Color.Hex(0xACC44E),
    [SpindaColorChange.Retro]: () => () => Color.Hex(0xEA8356),
    [SpindaColorChange.Gold]: () => () => Color.Hex(0xF7BD1D),
    [SpindaColorChange.Green]: () => () => Color.Hex(0x52A55B),
    [SpindaColorChange.Blue]: () => () => Color.Hex(0x40B7F7),
    [SpindaColorChange.Purple]: () => () => Color.Hex(0xC467EF),
    [SpindaColorChange.Pink]: () => () => Color.Hex(0xFF84EE),
    [SpindaColorChange.Gray]: () => () => Color.Hex(0x717187),
    [SpindaColorChange.Custom]: spinda => () => Color.Hex(spinda.customColor),
    [SpindaColorChange.Rainbow]: spinda => RainbowGenerator(spinda.pid),
} as const;