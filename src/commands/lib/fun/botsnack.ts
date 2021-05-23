import { CommandCategory, CommandPermission, CommandParameters, StandardCooldowns, SimpleCommand } from '../base';

export class BotsnackCommand extends SimpleCommand {
    public name = 'botsnack';
    public description = 'Rewards the bot for good behavior.'
    public category = CommandCategory.Fun;
    public permission = CommandPermission.Everyone;
    public cooldown = StandardCooldowns.Low;

    public async run({ src }: CommandParameters) {
        await src.send('botsnack, mmmmmm...');
    }
}