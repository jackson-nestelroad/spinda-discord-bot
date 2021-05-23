import { CommandCategory, CommandPermission, CommandParameters, StandardCooldowns, ComplexCommand, ArgumentsConfig, ArgumentType } from '../base';
import { FunUtil } from './util';

interface ConchArgs {
    question?: string;
}

export class ConchCommand extends ComplexCommand<ConchArgs> {
    public prefix = ':shell: - ';
    public name = 'conch';
    public description = 'Pulls the Magic Conch Shell\u{2122}\'s string for words of wisdom.';
    public category = CommandCategory.Fun;
    public permission = CommandPermission.Everyone;
    public cooldown = StandardCooldowns.High;

    public args: ArgumentsConfig<ConchArgs> = {
        question: {
            description: 'Question to ask.',
            type: ArgumentType.RestOfContent,
            required: false,
        },
    };

    public readonly options = ['Maybe someday.', 'I don\'t think so.', 'No.', 'Yes.', 'Try asking again.'];
    public readonly header = `You rapidly pulled the Magic Conch Shell\u{2122}\'s string. It slowly slithers back towards the shell.`;
    public readonly secondLine = `\n${this.prefix}`;
    public readonly editedHeader = this.header + this.secondLine;

    public async run({ bot, src }: CommandParameters, args: ConchArgs) {
        let response = await src.send(this.header);
        response = await FunUtil.addSuspense(bot, response, this.editedHeader, 2);

        let res: string;
        if (args.question) {
            if (args.question.startsWith('which')) {
                res = 'Neither.';
            }
            else if (args.question.startsWith('what')) {
                res = 'Nothing.';
            }
            else if (args.question.startsWith('where')) {
                res = 'Nowhere.';
            }
            else if (args.question.startsWith('who')) {
                res = 'No one.';
            }
            else {
                res = this.options[Math.floor(Math.random() * this.options.length)];
            }
        }
        else {
            res = this.options[Math.floor(Math.random() * this.options.length)];
        }

        await response.edit(`${this.editedHeader}"${res}"`);
    }
}