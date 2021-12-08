import { Color, RGBAColor } from '../../../../util/color';
import { Spinda, SpindaColorChange } from './spinda';

import { CanvasBundle } from '../generator';

export interface SpindaColorPalette {
    readonly base: RGBAColor;
    readonly shadow: RGBAColor;
    readonly outline: RGBAColor;
}

export const ShaderConstants = {
    ShadowMultiplier: 0.7093,
    OutlineMultiplier: 0.5,
} as const;

export const SpindaColors = {
    spot: Color.Hex(0xf75d5d),
    black: Color.Hex(0x000000),
    white: Color.Hex(0xffffff),
    transparent: Color.HexAlpha(0x00000000),
};

// No longer used, but kept here for reference.
const SpindaColorChangePalettes: { readonly [key in SpindaColorChange]?: SpindaColorPalette } = {
    [SpindaColorChange.Shiny]: {
        base: Color.Hex(0xacc44e),
        shadow: Color.Hex(0x798955),
        outline: Color.Hex(0x454e4f),
    },
    [SpindaColorChange.Retro]: {
        base: Color.Hex(0xea8356),
        shadow: Color.Hex(0xa55c5c),
        outline: Color.Hex(0x5b334f),
    },
    [SpindaColorChange.Gold]: {
        base: Color.Hex(0xf7bd1d),
        shadow: Color.Hex(0xb58a36),
        outline: Color.Hex(0x725742),
    },
    [SpindaColorChange.Green]: {
        base: Color.Hex(0x52a55b),
        shadow: Color.Hex(0x366d58),
        outline: Color.Hex(0x1c3852),
    },
    [SpindaColorChange.Blue]: {
        base: Color.Hex(0x40b7f7),
        shadow: Color.Hex(0x2e82d1),
        outline: Color.Hex(0x1b4fa3),
    },
    [SpindaColorChange.Purple]: {
        base: Color.Hex(0xc467ef),
        shadow: Color.Hex(0x8446ba),
        outline: Color.Hex(0x45268e),
    },
    [SpindaColorChange.Pink]: {
        base: Color.Hex(0xff84ee),
        shadow: Color.Hex(0xad5ac2),
        outline: Color.Hex(0x663693),
    },
    [SpindaColorChange.Gray]: {
        base: Color.Hex(0x717187),
        shadow: Color.Hex(0x46466d),
        outline: Color.Hex(0x29295e),
    },
} as const;

const SpindaColorChanges: { readonly [key in SpindaColorChange]?: RGBAColor } = {
    [SpindaColorChange.None]: SpindaColors.spot,
    [SpindaColorChange.Shiny]: Color.Hex(0xacc44e),
    [SpindaColorChange.Retro]: Color.Hex(0xea8356),
    [SpindaColorChange.Gold]: Color.Hex(0xf7bd1d),
    [SpindaColorChange.Green]: Color.Hex(0x52a55b),
    [SpindaColorChange.Blue]: Color.Hex(0x40b7f7),
    [SpindaColorChange.Purple]: Color.Hex(0xc467ef),
    [SpindaColorChange.Pink]: Color.Hex(0xff84ee),
    [SpindaColorChange.Gray]: Color.Hex(0x717187),
} as const;

export namespace SpindaColorMask {
    function solidColor(color: RGBAColor, bundle: CanvasBundle) {
        bundle.fillColor('source-over', color);
    }

    const rainbow = (function () {
        const hueIncrement = 0.05; // or 18/360
        const hsv = Color.HSV(0, 0.6, 0.95);

        return (pid: number, bundle: CanvasBundle) => {
            hsv.hue = (pid % 360) / 360;
            for (let y = 0; y < bundle.height; ++y, hsv.hue += hueIncrement) {
                bundle.ctx.fillStyle = hsv.toRGB().hexString();
                bundle.ctx.fillRect(0, y, bundle.width, 1);
            }
        };
    })();

    export function draw(spinda: Spinda, bundle: CanvasBundle) {
        const color = spinda.getColor();
        const predefinedColor = SpindaColorChanges[color];
        if (predefinedColor) {
            solidColor(predefinedColor, bundle);
        } else {
            switch (color) {
                case SpindaColorChange.Custom:
                    solidColor(spinda.getCustomColor(), bundle);
                    break;
                case SpindaColorChange.Rainbow:
                    rainbow(spinda.pid, bundle);
                    break;
                default:
                    throw new Error(`Unknown Spinda color change: \`${color}\``);
            }
        }
    }
}
