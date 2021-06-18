import { CommandCategory, CommandPermission, CommandParameters, NestedCommand, SimpleCommand } from '../base';

class SaveSnapshotSubCommand extends SimpleCommand {
    public name = 'save';
    public description = 'Saves a new snapshot of the roles and nicknames of all guild members.';
    public category = CommandCategory.Config;
    public permission = CommandPermission.Administrator;

    public async run({ bot, src }: CommandParameters) {
        await src.reply('Save');
    }
}

class RestoreFromSnapshotSubCommand extends SimpleCommand {
    public name = 'restore';
    public description = 'Restores all guild members to the state described by an attached snapshot file.';
    public moreDescription = 'Attach the snapshot to the command message.';
    public category = CommandCategory.Config;
    public permission = CommandPermission.Administrator;

    public async run({ bot, src }: CommandParameters) {
        await src.reply('Restore');
    }
}

export class SnapshotMembersCommand extends NestedCommand {
    public name = 'snapshot-members';
    public description = 'Creates or restores a snaphot of the roles and nicknames of all guild members.';
    public category = CommandCategory.Config;
    public permission = CommandPermission.Administrator;

    public disableSlash = true;

    public subCommandConfig = [
        SaveSnapshotSubCommand,
        RestoreFromSnapshotSubCommand,
    ];
}