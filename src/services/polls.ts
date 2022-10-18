import {
    ActionRow,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonComponent,
    ButtonInteraction,
    ButtonStyle,
    ComponentType,
    EmbedBuilder,
    Guild,
    GuildTextBasedChannel,
    Message,
    PermissionFlagsBits,
    Snowflake,
    User,
} from 'discord.js';
import moment, { Duration } from 'moment';
import { BaseService, EmbedTemplates } from 'panda-discord';

interface ActivePoll {
    user: User;
    guild: Guild;
    channelId: Snowflake;
    messageId: Snowflake;
    startedAt: Date;
    duration: Duration;
    question: string;
    options: string[];
    votes: Map<Snowflake, number>;
    timeoutId: ReturnType<typeof setTimeout>;
}

type SubmittedPoll = Omit<ActivePoll, 'messageId' | 'votes' | 'timeoutId'>;

enum PollOptionMetadata {
    Style = 'style',
    Emoji = 'emoji',
}

interface OptionMetadataResult {
    value: string;
    metadata: Map<string, string>;
}

interface PollVoteCustomId {
    userId: Snowflake;
    index: number;
}

export class PollsService extends BaseService {
    public static readonly buttonIdPrefix = 'poll';

    private userIdToPoll: Map<Snowflake, ActivePoll> = new Map();

    public hasPoll(userId: Snowflake): boolean {
        return this.userIdToPoll.has(userId);
    }

    public clearPolls(): void {
        this.userIdToPoll.clear();
    }

    // Metadata takes the form of {key value}
    private parseOptionMetadata(option: string): OptionMetadataResult {
        const result: OptionMetadataResult = { value: option, metadata: new Map() };
        let index = 0;
        while (index < result.value.length) {
            const startIndex = result.value.indexOf('{', index);
            if (startIndex < 0) {
                break;
            }

            const endIndex = result.value.indexOf('}', startIndex + 1);
            if (endIndex < 0) {
                break;
            }

            const metadata = result.value.substring(startIndex + 1, endIndex);
            const spaceIndex = metadata.indexOf(' ');
            if (spaceIndex < 0) {
                // No space, so this isn't a valid metadata value
                index = endIndex + 1;
                continue;
            }

            const key = metadata.substring(0, spaceIndex);
            const value = metadata.substring(spaceIndex + 1).trim();
            result.metadata.set(key, value);
            result.value = result.value.substring(0, startIndex) + result.value.substring(endIndex + 1);
        }

        result.value = result.value.trim();
        return result;
    }

    private getResults(options: string[], votes: Map<any, number>): [number, number][] {
        const counts = options.reduce((counts, option, index) => {
            counts.push([index, 0]);
            return counts;
        }, [] as [number, number][]);
        for (const vote of votes.values()) {
            ++counts[vote][1];
        }
        counts.sort(([aIndex, aCount], [bIndex, bCount]) => bCount - aCount);
        return counts;
    }

    private createDescription(options: string[], results: [number, number][]): string {
        const strings = results.map(([index, count]) => `${options[index]}: ${count}`);
        if (strings[0]) {
            strings[0] = `\u{1F947}${strings[0]}`;
        }
        if (strings[1]) {
            strings[1] = `\u{1F948}${strings[1]}`;
        }
        if (strings[2]) {
            strings[2] = `\u{1F949}${strings[2]}`;
        }
        return strings.join('\n');
    }

    private createCustomId(userId: Snowflake, index: number): string {
        return `${PollsService.buttonIdPrefix}-${userId}-${index}`;
    }

    private parseCustomId(customId: string): PollVoteCustomId {
        const split = customId.split('-');
        if (split.length !== 3) {
            throw new Error(`Custom ID is not formatted correctly for a poll vote.`);
        }
        return {
            userId: split[1],
            index: parseInt(split[2]),
        };
    }

