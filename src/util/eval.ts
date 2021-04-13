import { inspect } from 'util';
import { createContext, runInContext } from 'vm';

export namespace EvalUtil {
    export async function runCode(code: string, context: any): Promise<string> {
        return runInContext(code, createContext(context, { codeGeneration: { strings: false, wasm: false }}));
    }

    export async function runCodeToString(code: string, context: any): Promise<string> {
        let res: any;
        try {
            res = await runCode(code, context);
        } catch (error) {
            res = `Error: ${error ? error.message || error : error}`;
        }
        if (typeof res !== 'string') {
            res = inspect(res, { depth: 0 });
        }
        return res;
    }
}