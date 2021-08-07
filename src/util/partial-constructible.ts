type ExcludeFunctionProps<T> = Omit<T, { [K in keyof T]-?: T[K] extends Function ? K : never }[keyof T]>;
export type PartialProps<T> = ExcludeFunctionProps<T> | Partial<T>;

export class PartialConstructible<T> {
    public constructor(props?: PartialProps<T>) {
        if (props) {
            Object.assign(this, props);
        }
    }
}
