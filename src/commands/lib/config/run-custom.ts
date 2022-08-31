import { ArgumentType, ArgumentsConfig, CommandParameters, ComplexCommand, SplitArgumentArray } from 'panda-discord';

import { CommandCategory, CommandPermission, SpindaDiscordBot } from '../../../bot';

interface RunCustomArgs {
    code: string;
    content: string;
}

export class RunCustomCommand extends ComplexCommand<SpindaDiscordBot, RunCustomArgs> {
    public name = 'run-custom';
    public description = 'Runs the custom command engine for the given message. All `$N` arguments will be undefined.';
    public category = CommandCategory.Config;
    public permission = CommandPermission.Moderator;

    public disableInCustomCommand = true;

    public args: ArgumentsConfig<RunCustomArgs> = {
        code: {
            description: 'Custom command code.',
            type: ArgumentType.RestOfContent,
            required: true,
        },
        content: {
            description: 'Content argument to run command with.',
            type: ArgumentType.RestOfContent,
            required: false,
            named: true,
            default: '',
        },
    };

    public async run({ bot, src, guildId, extraArgs }: CommandParameters<SpindaDiscordBot>, args: RunCustomArgs) {
        await bot.customCommandService.run(args.code, {
            params: {
                bot,
                src,
                guildId,
                extraArgs,
            },
            content: args.content,
            args: bot.splitIntoArgs(args.content),
        });
    }
}
