import { Command, CommandCategory, CommandPermission, CommandParameters } from '../base';

export class BotsnackCommand implements Command {
    public name = 'botsnack';
    public args = '';
    public description = 'Rewards the bot for good behavior.'
    public category = CommandCategory.Fun;
    public permission = CommandPermission.Everyone;

    public async run({ msg }: CommandParameters) {
        await msg.channel.send('botsnack, mmmmmm...');
    }
}