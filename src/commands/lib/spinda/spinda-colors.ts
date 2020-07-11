import { Color } from './color';

export const SpindaColors = {
    base: {
        base: new Color(255, 219,170),
        shadow: new Color(188, 161, 147),
        outline: new Color(107, 92, 101),
        highlight: new Color(255, 247, 221),
    },
    spots: {
        base: new Color(247, 93, 93),
        shadow: new Color(181, 68, 89),
        outline: new Color(104, 39, 66),
        highlight: new Color(255, 167, 142),
    },
    shinySpots: {
        base: new Color(172, 196, 78),
        shadow: new Color(125, 142, 101),
        outline: new Color(78, 86, 83),
        highlight: new Color(217, 219, 87),
    },
    black: new Color(0, 0, 0),
    white: new Color(255, 255, 255),
    transparent: new Color(0, 0, 0, 0),
};