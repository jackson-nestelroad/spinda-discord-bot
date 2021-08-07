type Dictionary<T> = { [key: string]: T };
type ReadonlyDictionary<T> = { readonly [key: string]: T };

type Writeable<T> = { -readonly [P in keyof T]: T[P] };
