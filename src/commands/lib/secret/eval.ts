import { Command, CommandCategory, CommandPermission } from '../base';
import { DiscordBot } from '../../../bot';
import { Message } from 'discord.js';
import { inspect } from 'util';
import { Environment } from '../../../data/environment';
import { runInContext, createContext, Context } from 'vm';

// This command is heavily unsafe, use at your own risk
export class EvalCommand implements Command {
    public names = ['eval'];
    public args = 'code';
    public description = 'Executes a single line of arbitrary JavaScript and returns the result.';
    public category = CommandCategory.Secret;
    public permission = CommandPermission.Owner;

    public readonly maxLength = 1900;
    public readonly timeout = 10000;
    public readonly timeoutMsg = 'Execution timed out';
    public sensitivePattern: RegExp = null;

    constructor() {
        this.createSensitivePattern();
    }

    private createSensitivePattern() {
        this.sensitivePattern = new RegExp(`${Environment.getDiscordToken()}`, 'g');
    }

    private wrapCode(code: string): string {
        // All code passed in must be assignable to a variable

        // A single promise is always returned
        
        // setTimeout is called internally to reject the promise
        // The timeout option on runInContext does not play well with Promises

        // If a Promise is returned from the code, it is awaited internally to use the timeout

        return `new Promise(async (resolve, reject) => { setTimeout(() => reject('${this.timeoutMsg}'), ${this.timeout}); try { const res = ${code}; if (res instanceof Promise) { await res; } resolve(res); } catch (error) { reject(error); } });`;
    }

    private async runCode(code: string, context: any): Promise<string> {
        let res: any;
        try {
            res = await runInContext(code, createContext(context));
        } catch (error) {
            res = error ? error.message || error : error;
        }
        if (typeof res !== 'string') {
            res = inspect(res, { depth: 0 });
        }
        return res;
    }

    public async run(bot: DiscordBot, msg: Message, args: string[]) {
        const code = args.join(' ');
        let res = await this.runCode(this.wrapCode(code), { bot, msg, setTimeout, Promise });
        if (res.length > this.maxLength) {
            res = res.substr(0, this.maxLength) + '...';
        }
        res = res.replace(this.sensitivePattern, '???');
        msg.channel.send(`\`\`\`javascript\n${res}\n\`\`\``);
    }
}