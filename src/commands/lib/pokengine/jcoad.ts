import { Command, CommandCategory, CommandPermission, CommandParameters, StandardCooldowns } from '../base';
import axios from 'axios';

export class JcoadCommand extends Command {
    public readonly docUrl: string = 'https://pokengine-jcoad.readthedocs.io';

    public name = 'jcoad';
    public args = '(query)';
    public description = `Searches the jCoad documentation.`;
    public category = CommandCategory.Pokengine;
    public permission = CommandPermission.Everyone;
    public cooldown = StandardCooldowns.Medium;

    private readonly apiPath: string = '/_/api/v2/search/?format=json&project=pokengine-jcoad&version=latest&q=';
    private readonly accentRegex: RegExp = /([P|p]ok)e(mon|ngine)/g;
    private readonly resultsLength = 10;

    private readonly roles: Dictionary<string> = {
        'jcoad:function': ':regional_indicator_f: ',
        'jcoad:property': ':regional_indicator_p: ',
        'jcoad:trigger': ':regional_indicator_t: &',
        'jcoad:condition': ':regional_indicator_c: ',
        'jcoad:type': ':regional_indicator_y: ',
        'jcoad:pokeoption': ':regional_indicator_o: ',
    } as const;

    public async run({ bot, msg, content }: CommandParameters) {
        if (!content) {
            await msg.channel.send(this.docUrl);
        }
        else {
            const query = content.replace(this.accentRegex, '$1\u00E9$2')
            const url = this.docUrl + this.apiPath + encodeURIComponent(query);
            const response = await axios.get(url, { responseType: 'json' });
            if (response.status !== 200) {
                throw new Error(`Invalid HTTP response: ${response.status}`);
            }

            const results = response.data.results;
            if (!results || !Array.isArray(results)) {
                throw new Error(`Invalid data format received: ${typeof results}`);
            }

            const embed = bot.createEmbed();
            embed.setTitle('Pok\u00E9ngine jCoad Documentation');
            embed.setURL(this.docUrl);
            embed.setAuthor(`Top results for "${content}"`);

            if (results.length === 0) {
                embed.setDescription('No results found!');
            }
            else {
                const codeResults: string[] = [];
                const nonCodeResults: string[] = [];
                for (const result of results) {
                    // Found 10 code options, so we can't add anything else
                    if (codeResults.length === this.resultsLength) {
                        break;
                    }

                    const pageUrl = result.domain + result.path;
                    for (const block of result.blocks) {
                        let blockUrl = pageUrl;
                        if (block.id) {
                            blockUrl += '#' + block.id;
                        }

                        // Found a code result
                        if (block.role && this.roles[block.role]) {
                            const text = this.roles[block.role] + block.name.substr(block.name.indexOf('-') + 1);
                            codeResults.push(`[${text}](${blockUrl})`)
                        }
                        // Other result, only add it if we will use it
                        else if (nonCodeResults.length < this.resultsLength - codeResults.length && block.title) {
                            nonCodeResults.push(`[${block.title}](${blockUrl})`);
                        }
                    }

                    const embedBody: string[] = [];
                    for (let i = 0; i < codeResults.length && embedBody.length < this.resultsLength; ++i) {
                        embedBody.push(codeResults[i]);
                    }
                    for (let i = 0; i < nonCodeResults.length && embedBody.length < this.resultsLength; ++i) {
                        embedBody.push(nonCodeResults[i]);
                    }

                    embed.setDescription(embedBody.join('\n'));
                }
            }

            await msg.channel.send(embed);
        }
    }
}