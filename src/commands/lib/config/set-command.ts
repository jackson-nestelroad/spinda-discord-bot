import { Command, CommandCategory, CommandPermission, CommandParameters } from '../base';
import { CustomCommandEngine } from '../../../events/util/custom-command';

export class SetCommandCommand implements Command {
    public name = 'set-command';
    public args = 'command message';
    public description = `
Sets a custom command for the guild that responds with the given message.

You may use the following variables in the command message to customize your command's response.

${Object.entries(CustomCommandEngine.AllOptions).map(([category, options]) => `${category}:\n${options.map(opt => `\`${opt}\``).join(', ')}`).join('\n')}
`;
    public category = CommandCategory.Config;
    public permission = CommandPermission.Administrator;

    public async run({ bot, msg, content, guild }: CommandParameters) {

        const args = content.split(/\s+/);
        if (args.length < 2) {
            throw new Error(`Invalid command. Use \`${guild.prefix}help set-command\` to custom command format.`)
        }

        const command = args.shift().toLowerCase();
        if (bot.commands.has(command)) {
            throw new Error(`Cannot overwrite \`${command}\` command.`);
        }

        content = content.substr(command.length).trimLeft();

        bot.dataService.setCustomCommand(msg.guild.id, command, content);
        
        const embed = bot.createEmbed({ footer: false, timestamp: false, success: true });
        embed.setDescription(`Successfully set command \`${command}\`.`);
        await msg.channel.send(embed);
    }
}