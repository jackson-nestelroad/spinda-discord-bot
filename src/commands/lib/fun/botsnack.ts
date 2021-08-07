import { CommandParameters, SimpleCommand, StandardCooldowns } from 'panda-discord';

import { CommandCategory, CommandPermission, SpindaDiscordBot } from '../../../bot';

export class BotsnackCommand extends SimpleCommand<SpindaDiscordBot> {
    public name = 'botsnack';
    public description = 'Rewards the bot for good behavior.';
    public category = CommandCategory.Fun;
    public permission = CommandPermission.Everyone;
    public cooldown = StandardCooldowns.Low;

    public async run({ src }: CommandParameters<SpindaDiscordBot>) {
        await src.send('botsnack, mmmmmm...');
    }
}
