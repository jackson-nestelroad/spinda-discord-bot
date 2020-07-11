import { Command, CommandCategory, CommandPermission } from '../base';
import { DiscordBot } from '../../../bot';
import { Message } from 'discord.js';
import { inspect } from 'util';

class EvalContext {
    constructor(
        public bot: DiscordBot,
        public msg: Message,
    ) { }

    public eval(code: string): string {
        let res = eval(code);
        if (typeof res !== 'string') {
            res = inspect(res, { depth: 1 });
        }
        return res;
    }
}

// This command is heavily unsafe, use at your own risk
export class JsCommand implements Command {
    public names = ['js'];
    public args = 'code';
    public description = 'Executes arbitrary JavaScript and returns the result.';
    public category = CommandCategory.Secret;
    public permission = CommandPermission.Owner;

    public readonly maxLength = 500;

    // See https://nodejs.org/api/globals.html
    public readonly blacklist: string[] = [
        'Buffer',
        '__dirname',
        '__filename',
        'clearImmediate',
        'clearInterval',
        'clearTimeout',
        'console',
        'exports',
        'global',
        'globalThis',
        'module',
        'process',
        'queueMicrotask',
        'require',
        'setImmediate',
        'setInterval',
        'setTimeout',
        'TextDecoder',
        'TextEncoder',
        'URL',
        'URLSearchParams',
        'WebAssembly'
    ];

    public async run(bot: DiscordBot, msg: Message, args: string[]) {
        const code = args.join(' ');
        let res: string;
        if (this.blacklist.some(global => code.startsWith(global))) {
            res = 'undefined';
        }
        else {
            res = (new EvalContext(bot, msg)).eval(code);
            if (res.length > this.maxLength) {
                res.substr(0, this.maxLength);
            }
        }
        msg.channel.send(`\`\`\`js\n${res}\n\`\`\``);
    }
}