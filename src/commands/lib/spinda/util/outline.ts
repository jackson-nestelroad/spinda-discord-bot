import { ImageData, Canvas } from 'canvas';
import { Point } from './point';

// Adapted from https://github.com/d3/d3-plugins/blob/master/geom/contour/contour.js
export class OutlineDrawer {
    private data: Uint8ClampedArray;
    private width: number;

    private static readonly dxLookup = [1, 0, 1, 1, -1, 0, -1, 1, 0, 0, 0, 0, -1, 0, -1, NaN];
    private static readonly dyLookup = [0, -1, 0, 0, 0, -1, 0, 0, 1, -1, 1, 1, 0, -1, 0, NaN];

    constructor(data: ImageData) {
        this.width = data.width;
        this.data = data.data;
    }

    private pointIsTransparentBorderingOpaque(x: number, y: number): boolean {
        return this.data[(y * this.width + x) * 4 + 3] > 20;
    }

    private findImageOrigin(): Point {
        let x = 0;
        let y = 0;

        while (true) {
            if (this.pointIsTransparentBorderingOpaque(x, y)) {
                return new Point(x, y);
            }
            else if (x === 0) {
                x = y + 1;
                y = 0;
            }
            else {
                --x;
                ++y;
            }
        }
    }

    public getPolygon() {
        const polygon: Point[] = [];
        const start = this.findImageOrigin();
        let x = start.x;
        let y = start.y;
        let dx = 0;
        let dy = 0;
        let pdx = NaN;
        let pdy = NaN;

        do {
            // Determine Marching Squares index
            let i = 0;
            if (this.pointIsTransparentBorderingOpaque(x - 1, y - 1)) {
                i += 1;
            }
            if (this.pointIsTransparentBorderingOpaque(x, y - 1)) {
                i += 2;
            }
            if (this.pointIsTransparentBorderingOpaque(x - 1, y)) {
                i += 4;
            }
            if (this.pointIsTransparentBorderingOpaque(x, y)) {
                i += 8;
            }

            // Determine next direction
            if (i === 6) {
                dx = pdy === -1 ? -1 : 1;
                dy = 0;
            }
            else if (i === 9) {
                dx = 0;
                dy = pdx === 1 ? -1 : 1;
            }
            else {
                dx = OutlineDrawer.dxLookup[i];
                dy = OutlineDrawer.dyLookup[i];
            }

            // Update polygon
            if (dx !== pdx && dy !== pdy) {
                polygon.push(new Point(x, y));
                pdx = dx;
                pdy = dy;
            }

            x += dx;
            y += dy;
        } while (x !== start.x || y !== start.y);

        return polygon;
    }
}