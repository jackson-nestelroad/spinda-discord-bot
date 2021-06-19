import { NumberUtil } from './number';

export class CircularBuffer<T> {
    private data: T[];
    private head: number;

    constructor(
        public readonly size: number,
    ) { 
        if (size <= 0) {
            throw new Error('Circular array size must be larger than 0.');
        }
        this.clear();
    }

    private incrementHead(): number {
        ++this.head;
        if (this.head >= this.size) {
            this.head = 0;
        }
        return this.head;
    }

    public get(offset: number): T | undefined {
        return this.data[NumberUtil.mod(this.head + offset, this.size)];
    }

    public push(value: T) {
        this.data[NumberUtil.mod(this.incrementHead(), this.size)] = value;
    }

    public set(newData: T[]) {
        if (newData.length > this.size) {
            this.data = newData.slice(0, this.size);
        }
        else {
            if (newData.length < this.size) {
                newData.length = this.size;
            }
            this.data = newData;
        }
        this.head = this.size - 1;
    }

    public clear() {
        this.data = new Array(this.size);
        this.head = 0;
    }
}