import { Command, CommandCategory, CommandPermission, CommandParameters } from '../base';
import { CustomCommandEngine } from '../../../events/util/custom-command';

export class RunCustomCommand implements Command {
    public name = 'run-custom';
    public args = 'message';
    public description = 'Runs the custom command engine for the given message. All `$N` arguments will be undefined.';
    public category = CommandCategory.Secret;
    public permission = CommandPermission.Administrator;

    public async run(params: CommandParameters) {
        await new CustomCommandEngine({
            bot: params.bot,
            msg: params.msg,
            args: [],
            content: 'content',
            guild: params.guild,
        }).run(params.content);
    }
}