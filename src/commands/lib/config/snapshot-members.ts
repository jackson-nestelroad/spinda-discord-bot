import axios from 'axios';
import { MessageAttachment, Snowflake } from 'discord.js';
import { EmbedTemplates } from '../../../util/embed';
import { CommandCategory, CommandPermission, CommandParameters, NestedCommand, SimpleCommand, StandardCooldowns } from '../base';

interface GuildMemberSnapshot {
    nickname: string;
    roles: Snowflake[];
}

type GuildMembersSnapshot = Dictionary<GuildMemberSnapshot>;

class SaveSnapshotSubCommand extends SimpleCommand {
    public name = 'save';
    public description = 'Saves a new snapshot of the roles and nicknames of all guild members.';
    public category = CommandCategory.Config;
    public permission = CommandPermission.Administrator;
    public cooldown = StandardCooldowns.High;

    public async run({ bot, src, guild }: CommandParameters) {
        const snapshot: GuildMembersSnapshot = { };
        const members = await bot.memberListService.getMemberListForGuild(guild.id);
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

class RestoreFromSnapshotSubCommand extends SimpleCommand {
    public name = 'restore';
    public description = 'Restores all guild members to the state described by an attached snapshot file.';
    public moreDescription = 'Attach the snapshot to the command message.';
    public category = CommandCategory.Config;
    public permission = CommandPermission.Administrator;
    public cooldown = { minutes: 5 };

    public async run({ bot, src, guild }: CommandParameters) {
        if (!src.isMessage) {
            throw new Error(`This command must be run as a chat command.`);
        }

        const msg = src.message;
        if (msg.attachments.size === 0) {
            throw new Error(`Missing snapshot JSON file.`);
        }

        const snapshotAttachment = msg.attachments.first();

        const response = await axios.get(snapshotAttachment.url, { transformResponse: null });
        
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

        const members = await bot.memberListService.getMemberListForGuild(guild.id);
        for (const userId in guildSnapshot) {
            if (!members.has(userId as Snowflake)) {
                ++stats.memberNotFound;
                continue;
            }

            const member = members.get(userId as Snowflake);
            const snapshot = guildSnapshot[userId] as GuildMemberSnapshot;
            
            const isValidSnapshot = 
                snapshot.nickname !== undefined
                && Array.isArray(snapshot.roles);
            
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
            let shouldSetRoles = false;

            const seenRoleIds: Set<Snowflake> = new Set();
            // Check for roles that have been removed
            for (let i = 0; i < snapshot.roles.length; ++i) {
                seenRoleIds.add(snapshot.roles[i]);
                if (!member.roles.cache.has(snapshot.roles[i])) {
                    shouldSetRoles = true;
                    break;
                }
            }
            // Check for roles that have been added
            if (!shouldSetRoles) {
                for (const [id, role] of member.roles.cache) {
                    if (!seenRoleIds.has(id)) {
                        shouldSetRoles = true;
                        break;
                    }
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
        embed.addField('Stats', [
            `Members Not Found: ${stats.memberNotFound}`,
            `Invalid Snapshots: ${stats.invalidFormat}`,
            `Nicknames Modified: ${stats.nicknamesModified}`,
            `Nickname Errors: ${stats.nicknameErrors}`,
            `Roles Modified: ${stats.rolesModified}`,
            `Role Errors: ${stats.rolesErrors}`,
        ].join('\n'));

        await src.send({ embeds: [embed] });
    }
}

export class SnapshotMembersCommand extends NestedCommand {
    public name = 'snapshot-members';
    public description = 'Creates or restores a snaphot of the roles and nicknames of all guild members.';
    public category = CommandCategory.Config;
    public permission = CommandPermission.Administrator;

    public disableSlash = true;

    public initializeShared() { }

    public subCommands = [
        SaveSnapshotSubCommand,
        RestoreFromSnapshotSubCommand,
    ];
}