import { Command, CommandCategory, CommandPermission, CommandParameters, StandardCooldowns } from '../base';
import { inspect } from 'util';
import { Environment } from '../../../data/environment';
import { runInContext, createContext } from 'vm';
import { DiscordUtil } from '../../../util/discord';
import * as DiscordJS from 'discord.js'
import { EvalUtil } from '../../../util/eval';

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

    public async run(params: CommandParameters) {
        let { bot, msg, content, args } = params;
        let silent = false;

        if (args[0] === this.silentArg) {
            silent = true;
            content = content.substr(this.silentArg.length).trimLeft();
        }

        // Parse code from code blocks/lines
        const code = DiscordUtil.getCodeBlockOrLine(content) ?? content;

        let res = await EvalUtil.runCodeToString(code, {
            params,
            bot,
            msg,
            discord: DiscordJS,
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