import { Command, CommandCategory, CommandPermission } from '../base';
import { DiscordBot } from '../../../bot';
import { Message } from 'discord.js';
import { inspect } from 'util';
import { Environment } from '../../../data/environment';
import { runInContext, createContext } from 'vm';

// This command is heavily unsafe, use at your own risk
export class EvalCommand implements Command {
    public name = 'eval';
    public args = '(silent?) code';
    public description = 'Executes arbitrary JavaScript and returns the result. Be careful!';
    public category = CommandCategory.Secret;
    public permission = CommandPermission.Owner;

    public readonly silentArg = 'silent';
    public readonly maxLength = 1900;
    public sensitivePattern: RegExp = null;

    constructor() {
        this.createSensitivePattern();
    }

    private createSensitivePattern() {
        this.sensitivePattern = new RegExp(`${Environment.getDiscordToken()}`, 'g');
    }

    private async runCode(code: string, context: any): Promise<string> {
        let res: any;
        try {
            res = await runInContext(code, createContext(context));
        } catch (error) {
            res = `Error: ${error ? error.message || error : error}`;
        }
        if (typeof res !== 'string') {
            res = inspect(res, { depth: 0 });
        }
        return res;
    }

    public async run(bot: DiscordBot, msg: Message, args: string[]) {
        let silent = false;
        if (args[0] === this.silentArg) {
            silent = true;
            args.shift();
        }
        const code = args.join(' ');
        let res = await this.runCode(code, { 
            bot,
            msg,
            setTimeout,
            setInterval,
            clearInterval,
        });
        if (res.length > this.maxLength) {
            res = res.substr(0, this.maxLength) + '...';
        }
        res = res.replace(this.sensitivePattern, '???');
        if (!silent) {
            await msg.channel.send(`\`\`\`javascript\n${res}\n\`\`\``);
        }
    }
}