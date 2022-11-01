import axios from 'axios';
import { Attachment, Snowflake } from 'discord.js';
import {
    ArgumentType,
    ArgumentsConfig,
    CommandParameters,
    ComplexCommand,
    EmbedTemplates,
    NestedCommand,
    SimpleCommand,
    StandardCooldowns,
} from 'panda-discord';

import { CommandCategory, CommandPermission, SpindaDiscordBot } from '../../../bot';

interface GuildMemberSnapshot {
    nickname: string;
    roles: Snowflake[];
}

type GuildMembersSnapshot = Dictionary<GuildMemberSnapshot>;

class SaveSnapshotSubCommand extends SimpleCommand<SpindaDiscordBot> {
    public name = 'save';
    public description = 'Saves a new snapshot of the roles and nicknames of all guild members.';
    public category = CommandCategory.Inherit;
    public permission = CommandPermission.Inherit;
    public cooldown = StandardCooldowns.High;

    public async run({ bot, src, guildId }: CommandParameters<SpindaDiscordBot>) {
        const snapshot: GuildMembersSnapshot = {};
        const members = await bot.memberListService.getMemberListForGuild(guildId);
        for (const [id, member] of members) {
            snapshot[id] = {
                nickname: member.nickname,
                roles: [...member.roles.cache.keys()],
            };
        }

        const attachment = bot.createJSONAttachment(snapshot, 'snapshot', src);
        await src.send({ files: [attachment] });
    }
}

interface RestoreFromSnapshotArgs {
    snapshot: Attachment;
}

class RestoreFromSnapshotSubCommand extends ComplexCommand<SpindaDiscordBot, RestoreFromSnapshotArgs> {
    public name = 'restore';
    public description = 'Restores all guild members to the state described by an attached snapshot file.';
    public moreDescription = 'Attach the snapshot to the command message.';
    public category = CommandCategory.Inherit;
    public permission = CommandPermission.Inherit;
    public cooldown = { minutes: 5 };

    public args: ArgumentsConfig<RestoreFromSnapshotArgs> = {
        snapshot: {
            description: 'Snapshot created from `/snapshot-members save`.',
            type: ArgumentType.Attachment,
            required: true,
        },
    };

    public async run({ bot, src, guildId }: CommandParameters, args: RestoreFromSnapshotArgs) {
        const response = await axios.get(args.snapshot.url, { transformResponse: null });

        let guildSnapshot: any;
        try {
            guildSnapshot = JSON.parse(response.data);
        } catch (error) {
            throw new Error(`The file you attached is not a valid snapshot file.`);
        }

        const stats = {
            memberNotFound: 0,
            invalidFormat: 0,
            nicknamesModified: 0,
            nicknameErrors: 0,
            rolesModified: 0,
            rolesErrors: 0,
        };

        const members = await bot.memberListService.getMemberListForGuild(guildId);
        for (const userId in guildSnapshot) {
            if (!members.has(userId as Snowflake)) {
                ++stats.memberNotFound;
                continue;
            }

            const member = members.get(userId as Snowflake);
            const snapshot = guildSnapshot[userId] as GuildMemberSnapshot;

            const isValidSnapshot = snapshot.nickname !== undefined && Array.isArray(snapshot.roles);

            if (!isValidSnapshot) {
                ++stats.invalidFormat;
                continue;
            }

            if (member.nickname !== snapshot.nickname) {
                try {
                    await member.setNickname(snapshot.nickname);
                    ++stats.nicknamesModified;
                } catch (error) {
                    ++stats.nicknameErrors;
                }
            }

            // Only set roles if at least one role has been added or removed
            // If the sizes are different, then it's obvious something has changed
            let shouldSetRoles = snapshot.roles.length !== member.roles.cache.size;

            // If the sizes are different, check that every role in the snapshot
            // still exists on the member
            for (let i = 0; !shouldSetRoles && i < snapshot.roles.length; ++i) {
                if (!member.roles.cache.has(snapshot.roles[i])) {
                    shouldSetRoles = true;
                }
            }

            if (shouldSetRoles) {
                try {
                    await member.roles.set(snapshot.roles);
                    ++stats.rolesModified;
                } catch (error) {
                    ++stats.rolesErrors;
                }
            }
        }

        const embed = bot.createEmbed(EmbedTemplates.Success);
        embed.setDescription('Restored guild member snapshot.');
        embed.addFields({
            name: 'Stats',
            value: [
                `Members Not Found: ${stats.memberNotFound}`,
                `Invalid Snapshots: ${stats.invalidFormat}`,
                `Nicknames Modified: ${stats.nicknamesModified}`,
                `Nickname Errors: ${stats.nicknameErrors}`,
                `Roles Modified: ${stats.rolesModified}`,
                `Role Errors: ${stats.rolesErrors}`,
            ].join('\n'),
        });

        await src.send({ embeds: [embed] });
    }
}

export class SnapshotMembersCommand extends NestedCommand<SpindaDiscordBot> {
    public name = 'snapshot-members';
    public description = 'Creates or restores a snaphot of the roles and nicknames of all guild members.';
    public category = CommandCategory.Config;
    public permission = CommandPermission.Moderator;

    public subcommands = [SaveSnapshotSubCommand, RestoreFromSnapshotSubCommand];
}
