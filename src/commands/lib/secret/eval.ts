import { CommandCategory, CommandPermission, CommandParameters, ComplexCommand, ArgumentsConfig, ArgumentType, LegacyCommand, ChatCommandParameters } from '../base';
import { Environment } from '../../../data/environment';
import { DiscordUtil } from '../../../util/discord';
import * as DiscordJS from 'discord.js'
import { EvalUtil } from '../../../util/eval';

interface EvalArgs {
    code: string;
    silent: boolean;
}

// This command is heavily unsafe, use at your own risk
export class EvalCommand extends LegacyCommand<EvalArgs> {
    public name = 'eval';
    public description = 'Executes arbitrary JavaScript and returns the result. Be careful!';
    public category = CommandCategory.Secret;
    public permission = CommandPermission.Owner;

    public disableSlash = true;

    public args: ArgumentsConfig<EvalArgs> = {
        silent: {
            description: 'Silence result output?',
            type: ArgumentType.Boolean,
            required: true,
        },
        code: {
            description: 'Code to run. May be put in a code line or code block.',
            type: ArgumentType.RestOfContent,
            required: true,
        },
    };

    public argsString(): string {
        return '(silent?) code';
    }

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

    public parseChatArgs({ args, content }: ChatCommandParameters): EvalArgs {
        const parsed: Partial<EvalArgs> = { };

        if (args[0] === this.silentArg) {
            parsed.silent = true;
            parsed.code = content.substr(this.silentArg.length).trimLeft();
        }
        else {
            parsed.silent = false;
            parsed.code = content;
        }

        return parsed as EvalArgs;
    }

    public async run(params: CommandParameters, args: EvalArgs) {
        let { bot, src } = params;

        // Parse code from code blocks/lines
        const code = DiscordUtil.getCodeBlockOrLine(args.code) ?? args.code;

        let res = await EvalUtil.runCodeToString(code, {
            params,
            bot,
            src,
            discord: DiscordJS,
            setTimeout,
            setInterval,
            clearInterval,
        });
        if (res.length > this.maxLength) {
            res = res.substr(0, this.maxLength) + '...';
        }
        res = res.replace(this.sensitivePattern, '???');
        if (!args.silent) {
            await src.send(`\`\`\`javascript\n${res}\n\`\`\``);
        }
    }
}