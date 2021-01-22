import { Command, CommandCategory, CommandPermission, CommandParameters } from '../base';
import axios from 'axios';

export class JcoadCommand implements Command {
    public readonly docUrl: string = 'https://pokengine-jcoad.readthedocs.io';
    public readonly apiPath: string = '/_/api/v2/search/?format=json&project=pokengine-jcoad&version=latest&q=';

    public name = 'jcoad';
    public args = '(query)';
    public description = `Searches the jCoad documentation.`;
    public category = CommandCategory.Pokengine;
    public permission = CommandPermission.Everyone;

    public async run({ bot, msg, content }: CommandParameters) {
        if (!content) {
            await msg.channel.send(this.docUrl);
        }
        else {
            const url = this.docUrl + this.apiPath + encodeURIComponent(content);
            const response = await axios.get(url, { responseType: 'json' });
            if (response.status !== 200) {
                throw new Error(`Invalid HTTP response: ${response.status}`);
            }

            const embed = bot.createEmbed();
            embed.setTitle('Pok\u00E9ngine jCoad Documentation');
            embed.setURL(this.docUrl);
            embed.setAuthor(`Top results for "${content}"`);
            embed.setDescription('TODO');

            await msg.channel.send(embed);
        }
    }
}