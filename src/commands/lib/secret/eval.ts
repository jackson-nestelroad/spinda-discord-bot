import { Command, CommandCategory, CommandPermission, CommandParameters, StandardCooldowns } from '../base';
import { inspect } from 'util';
import { Environment } from '../../../data/environment';
import { runInContext, createContext } from 'vm';
import { DiscordUtil } from '../../../util/discord';

// This command is heavily unsafe, use at your own risk
export class EvalCommand extends Command {
    public name = 'eval';
    public args = '(silent?) code';
    public description = 'Executes arbitrary JavaScript and returns the result. Be careful!';
    public category = CommandCategory.Secret;
    public permission = CommandPermission.Owner;

    public readonly silentArg = 'silent';
    public readonly maxLength = 1900;
    public sensitivePattern: RegExp = null;

    constructor() {
        super();
        this.createSensitivePattern();
    }

    private createSensitivePattern() {
        this.sensitivePattern = new RegExp(`${Environment.getDiscordToken()}`, 'g');
    }

    private async runCode(code: string, context: any): Promise<string> {
        let res: any;
        try {
            res = await runInContext(code, createContext(context, { codeGeneration: { strings: false, wasm: false }}));
        } catch (error) {
            res = `Error: ${error ? error.message || error : error}`;
        }
        if (typeof res !== 'string') {
            res = inspect(res, { depth: 0 });
        }
        return res;
    }

    public async run(params: CommandParameters) {
        let { bot, msg, content } = params;
        let silent = false;

        // Code block may be on a different line, so allow parameters to be split by any whitespace
        const args = content.split(/\s+/);
        
        if (args[0] === this.silentArg) {
            silent = true;
            content = content.substr(this.silentArg.length).trimLeft();
        }

        // Parse code from code blocks/lines
        let code = content;
        const codeBlock = DiscordUtil.getCodeBlock(code);
        if (codeBlock.match) {
            code = codeBlock.content;
        }
        else {
            const codeLine = DiscordUtil.getCodeLine(code);
            if (codeLine.match) {
                code = codeLine.content;
            }
        }

        let res = await this.runCode(code, {
            params,
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