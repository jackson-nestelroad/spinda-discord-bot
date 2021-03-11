import { Command, CommandCategory, CommandPermission, CommandParameters, StandardCooldowns } from '../base';
import { Channel, TextChannel } from 'discord.js';

export class SayCommand extends Command {
    public name = 'say';
    public args = '(channel) message';
    public description = 'Repeats your message.';
    public category = CommandCategory.Secret;
    public permission = CommandPermission.Administrator;
    public cooldown = StandardCooldowns.Low;

    public async run({ msg, args, content }: CommandParameters) {
        let channel: Channel = msg.channel;
        
        // First argument may be a channel mention
        if (msg.mentions.channels.size > 0 && args.length > 0 && args[0] === msg.mentions.channels.first().toString()) {
            const channelMention = args.shift();
            content = content.substr(channelMention.length).trimLeft();
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

        await (channel as TextChannel).send(content);
        if (msg.deletable) {
            await msg.delete();
        }
    }
}