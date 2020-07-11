export class Color {
    public readonly hex: number;

    constructor(
        public readonly red: number,
        public readonly green: number,
        public readonly blue: number,
        public readonly alpha: number = 0xFF,
    ) { 
        this.red = Math.min(this.red, 0xFF);
        this.red = Math.max(this.red, 0x00);
        this.green = Math.min(this.green, 0xFF);
        this.green = Math.max(this.green, 0x00);
        this.blue = Math.min(this.blue, 0xFF);
        this.blue = Math.max(this.blue, 0x00);
        this.alpha = Math.min(this.alpha, 0xFF);
        this.alpha = Math.max(this.alpha, 0x00);

        this.hex = (this.red << 16) + (this.green << 8) + this.blue;
    }

    public get rgb(): string {
        return `rgb(${this.red}, ${this.green}, ${this.blue})`;
    }

    public get rgba(): string {
        return `rgba(${this.red}, ${this.green}, ${this.blue}, ${this.alpha / 0xFF})`;
    }

    public get hexString(): string {
        return `#${this.red.toString(16)}${this.green.toString(16)}${this.blue.toString(16)}`;
    }
}