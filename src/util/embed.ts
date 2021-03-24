import { MessageEmbed } from 'discord.js';
import { DiscordBot } from '../bot';
import { SpindaColorPalettes } from '../commands/lib/spinda/util/spinda-colors';
import { PartialConstructible, PartialProps } from './partial-constructible';

export enum EmbedType {
    Normal,
    Error,
    Success,
}

export type EmbedProps = PartialProps<EmbedOptions>;

export class EmbedOptions extends PartialConstructible<EmbedOptions> {
    public footer: boolean | string = true;
    public timestamp: boolean = false;
    public type: EmbedType = EmbedType.Normal;

    private readonly colors = {
        default: SpindaColorPalettes.normal.base.hexString(),
        error: '#F04947',
        success: '#43B581',
        blank: '#2F3136',
    } as const;

    public create(bot: DiscordBot): MessageEmbed {
        const embed = new MessageEmbed();

        switch (this.type) {
            case EmbedType.Error: embed.setColor(this.colors.error); break;
            case EmbedType.Success: embed.setColor(this.colors.success); break;
            default: embed.setColor(this.colors.default); break;
        }
        
        if (this.timestamp) {
            embed.setTimestamp();
        }

        if (this.footer) {
            embed.setFooter(typeof this.footer === 'string' ? this.footer : bot.name, bot.iconUrl);
        }

        return embed;
    }
}

export namespace EmbedTemplates {
    export const Success = new EmbedOptions({ footer: false, type: EmbedType.Success });
    export const Error = new EmbedOptions({ footer: false, type: EmbedType.Error });
    export const Bare = new EmbedOptions({ footer: false });
    export const Log = new EmbedOptions({ footer: true, timestamp: true });
}