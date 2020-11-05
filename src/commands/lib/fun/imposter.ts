import { Command, CommandCategory, CommandPermission, CommandParameters } from '../base';

type WeightedDistribution<T> = Array<{ value: T, weight: number }>;

export class ImposterCommand implements Command {
    public name = 'imposter';
    public args = '(user)';
    public description = 'Checks if a user is an imposter.';
    public category = CommandCategory.Fun;
    public permission = CommandPermission.Everyone;

    private readonly imposter = '\u{D9E}';
    private readonly chanceForImposter = 0.1;
    private readonly linePadding = 3;
    private readonly identity = 'An Imposter';

    private readonly stars: WeightedDistribution<string[] | string> = [
        { weight: 800, value: ' ' },
        { weight: 180, value: [
            '\u{2DA}',
            '.',
            '\u{B7}',
            '\u{B0}',
            '\u{2022}',
            '\u{2217}',
            '\u{204E}',
            '\u{2055}',
            '\u{22C6}',
            '*',
        ] },
        { weight: 19, value: [
            '\u{2727}',
            '\u{2735}',
            '\u{2737}',
        ] },
        { weight: 1, value: [
            
            '\u{25D0}',
            '\u{25D1}',
        ] },
    ];

    private getStar(): string {
        // Get total weight in the distribution
        const totalWeight = this.stars.reduce((sum, { weight }) => sum + weight, 0);
        // Get a random sample
        let sample = Math.random() * totalWeight;
        // Find the matching star array
        const { value } = this.stars.find(({ weight }) => (sample -= weight) < 0);
        // Return a random star from the chosen array
        return Array.isArray(value) ? value[Math.floor(Math.random() * value.length)] : value;
    }

    private isImposter(): boolean {
        return Math.random() < this.chanceForImposter;
    }

    private generateSpaceLine(length: number): string {
        let line = '';
        for (let i = 0; i < length; ++i) {
            line += this.getStar();
        }
        return line;
    }

    public generateText(subject: string, identity: string, isIdentity: boolean = this.isImposter()): string {
        // Calculate line lengths
        const revealMsg = `${subject} was ${isIdentity ? '' : 'not '}${identity}`;
        const lineLength = revealMsg.length + this.linePadding * 2 + (revealMsg.length % 2 === 0 ? 1 : 0);
        const halfLine = Math.floor(lineLength / 2);

        let message: string[] = [];

        message.push(this.generateSpaceLine(lineLength));
        let line = this.generateSpaceLine(lineLength);
        message.push(line.substr(0, halfLine) + this.imposter + line.substr(halfLine + 1));
        message.push(' '.repeat(this.linePadding) + revealMsg + ' '.repeat(this.linePadding));
        message.push(this.generateSpaceLine(lineLength));
        message.push(this.generateSpaceLine(lineLength));

        return `\`\`\`${message.join('\n')}\`\`\``;
    }

    public async run({ msg, args, content }: CommandParameters) {
        let name: string;
        if (args.length > 0) {
            if (msg.mentions.users.size > 0) {
                name = msg.mentions.users.first().username;
            }
            else {
                name = content;
            }
        }
        else {
            name = msg.guild.members.cache.random().user.username;
        }

        await msg.channel.send(this.generateText(name, this.identity));
    }
}