import { Snowflake, MessageAttachment } from 'discord.js';
import {
    CommandPermissionValidatorConfig,
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
import { MediaWikiService } from './services/media-wiki';
import { ResourceService } from './services/resources';

export const CommandCategory = {
    ...DefaultCommandCategory,
    Config: 'Config',
    Fun: 'Fun',
    Spinda: 'Spinda',
    External: 'External',
    Pokengine: 'Pok\u00E9ngine',
    Custom: 'Custom',
} as const;

export const CommandPermission = {
    ...DefaultCommandPermission,
    Administrator: 'Administrator',
} as const;

export class SpindaDiscordBot extends PandaDiscordBot {
    public readonly commandCategories = Object.values(CommandCategory);

    public readonly permissionValidators: CommandPermissionValidatorConfig<this> = {
        [CommandPermission.Administrator]: params => params.src.member.permissions.has('ADMINISTRATOR'),
    } as const;

    public async getPrefix(guildId: Snowflake): Promise<string> {
        return (await this.dataService.getGuild(guildId)).prefix;
    }

    public readonly color = SpindaColors.spot.hexString();

    public readonly timeoutService: TimeoutService = new TimeoutService(this);
    public readonly memberListService: MemberListService = new MemberListService(this);

    public readonly dataService = new DataService(this);
    public readonly resourceService = new ResourceService(this);
    public readonly mediaWikiService = new MediaWikiService(this);
    public readonly spindaGeneratorService = new SpindaGeneratorService(this);
    public readonly customCommandService = new CustomCommandService(this);

    public createJSONAttachment(data: object, name: string, src: CommandSource): MessageAttachment {
        return new MessageAttachment(
            Buffer.from(JSON.stringify(data)),
            `${this.name.toLowerCase()}-${name}-${src.guild.id}-${new Date().valueOf()}.json`,
        );
    }

    public async initialize() {
        await this.dataService.initialize();
    }
}
