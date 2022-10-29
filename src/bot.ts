import { AttachmentBuilder, PermissionFlagsBits, Snowflake } from 'discord.js';
import {
    BaseHelpServiceInternal,
    CommandPermissionOptions,
    CommandSource,
    DefaultCommandCategory,
    DefaultCommandPermission,
    MemberListService,
    PandaDiscordBot,
    TimeoutService,
} from 'panda-discord';

import { SpindaGeneratorService } from './commands/lib/spinda/generator';
import { SpindaColors } from './commands/lib/spinda/util/spinda-colors';
import { CustomCommandService } from './custom-commands/custom-command-service';
import { DataService } from './data/data-service';
import { AutoTimeoutService } from './services/auto-timeout';
import { SpindaHelpService } from './services/help';
import { MediaWikiService } from './services/media-wiki';
import { PollsService } from './services/polls';
import { ResourceService } from './services/resources';

export const CommandCategory = {
    ...DefaultCommandCategory,
    Config: 'Config',
    Moderation: 'Moderation',
    Fun: 'Fun',
    Spinda: 'Spinda',
    External: 'External',
    Pokengine: 'Pok\u00E9ngine',
    Custom: 'Custom',
} as const;

export const CommandPermission = {
    ...DefaultCommandPermission,
    Moderator: {
        name: 'Moderator',
        memberPermissions:
            PermissionFlagsBits.ManageMessages |
            PermissionFlagsBits.KickMembers |
            PermissionFlagsBits.BanMembers |
            PermissionFlagsBits.ModerateMembers,
    } as CommandPermissionOptions,
    Administrator: {
        name: 'Administrator',
        memberPermissions: PermissionFlagsBits.Administrator,
    } as CommandPermissionOptions,
} as const;

export class SpindaDiscordBot extends PandaDiscordBot {
    public readonly commandCategories = Object.values(CommandCategory);
    public readonly commandPermissions = Object.values(CommandPermission);

    public getPrefix(guildId: Snowflake): string {
        return this.dataService.getCachedGuild(guildId).prefix;
    }

    public readonly color = SpindaColors.spot.hexString();

    public readonly helpService: SpindaHelpService = new SpindaHelpService(this, new BaseHelpServiceInternal(this));
    public readonly timeoutService: TimeoutService = new TimeoutService(this);
    public readonly memberListService: MemberListService = new MemberListService(this);

    public readonly dataService = new DataService(this);
    public readonly resourceService = new ResourceService(this);
    public readonly mediaWikiService = new MediaWikiService(this);
    public readonly spindaGeneratorService = new SpindaGeneratorService(this);
    public readonly customCommandService = new CustomCommandService(this);
    public readonly pollsService = new PollsService(this);
    public readonly autoTimeoutService = new AutoTimeoutService(3, this);

    public createJSONAttachment(data: object, name: string, src: CommandSource): AttachmentBuilder {
        return new AttachmentBuilder(Buffer.from(JSON.stringify(data)), {
            name: `${this.name.toLowerCase()}-${name}-${src.guild.id}-${new Date().valueOf()}.json`,
        });
    }

    public async initialize() {
        await this.dataService.initialize();
    }
}
