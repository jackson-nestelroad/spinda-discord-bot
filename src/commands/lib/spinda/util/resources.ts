import { Color, RGBAColor } from '../../../../util/color';
import { Image, loadImage } from 'canvas';

import { Point } from './point';
import { SpindaDiscordBot } from '../../../../bot';

export enum SpotLocation {
    Start = 0,
    TopLeft = 0,
    TopRight = 1,
    BottomLeft = 2,
    BottomRight = 3,
    Count = 4,
}

export type SpotData<T> = Record<Exclude<SpotLocation, SpotLocation.Count>, T>;

export class Resource {
    private imageData: Image = null;

    public constructor(private readonly path: string) { }

    public get image(): Image {
        return this.imageData;
    }

    public async load(bot: SpindaDiscordBot) {
        this.imageData = await loadImage(bot.resourceService.resolve(this.path));
    }

    public loaded(): boolean {
        return this.image !== null;
    }
}

export class Spot extends Resource {
    public constructor(path: string, public readonly anchor: Point) {
        super(path);
    }
}

export interface SpindaResourceConfig {
    base: Resource,
    components: {
        red: Resource,
        tan: Resource,
        black: Resource,
        mouth: Resource,
        shading: Resource,
    },
    spots: SpotData<Spot>,
    specialSpots: {
        heart: Spot,
        star: Spot,
    },
}

export interface SpindaGenerationConfig {
    baseColor: RGBAColor,
    resources: SpindaResourceConfig,
}

type Resources = Resource | ResourceMap;
export interface ResourceMap extends Record<string | symbol | number, Resources> { }

export enum SpindaType {
    Normal,
    Gen3,
    Gen4,
    Gen5,
}

interface SpindaGenerationMetadataInterface {
    width: number,
    height: number,
    types: Record<SpindaType, SpindaGenerationConfig>,
}

export const SpindaGenerationMetadata: SpindaGenerationMetadataInterface = {
    width: 41,
    height: 51,
    types: {
        [SpindaType.Normal]: {
            baseColor: Color.Hex(0xffdbaa),
            resources: {
                base: new Resource('spinda/default/base.png'),
                components: {
                    red: new Resource('spinda/default/components/red.png'),
                    tan: new Resource('spinda/default/components/tan.png'),
                    black: new Resource('spinda/default/components/black.png'),
                    mouth: new Resource('spinda/default/components/mouth.png'),
                    shading: new Resource('spinda/default/components/shading.png'),
                },
                spots: {
                    [SpotLocation.TopLeft]: new Spot('spinda/default/normal/top_left_spot.png', new Point(-2, -4)),
                    [SpotLocation.TopRight]: new Spot('spinda/default/normal/top_right_spot.png', new Point(19, 2)),
                    [SpotLocation.BottomLeft]: new Spot('spinda/default/normal/bottom_left_spot.png', new Point(2, 10)),
                    [SpotLocation.BottomRight]: new Spot('spinda/default/normal/bottom_right_spot.png', new Point(13, 14)),
                },
                specialSpots: {
                    heart: new Spot('spinda/default/special/bottom_left_heart.png', new Point(2, 10)),
                    star: new Spot('spinda/default/special/bottom_right_star.png', new Point(12, 14)),
                },
                // smallSpots: {
                //     [SpotLocation.TopLeft]: new Spot('spinda/small/top_left_spot.png', new Point(0, 0)),
                //     [SpotLocation.TopRight]: new Spot('spinda/small/top_right_spot.png', new Point(18, 6)),
                //     [SpotLocation.BottomLeft]: new Spot('spinda/small/bottom_left_spot.png', new Point(4, 13)),
                //     [SpotLocation.BottomRight]: new Spot('spinda/small/bottom_right_spot.png', new Point(14, 15)),
                // },
            },
        },
        [SpindaType.Gen3]: {
            baseColor: Color.Hex(0xffdbaa),
            resources: {
                base: new Resource('spinda/gen3/base.png'),
                components: {
                    red: new Resource('spinda/gen3/components/red.png'),
                    tan: new Resource('spinda/gen3/components/tan.png'),
                    black: new Resource('spinda/gen3/components/black.png'),
                    mouth: new Resource('spinda/gen3/components/mouth.png'),
                    shading: new Resource('spinda/gen3/components/shading.png'),
                },
                spots: {
                    [SpotLocation.TopLeft]: new Spot('spinda/gen3/normal/top_left_spot.png', new Point(-6, -6)),
                    [SpotLocation.TopRight]: new Spot('spinda/gen3/normal/top_right_spot.png', new Point(18, -5)),
                    [SpotLocation.BottomLeft]: new Spot('spinda/gen3/normal/bottom_left_spot.png', new Point(0, 12)),
                    [SpotLocation.BottomRight]: new Spot('spinda/gen3/normal/bottom_right_spot.png', new Point(12, 13)),
                },
                specialSpots: {
                    heart: new Spot('spinda/gen3/special/bottom_left_heart.png', new Point(2, 10)),
                    star: new Spot('spinda/gen3/special/bottom_right_star.png', new Point(12, 14)),
                },
            },
        },
        [SpindaType.Gen4]: null,
        [SpindaType.Gen5]: null,
    },
} as const;