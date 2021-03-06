import { Command, CommandCategory, CommandPermission, CommandParameters, StandardCooldowns } from '../base';

export class EightBallCommand extends Command {
    public readonly prefix = ':8ball: - ';

    public name = '8ball';
    public args = '(question)';
    public description = this.prefix + 'Shakes the Magic 8-ball for a glimpse into the future.';
    public category = CommandCategory.Fun;
    public permission = CommandPermission.Everyone;
    public cooldown = StandardCooldowns.Low;

    public readonly options = [
        'It is certain.',
        'It is decidedly so.',
        'Without a doubt.',
        'Yes, definitely.',
        'You may rely on it.',
        'As I see it, yes.',
        'Most likely.',
        'Outlook good.',
        'Yes.',
        'Signs point to yes.',
        'Reply hazy, try again.',
        'Ask again later.',
        'Better not tell you now.',
        'Cannot predict now.',
        'Concentrate and ask again.',
        'Don\'t count on it.',
        'My reply is no.',
        'My sources say no.',
        'Outlook not so good.',
        'Very doubtful.'
    ];

    public async run({ msg }: CommandParameters) {
        await msg.channel.send(this.prefix + this.options[Math.floor(Math.random() * this.options.length)]);
    }
}