import { Command, CommandCategory, CommandPermission } from '../base';
import { DiscordBot } from '../../../bot';
import { Message, Channel, TextChannel } from 'discord.js';

export class SayCommand implements Command {
    public name = 'say';
    public args = '(channel) message';
    public description = 'Repeats your message.';
    public category = CommandCategory.Secret;
    public permission = CommandPermission.Administrator;

    public async run(bot: DiscordBot, msg: Message, args: string[]) {
        let channel: Channel = msg.channel;
        
        // First argument may be a channel mention
        if (msg.mentions.channels.size > 0 && args.length > 0 && args[0] === msg.mentions.channels.first().toString()) {
            const channelMention = args.shift();
            const id = channelMention.substring(2, channelMention.length - 1);
            channel = msg.guild.channels.cache.get(id);
            if (!channel) {
                throw new Error(`Channel id ${id} not found.`);
            }
        }

        if (args.length === 0) {
            return;
        }
        if (channel.type !== 'text') {
            throw new Error(`Cannot send a message to a ${channel.type} channel.`);
        }

        await (channel as TextChannel).send(args.join(' '));
        if (msg.deletable) {
            await msg.delete();
        }
    }
}