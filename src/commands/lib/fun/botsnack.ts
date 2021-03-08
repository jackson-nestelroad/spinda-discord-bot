import { Command, CommandCategory, CommandPermission, CommandParameters, StandardCooldowns } from '../base';

export class BotsnackCommand extends Command {
    public name = 'botsnack';
    public args = '';
    public description = 'Rewards the bot for good behavior.'
    public category = CommandCategory.Fun;
    public permission = CommandPermission.Everyone;
    public cooldown = StandardCooldowns.low;

    public async run({ msg }: CommandParameters) {
        await msg.channel.send('botsnack, mmmmmm...');
    }
}