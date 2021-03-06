import { Color } from './color';

export interface SpindaColorPalette {
    readonly base: Color;
    readonly shadow: Color;
    readonly outline: Color;
    readonly highlight: Color;
}

export const SpindaColorPalettes = {
    base: {
        base: new Color(255, 219,170),
        shadow: new Color(188, 161, 147),
        outline: new Color(107, 92, 101),
        highlight: new Color(255, 247, 221),
    },
    normal: {
        base: new Color(247, 93, 93),
        shadow: new Color(181, 68, 89),
        outline: new Color(104, 39, 66),
        highlight: new Color(255, 167, 142),
    },
    shiny: {
        base: new Color(172, 196, 78),
        shadow: new Color(121, 137, 85),
        outline: new Color(69, 78, 79),
        highlight: new Color(217, 219, 87),
    },
    black: new Color(0, 0, 0),
    white: new Color(255, 255, 255),
    transparent: new Color(0, 0, 0, 0),
} as const;