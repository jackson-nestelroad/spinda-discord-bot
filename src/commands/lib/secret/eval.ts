import { Command, CommandCategory, CommandPermission } from '../base';
import { DiscordBot } from '../../../bot';
import { Message } from 'discord.js';
import { inspect } from 'util';
import { Environment } from '../../../data/environment';
import { runInContext, createContext } from 'vm';

// This command is heavily unsafe, use at your own risk
export class EvalCommand implements Command {
    public names = ['eval'];
    public args = 'code';
    public description = 'Executes a single line of arbitrary JavaScript and returns the result.';
    public category = CommandCategory.Secret;
    public permission = CommandPermission.Owner;

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
        const code = args.join(' ');
        let res = await this.runCode(code, { bot, msg });
        if (res.length > this.maxLength) {
            res = res.substr(0, this.maxLength) + '...';
        }
        res = res.replace(this.sensitivePattern, '???');
        msg.channel.send(`\`\`\`javascript\n${res}\n\`\`\``);
    }
}