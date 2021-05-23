import { CommandCategory, CommandPermission, CommandParameters, ArgumentsConfig, ArgumentType, ComplexCommand } from '../base';
import { CustomCommandEngine } from '../../../events/util/custom-command';

interface RunCustomArgs {
    code: string;
}

export class RunCustomCommand extends ComplexCommand<RunCustomArgs> {
    public name = 'run-custom';
    public description = 'Runs the custom command engine for the given message. All `$N` arguments will be undefined.';
    public category = CommandCategory.Secret;
    public permission = CommandPermission.Administrator;

    public args: ArgumentsConfig<RunCustomArgs> = {
        code: {
            description: 'Custom command code.',
            type: ArgumentType.RestOfContent,
            required: true,
        },
    };

    public async run(params: CommandParameters, args: RunCustomArgs) {
        await new CustomCommandEngine({
            bot: params.bot,
            src: params.src,
            guild: params.guild,
        }, 'content').run(args.code);
    }
}