    public async createPoll(newPoll: SubmittedPoll): Promise<void> {
        if (this.userIdToPoll.has(newPoll.user.id)) {
            throw new Error(`You already have an ongoing poll! You can end your poll using \`/poll end\``);
        }

        const channel = await newPoll.guild.channels.fetch(newPoll.channelId);
        if (!channel.isTextBased() || channel.isDMBased()) {
            throw new Error(`Invalid channel type.`);
        }

        if (!channel.permissionsFor(newPoll.guild.members.me).has(PermissionFlagsBits.SendMessages)) {
            throw new Error(`Cannot create a poll in a channel I cannot send messages in.`);
        }

        if (newPoll.options.length < 2) {
            throw new Error(`Poll must have at least two options.`);
        }

        // Discord limit
        if (newPoll.options.length > 25) {
            throw new Error(`Poll cannot have over 25 options.`);
        }

        const embed = this.bot.createEmbed(EmbedTemplates.Bare);
        embed.setAuthor({ name: newPoll.user.tag, iconURL: newPoll.user.avatarURL() });
        embed.setTitle(newPoll.question);

        embed.addFields(
            {
                name: 'Started At',
                value: newPoll.startedAt.toLocaleString(),
                inline: true,
            },
            {
                name: 'Ends At',
                value: moment(newPoll.startedAt).add(newPoll.duration).toDate().toLocaleString(),
                inline: true,
            },
        );

        let index = 0;
        let currentRow: ActionRowBuilder<ButtonBuilder> = null;
        const rows: ActionRowBuilder<ButtonBuilder>[] = [];
        const parsedOptions: string[] = [];
        for (const option of newPoll.options) {
            if (!currentRow) {
                currentRow = new ActionRowBuilder();
                rows.push(currentRow);
            }

            const parsedOption = this.parseOptionMetadata(option);
            parsedOptions.push(parsedOption.value);

            const button = new ButtonBuilder();
            button.setLabel(parsedOption.value);
            button.setCustomId(this.createCustomId(newPoll.user.id, index));
            button.setStyle(ButtonStyle.Primary);

            if (parsedOption.metadata.has(PollOptionMetadata.Style)) {
                const style = parsedOption.metadata.get(PollOptionMetadata.Style);
                if ('primary'.localeCompare(style, undefined, { sensitivity: 'base' }) === 0) {
                    button.setStyle(ButtonStyle.Primary);
                } else if ('secondary'.localeCompare(style, undefined, { sensitivity: 'base' }) === 0) {
                    button.setStyle(ButtonStyle.Secondary);
                } else if ('success'.localeCompare(style, undefined, { sensitivity: 'base' }) === 0) {
                    button.setStyle(ButtonStyle.Success);
                } else if ('danger'.localeCompare(style, undefined, { sensitivity: 'base' }) === 0) {
                    button.setStyle(ButtonStyle.Danger);
                }
            }

            if (parsedOption.metadata.has(PollOptionMetadata.Emoji)) {
                button.setEmoji(parsedOption.metadata.get(PollOptionMetadata.Emoji));
            }

            currentRow.addComponents(button);
            if (currentRow.components.length === 5) {
                currentRow = null;
            }

            ++index;
        }

        embed.setDescription(this.createDescription(parsedOptions, this.getResults(parsedOptions, new Map())));

        const message = await channel.send({ embeds: [embed], components: rows });

        const timeoutId = setTimeout(() => {
            this.endPoll(newPoll.user.id).catch(error => {
                // Ignore
            });
        }, newPoll.duration.asMilliseconds());

        const poll: ActivePoll = {
            ...newPoll,
            options: parsedOptions,
            messageId: message.id,
            votes: new Map(),
            timeoutId,
        };
        this.userIdToPoll.set(poll.user.id, poll);
    }

    public async endPoll(userId: Snowflake): Promise<void> {
        if (!this.userIdToPoll.has(userId)) {
            throw new Error(`You do not have an active poll.`);
        }

        const poll = this.userIdToPoll.get(userId);
        this.userIdToPoll.delete(userId);

        clearTimeout(poll.timeoutId);

        const channel = (await poll.guild.channels.fetch(poll.channelId)) as GuildTextBasedChannel;
        const message = await channel.messages.fetch(poll.messageId);
        if (!message) {
            throw new Error(`Poll message does not exist.`);
        }

        await this.endPollMessage(message, true);
    }

    public async updatePollMessage(poll: ActivePoll): Promise<void> {
        const channel = (await poll.guild.channels.fetch(poll.channelId)) as GuildTextBasedChannel;
        const message = await channel.messages.fetch(poll.messageId);

        const embed = EmbedBuilder.from(message.embeds[0]);
        embed.setDescription(this.createDescription(poll.options, this.getResults(poll.options, poll.votes)));
        await message.edit({ embeds: [embed], components: message.components });
    }

    public isPollVote(interaction: ButtonInteraction): boolean {
        return interaction.customId.startsWith(PollsService.buttonIdPrefix);
    }

    private pollMessageIsFinished(message: Message): boolean {
        const embed = message.embeds[0];
        if (!embed) {
            return true;
        }

        const endedField = embed.fields[1];
        return !endedField || endedField.name === 'Ended At';
    }

    private async endPollMessage(message: Message, force: boolean = false): Promise<void> {
        if (!force && (this.pollMessageIsFinished(message) || message.embeds.length === 0)) {
            return;
        }

        const embed = EmbedBuilder.from(message.embeds[0]);
        if (embed.data.fields.length < 2) {
            return;
        }
        embed.data.fields[1].name = 'Ended At';
        embed.data.fields[1].value = new Date().toLocaleString();

        const components: ActionRowBuilder<ButtonBuilder>[] = [];
        for (const row of message.components as ActionRow<ButtonComponent>[]) {
            const newRow = new ActionRowBuilder<ButtonBuilder>();
            for (const component of row.components) {
                if (component.type === ComponentType.Button) {
                    newRow.addComponents(ButtonBuilder.from(component).setDisabled());
                }
            }
            components.push(newRow);
        }

        await message.edit({ embeds: [embed], components });
    }

    private throwPollNoLongerRunning(): never {
        throw new Error(`Poll is no longer running.`);
    }

    private async getPoll(message: Message, userId: Snowflake): Promise<ActivePoll> {
        if (!this.userIdToPoll.has(userId)) {
            // We got a poll that we don't know about and isn't ended, so we force it to end
            // This occurs when the bot restarts as a poll is running
            if (!this.pollMessageIsFinished(message)) {
                await this.endPollMessage(message);
            }

            this.throwPollNoLongerRunning();
        }

        const poll = this.userIdToPoll.get(userId);
        if (poll.messageId !== message.id) {
            // We received an interaction for a poll we are no longer managing
            await this.endPollMessage(message);
            this.throwPollNoLongerRunning();
        }
        return poll;
    }

    public async handleInteraction(interaction: ButtonInteraction): Promise<void> {
        const { userId, index } = this.parseCustomId(interaction.customId);
        const poll = await this.getPoll(interaction.message, userId);

        if (index < 0 || index >= poll.options.length) {
            throw new Error(`Invalid option for poll.`);
        }

        // At this point, we have established that this vote is valid
        poll.votes.set(interaction.user.id, index);

        await this.updatePollMessage(poll);

        await interaction.reply({ content: 'Vote received.', ephemeral: true });
    }
}
