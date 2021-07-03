import { CommandCategory, CommandPermission, CommandParameters, ArgumentsConfig, ArgumentType, ComplexCommand } from '../base';

interface RunCustomArgs {
    code: string;
}

export class RunCustomCommand extends ComplexCommand<RunCustomArgs> {
    public name = 'run-custom';
    public description = 'Runs the custom command engine for the given message. All `$N` arguments will be undefined.';
    public category = CommandCategory.Config;
    public permission = CommandPermission.Administrator;
    
    public disableInCustomCommand = true;

    public args: ArgumentsConfig<RunCustomArgs> = {
        code: {
            description: 'Custom command code.',
            type: ArgumentType.RestOfContent,
            required: true,
        },
    };

    public async run({ bot, src, guild }: CommandParameters, args: RunCustomArgs) {
        await bot.customCommandService.run(args.code, {
            params: { bot, src, guild, },
            content: 'content',
            args: [],
        });
    }
}