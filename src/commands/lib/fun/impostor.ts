import { ArgumentType, ArgumentsConfig, CommandParameters, ComplexCommand, StandardCooldowns } from 'panda-discord';
import { CommandCategory, CommandPermission, SpindaDiscordBot } from '../../../bot';

import { GuildMember } from 'discord.js';

type WeightedDistribution<T> = Array<{ value: T; weight: number }>;

interface ImpostorArgs {
    user: GuildMember;
    force: boolean;
    identity: string;
}

export class ImpostorCommand extends ComplexCommand<SpindaDiscordBot, ImpostorArgs> {
    public name = 'impostor';
    public description = 'Checks if a user is an impostor.';
    public category = CommandCategory.Fun;
    public permission = CommandPermission.Everyone;
    public cooldown = StandardCooldowns.Medium;

    public args: ArgumentsConfig<ImpostorArgs> = {
        user: {
            description: 'Member to check. If none is given, a random guild member is selected.',
            type: ArgumentType.User,
            required: false,
        },
        force: {
            description: 'Force the member to be an impostor.',
            type: ArgumentType.Boolean,
            required: false,
            named: true,
            hidden: true,
            default: false,
        },
        identity: {
            description: 'Identity to check.',
            type: ArgumentType.String,
            required: false,
            named: true,
            hidden: true,
            default: 'An Impostor',
        },
    };

    private readonly impostor = '\u{D9E}';
    private readonly chanceForImpostor = 0.1;
    private readonly linePadding = 3;

    private readonly stars: WeightedDistribution<string[] | string> = [
        { weight: 800, value: ' ' },
        {
            weight: 180,
            value: [
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
            ],
        },
        { weight: 19, value: ['\u{2727}', '\u{2735}', '\u{2737}'] },
        { weight: 1, value: ['\u{25D0}', '\u{25D1}'] },
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

    private isImpostor(): boolean {
        return Math.random() < this.chanceForImpostor;
    }

    private generateSpaceLine(length: number): string {
        let line = '';
        for (let i = 0; i < length; ++i) {
            line += this.getStar();
        }
        return line;
    }

    public generateText(subject: string, identity: string, isIdentity: boolean): string {
        isIdentity ??= this.isImpostor();
        // Calculate line lengths
        const revealMsg = `${subject} was ${isIdentity ? '' : 'not '}${identity}`;
        const lineLength = revealMsg.length + this.linePadding * 2 + (revealMsg.length % 2 === 0 ? 1 : 0);
        const halfLine = Math.floor(lineLength / 2);

        let message: string[] = [];

        message.push(this.generateSpaceLine(lineLength));
        let line = this.generateSpaceLine(lineLength);
        message.push(line.substr(0, halfLine) + this.impostor + line.substr(halfLine + 1));
        message.push(' '.repeat(this.linePadding) + revealMsg + ' '.repeat(this.linePadding));
        message.push(this.generateSpaceLine(lineLength));
        message.push(this.generateSpaceLine(lineLength));

        return `\`\`\`${message.join('\n')}\`\`\``;
    }

    public async run({ bot, src }: CommandParameters<SpindaDiscordBot>, args: ImpostorArgs) {
        const name =
            args.user?.user.username ??
            (await bot.memberListService.getMemberListForGuild(src.guild.id)).random().user.username;

        await src.send(this.generateText(name, args.identity, args.force));
    }
}
