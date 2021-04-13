import { Command, CommandParameters } from './base';

type ParameterHandler = (params: CommandParameters) => Promise<void>;

export abstract class ParameterCommand extends Command {
    protected abstract commands: Dictionary<ParameterHandler>;

    public async run(params: CommandParameters) {
        const command = params.args[0];
        if (!this.commands[command]) {
            throw new Error(`Invalid command: \`${command}\``);
        }

        params.content = params.content.substr(command ? command.length : 0).trimLeft();
        params.args.shift();
        await this.commands[command](params);
    }
}