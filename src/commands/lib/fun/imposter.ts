import { GuildMember } from 'discord.js';
import { CommandCategory, CommandPermission, CommandParameters, StandardCooldowns, ComplexCommand, ArgumentsConfig, ArgumentType } from '../base';

type WeightedDistribution<T> = Array<{ value: T, weight: number }>;

interface ImposterArgs {
    user: GuildMember;
}

export class ImposterCommand extends ComplexCommand<ImposterArgs> {
    public name = 'imposter';
    public description = 'Checks if a user is an imposter.';
    public category = CommandCategory.Fun;
    public permission = CommandPermission.Everyone;
    public cooldown = StandardCooldowns.Medium;

    public args: ArgumentsConfig<ImposterArgs> = {
        user: {
            description: 'Member to check. If none is given, a random guild member is selected.',
            type: ArgumentType.User,
            required: false,
        },
    };

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

    public async run({ bot, src }: CommandParameters, args: ImposterArgs) {
        const name = args.user?.user.username ?? (await bot.memberListService.getMemberListForGuild(src.guild.id)).random().user.username;

        await src.send(this.generateText(name, this.identity));
    }
}