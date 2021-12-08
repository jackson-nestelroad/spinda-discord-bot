import { Color, RGBAColor } from '../../../../util/color';

export interface GeneratedSpindaData {
    pid: number;
    generatedAt: Date;
    features: bigint;
}

export const SpindaFeature = {
    Random: 0b0000_0000_0000_0000_0000_0000_11111_111_0000n,
    None: 0n,
    SmallSpots: 1,
    Heart: 2,
    Star: 3,
    Inverted: 4,
    Generation: 5,
    Color: 6,
    CustomColor: 7,
}

const SpindaFeatureBitMask: Record<number, bigint> = {
    [SpindaFeature.SmallSpots]: 1n << 0n,
    [SpindaFeature.Heart]: 1n << 1n,
    [SpindaFeature.Star]: 1n << 2n,
    [SpindaFeature.Inverted]: 1n << 3n,
    [SpindaFeature.Generation]: 0b111n << 4n,
    [SpindaFeature.Color]: 0b11111n << 7n,
    [SpindaFeature.CustomColor]: 0b1111_1111_1111_1111_1111_1111n << 12n,
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

    public getFeature(feature: number): boolean {
        const bitMask = SpindaFeatureBitMask[feature];
        return bitMask && ((this.data.features & BigInt(bitMask)) !== 0n);
    }

    public setFeature(feature: number): void {
        this.data.features |= SpindaFeatureBitMask[feature] ?? 0n;
    }

    public getGeneration(): SpindaGeneration {
        return Number((this.data.features & SpindaFeatureBitMask[SpindaFeature.Generation] ?? 0n) >> 4n);
    }

    public setGeneration(gen: SpindaGeneration): void {
        this.data.features |= BigInt(gen << 4) & SpindaFeatureBitMask[SpindaFeature.Generation];
    }

    public getColor(): SpindaColorChange {
        return Number((this.data.features & SpindaFeatureBitMask[SpindaFeature.Color]) >> 7n);
    }

    public setColor(color: SpindaColorChange): void {
        this.data.features |= BigInt(color << 7) & SpindaFeatureBitMask[SpindaFeature.Color];
    }

    public getCustomColor(): RGBAColor {
        return Color.Hex(Number((this.data.features & SpindaFeatureBitMask[SpindaFeature.CustomColor]) >> 12n));
    }

    public setCustomColor(color: RGBAColor) {
        this.data.features |= BigInt(color.hex << 12) & SpindaFeatureBitMask[SpindaFeature.CustomColor];
    }
}