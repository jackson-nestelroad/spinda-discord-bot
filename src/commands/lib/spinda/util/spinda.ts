import { Color, RGBAColor } from '../../../../util/color';

export interface GeneratedSpindaData {
    pid: number;
    generatedAt: Date;
    features: number;
}

export enum SpindaFeature {
    Random = 0b0000_0000_0000_0000_0000_0000_11111_111_0000,
    None = 0,
    SmallSpots,
    Heart,
    Star,
    Inverted,
    Generation,
    Color,
    CustomColor,
}

type ActualSpindaFeature = Exclude<SpindaFeature, SpindaFeature.Random | SpindaFeature.None>;
type OneBitSpindaFeature = Exclude<ActualSpindaFeature, SpindaFeature.Generation | SpindaFeature.Color | SpindaFeature.CustomColor>;

const SpindaFeatureBitMask: Record<ActualSpindaFeature, number> = {
    [SpindaFeature.SmallSpots]: 1 << 0,
    [SpindaFeature.Heart]: 1 << 1,
    [SpindaFeature.Star]: 1 << 2,
    [SpindaFeature.Inverted]: 1 << 3,
    [SpindaFeature.Generation]: 0b111 << 4,
    [SpindaFeature.Color]: 0b11111 << 7,
    [SpindaFeature.CustomColor]: 0b1111_1111_1111_1111_1111_1111 << 12,
    // Next bit: 36
};

export enum SpindaGeneration {
    Normal = 0b000,
    Gen3 = 0b001,
    Gen4 = 0b010,
    Gen5 = 0b011,
    Random = 0b111,
}

export enum SpindaColorChange {
    None = 0b00000,
    Shiny = 0b00001,
    Retro = 0b00010,
    Gold = 0b00011,
    Green = 0b00100,
    Blue = 0b00101,
    Purple = 0b00110,
    Pink = 0b00111,
    Gray = 0b01000,
    Custom = 0b01001,
    Rainbow = 0b01010,
    Random = 0b11111,
}

export class Spinda {
    constructor(public readonly data: GeneratedSpindaData) { }

    public get pid(): number {
        return this.data.pid;
    }

    public get generatedAt(): Date {
        return this.data.generatedAt;
    }

    public isRandom(): boolean {
        return this.data.features === SpindaFeature.Random;
    }

    public resetFeatures(): void {
        this.data.features = SpindaFeature.None;
    }

    public getFeature(feature: OneBitSpindaFeature): boolean {
        return (this.data.features & SpindaFeatureBitMask[feature]) !== 0;
    }

    public setFeature(feature: OneBitSpindaFeature): void {
        this.data.features |= SpindaFeatureBitMask[feature];
    }

    public getGeneration(): SpindaGeneration {
        return (this.data.features & SpindaFeatureBitMask[SpindaFeature.Generation]) >>> 4;
    }

    public setGeneration(gen: SpindaGeneration): void {
        this.data.features |= (gen << 4) & SpindaFeatureBitMask[SpindaFeature.Generation];
    }

    public getColor(): SpindaColorChange {
        return (this.data.features & SpindaFeatureBitMask[SpindaFeature.Color]) >>> 7;
    }

    public setColor(color: SpindaColorChange): void {
        this.data.features |= (color << 7) & SpindaFeatureBitMask[SpindaFeature.Color];
    }

    public getCustomColor(): RGBAColor {
        return Color.Hex((this.data.features & SpindaFeatureBitMask[SpindaFeature.CustomColor]) >>> 12);
    }

    public setCustomColor(color: RGBAColor) {
        this.data.features |= (color.hex << 12) & SpindaFeatureBitMask[SpindaFeature.CustomColor];
    }
}