export const OptionValueType = {
    None: 'none',
    Boolean: 'boolean',
    Number: 'number',
    String: 'string',
    Channel: 'channel',
};

export type OptionNameToTypes = { [name: string]: string[] };

export module CommandOptions {
    export function formatOptions(options: OptionNameToTypes): string {
        return Object.entries(options)
            .map(([key, val]) => {
                const ways = [];
                for (const type of val) {
                    if (type === OptionValueType.None) {
                        ways.push(`\`${key};\``);
                    } else {
                        ways.push(`\`${key} = [${type}];\``);
                    }
                }
                return ways.join('\n');
            })
            .join('\n');
    }

    export function parseOptions(content: string, options: OptionNameToTypes): [string, string][] {
        const result = [] as [string, string][];
        const keyValuePairs = content.split(';').map(val => val.trim());
        for (const keyValue of keyValuePairs) {
            const split = keyValue.split('=').map(val => val.trim());
            if (split.length > 2 || split.length === 0) {
                throw new Error(`Invalid format: \`${keyValue}\``);
            }

            const option = split[0];
            const value = split.length === 2 ? split[1] : '';
            if (!option) {
                break;
            }

            if (!value && !this.options[option].includes(OptionValueType.None)) {
                throw new Error(`Invalid value for \`${option}\``);
            }

            result.push([option, value]);
        }
        return result;
    }
}
