export class Point {
    constructor(public readonly x: number, public readonly y: number) {}

    public toString(): string {
        return `(${this.x}, ${this.y})`;
    }

    public offscreen(): boolean {
        return this.x < 0 || this.y < 0;
    }

    public translate(x: number, y: number = x): Point {
        return new Point(this.x + x, this.y + y);
    }
}
