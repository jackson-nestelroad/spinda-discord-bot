import { Command, CommandCategory, CommandPermission } from '../base';
import { DiscordBot } from '../../../bot';
import { Message } from 'discord.js';

export class ConchCommand implements Command {
    public readonly prefix = ':shell: - ';
    
    public names = ['conch'];
    public args = '(question)';
    public description = this.prefix + 'Pulls the Magic Conch Shell\'s string for words of wisdom.';
    public category = CommandCategory.Fun;
    public permission = CommandPermission.Everyone;

    public readonly options = ['Maybe someday.', 'I don\'t think so.', 'No.', 'Yes.', 'Try asking again.'];

    public async wait(ms: number) {
        return new Promise(resolve => setTimeout(() => resolve(), ms));
    }

    public async run(bot: DiscordBot, msg: Message, args: string[]) {
        const question = args.join(' ').toLowerCase().trim();
        msg.channel.send(this.prefix + 'You rapidly pulled the Magic Conch Shell\u2122\'s string. It slowly slithers back towards the shell.');
        
        // Suspense!
        await this.wait(1000);
        msg.channel.send('...');
        await this.wait(1000);
        msg.channel.send('...');
        await this.wait(1000);
        await this.wait(1000 * Math.random());

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

        msg.channel.send(this.prefix + res);
    }
}