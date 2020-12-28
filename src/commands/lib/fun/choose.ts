import { Command, CommandCategory, CommandPermission, CommandParameters } from '../base';
import { FunUtil } from './util';

export class ChooseCommand implements Command {
    public readonly separator: string = ';';

    public name = 'choose';
    public args = `choice${this.separator} choice${this.separator} ...`;
    public description = `Randomly selects one choice from a given list of options. Separate all choices using \`${this.separator}\`.`;
    public category = CommandCategory.Fun;
    public permission = CommandPermission.Everyone;

    public readonly header = 'I choose... ';

    public async run({ msg, content }: CommandParameters) {
        const choices = content.trim().split(this.separator);
        let choice = 'nothing!';
        if (choices.length > 1 || choices[0]) {
            choice = '"' + choices[Math.floor(Math.random() * choices.length)].trim() + '"';
        }

        await msg.channel.send(this.header + choice);

        // Suspense version
        // let response = await msg.channel.send(this.header);
        // response = await FunUtil.addSuspense(response, this.header, 2);

        // await response.edit(this.header + choice);
    }
}