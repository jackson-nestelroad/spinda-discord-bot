import { CommandCategory, CommandPermission, CommandParameters, ArgumentsConfig, ArgumentType, LegacyCommand, ChatCommandParameters } from '../base';
import { CustomCommandEngine } from '../../../events/util/custom-command';
import { ExpireAgeConversion } from '../../../util/timed-cache';

interface RunCustomArgs {
    code: string;
    universal: boolean;
}

export class RunCustomCommand extends LegacyCommand<RunCustomArgs> {
    public name = 'run-custom';
    public description = 'Runs the custom command engine for the given message. All `$N` arguments will be undefined.';
    public moreDescription = `The \`universal\` option will run the command universally, which means it is run for every member of the guild. This can only be run every ${ExpireAgeConversion.toString(CustomCommandEngine.universalCooldown)}.`;
    public category = CommandCategory.Config;
    public permission = CommandPermission.Administrator;
    
    public disableInCustomCommand = true;

    public args: ArgumentsConfig<RunCustomArgs> = {
        universal: {
            description: 'Run once for all members?',
            type: ArgumentType.Boolean,
            required: true,
        },
        code: {
            description: 'Custom command code.',
            type: ArgumentType.RestOfContent,
            required: true,
        },
    };

    public argsString(): string {
        return '(universal?) code';
    }

    public readonly universalArg = 'universal';

    public parseChatArgs({ args, content }: ChatCommandParameters): RunCustomArgs {
        const parsed: Partial<RunCustomArgs> = { };

        if (args[0] === this.universalArg) {
            parsed.universal = true;
            parsed.code = content.substr(this.universalArg.length).trimLeft();
        }
        else {
            parsed.universal = false;
            parsed.code = content;
        }

        return parsed as RunCustomArgs;
    }

    public async run(params: CommandParameters, args: RunCustomArgs) {
        await new CustomCommandEngine({
            bot: params.bot,
            src: params.src,
            guild: params.guild,
        }, 'content', [], { 
            universal: args.universal,
        }).run(args.code);
    }
}