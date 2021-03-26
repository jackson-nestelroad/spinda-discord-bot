import { SpindaColorChange } from '../../../../data/model/caught-spinda';
import { Color, RGBColor } from '../../../../util/color';

export interface SpindaColorPalette {
    readonly base: RGBColor;
    readonly shadow: RGBColor;
    readonly outline: RGBColor;
}

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
    transparent: Color.HexAlpha(0x00000000),
} as const;

export const SpindaColorChangePalettes: { readonly[key in SpindaColorChange]?: SpindaColorPalette } = {
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