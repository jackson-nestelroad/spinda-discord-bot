import { Command, CommandCategory, CommandPermission } from '../base';
import { DiscordBot } from '../../../bot';
import { Message, MessageEmbed } from 'discord.js';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { SpindaColors } from '../spinda/spinda-colors';

interface WebScrapedPokedex {
    name: string;
    dexPath: string;
    iconPath: string;
}

interface WebScrapedFakemon {
    text: string;
    dexPath: string;
    imagePath: string;
}

export class CertifiedCommand implements Command {
    public names = ['certified'];
    public args = '(pok\u00E9dex) (pok\u00E9mon | number)';
    public description = 'Returns a random Fak\u00E9mon from the certified Pok\u00E9dexes on the Pok\u00E9ngine website.';
    public category = CommandCategory.Pokengine;
    public permission = CommandPermission.Everyone;

    public readonly baseUrl: string = 'http://pokengine.org';
    public readonly pokedexPath: string = '/pok%C3%A9dex';
    public certifiedDexNames: WebScrapedPokedex[];

    public async run(bot: DiscordBot, msg: Message, args: string[]) {
        // Retrieve certified dex information
        // We cache this data since it is very unlikely to change
        if (!this.certifiedDexNames) {
            const dexesResponse = await axios.get(this.baseUrl + this.pokedexPath);
            this.certifiedDexNames = [];
            cheerio(dexesResponse.data).find('.dexes').first().find('a.button').each((i, button) => {
                const ctx = cheerio(button);
                this.certifiedDexNames.push({
                    name: ctx.text(),
                    dexPath: ctx.attr('href'),
                    iconPath: ctx.find('img').attr('src'),
                })
            });
        }

        // Get dex from first argument, or choose a random one
        const dex = this.certifiedDexNames.find(dex => dex.name.localeCompare(args[0], undefined, { sensitivity: 'base' }) === 0)
            || this.certifiedDexNames[Math.floor(Math.random() * this.certifiedDexNames.length)];

        // Get dex page, this is some what of a slow operation
        const dexResponse = await axios.get(this.baseUrl + dex.dexPath + '?all');

        // Gather data
        // TODO: Think about caching this data
        let mons: WebScrapedFakemon[] = [];
        cheerio(dexResponse.data).find('.dex-block').each((i, block) => {
            const ctx = cheerio(block);
            mons.push({ 
                text: ctx.text(),
                dexPath: ctx.attr('href'),
                imagePath: ctx.find('img').attr('data-src')
            });
        });



        let chosenMon: WebScrapedFakemon = null;
        if (args.length > 1) {
            // User gave a dex number
            let dexNum = parseInt(args[1]);
            if (!isNaN(dexNum) && dexNum > 0 && dexNum < mons.length && mons[dexNum - 1].imagePath) {
                chosenMon = mons[dexNum - 1];
            }
            // User gave a Fakemon name
            else {
                const name = args[1].toUpperCase();
                chosenMon = mons.find(mon => mon.text.toUpperCase().includes(name));
            }
        }

        // Get a random Fakemon with a front sprite
        if (!chosenMon || !chosenMon.imagePath) {
            mons = mons.filter(mon => mon.imagePath && !mon.imagePath.endsWith('unknown.png'));
            chosenMon = mons[Math.floor(Math.random() * mons.length)];
        }

        // Send embed
        const embed = new MessageEmbed();
        embed.setColor(SpindaColors.spots.base.hexString);
        embed.setAuthor(dex.name, dex.iconPath ? this.baseUrl + '/' + dex.iconPath : undefined);
        embed.setTitle(chosenMon.text);
        embed.setURL(this.baseUrl + chosenMon.dexPath);
        embed.setImage(this.baseUrl + chosenMon.imagePath);
        embed.setFooter(bot.name, bot.iconUrl);

        msg.channel.send(embed);
    }
}