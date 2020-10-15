import { Command, CommandCategory, CommandPermission, CommandParameters } from '../base';
import { FunUtil } from './util';

export class ConchCommand implements Command {
    public readonly prefix = ':shell: - ';
    
    public name = 'conch';
    public args = '(question)';
    public description = this.prefix + 'Pulls the Magic Conch Shell\u2122\'s string for words of wisdom.';
    public category = CommandCategory.Fun;
    public permission = CommandPermission.Everyone;

    public readonly options = ['Maybe someday.', 'I don\'t think so.', 'No.', 'Yes.', 'Try asking again.'];
    public readonly header = `You rapidly pulled the Magic Conch Shell\u2122\'s string. It slowly slithers back towards the shell.`;
    public readonly secondLine = `\n${this.prefix}`;
    public readonly editedHeader = this.header + this.secondLine;

    public async run({ msg, content }: CommandParameters) {
        const question = content.toLowerCase().trim();
        let response = await msg.channel.send(this.header);

        response = await FunUtil.addSuspense(response, this.editedHeader, 2);

        let res: string;
        if (question.startsWith('which')) {
            res = 'Neither.';
        }
        else if (question.startsWith('what')) {
            res = 'Nothing.';
        }
        else if (question.startsWith('where')) {
            res = 'Nowhere.';
        }
        else if (question.startsWith('who')) {
            res = 'No one.';
        }
        else {
            res = this.options[Math.floor(Math.random() * this.options.length)];
        }

        await response.edit(`${this.editedHeader}"${res}"`);
    }
}