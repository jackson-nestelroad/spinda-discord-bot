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
    num: number;
    name: string;
    dexPath: string;
    imagePath: string;
}

export class CertifiedCommand implements Command {
    public names = ['certified'];
    public args = '(pok\u00E9dex) (pok\u00E9mon | number)';
    public description = 'Returns a a link to a Pok\u00E9mon or Fak\u00E9mon from the certified Pok\u00E9dexes on the Pok\u00E9ngine website. If no Pok\u00E9dex is given, a random one will be selected. If no Pok\u00E9mon or Dex Number is given, a random one will be selected.';
    public category = CommandCategory.Pokengine;
    public permission = CommandPermission.Everyone;

    public readonly baseUrl: string = 'http://pokengine.org';
    public readonly pokedexPath: string = '/pok\u00E9dex';
    public certifiedDexNames: WebScrapedPokedex[];

    private formatNum(num: number, length: number = 3): string {
        const str = num.toString();
        return str.length < length ? '0'.repeat(length - str.length) + str : str;
    }

    public async run(bot: DiscordBot, msg: Message, args: string[]) {
        // Retrieve certified dex information
        // We cache this data since it is very unlikely to change
        if (!this.certifiedDexNames) {
            const dexesResponse = await axios.get(encodeURI(this.baseUrl + this.pokedexPath), { responseEncoding: 'binary' } as any);
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
        let dex: WebScrapedPokedex = null;
        if (args.length > 0) {
            dex = this.certifiedDexNames.find(dex => dex.name.localeCompare(args[0], undefined, { sensitivity: 'base' }) === 0);
            if (!dex) {
                throw new Error(`Pok\u00E9dex "${args[0]}" does not exist or is not certified.`);
            }
        }
        else {
            dex = this.certifiedDexNames[Math.floor(Math.random() * this.certifiedDexNames.length)];
        }

        // Get dex page, this is somewhat of a slow operation
        const dexResponse = await axios.get(this.baseUrl + dex.dexPath + '?all', { responseEncoding: 'binary' } as any);

        // Gather data
        // TODO: Think about caching this data
        let mons: WebScrapedFakemon[] = [];
        cheerio(dexResponse.data).find('.dex-block').each((i, block) => {
            const ctx = cheerio(block);
            const split = ctx.text().split(' ');
            if (split.length > 1) {
                mons.push({ 
                    num: parseInt(split[0]),
                    name: split.slice(1).join(' '),
                    dexPath: ctx.attr('href'),
                    imagePath: ctx.find('img').attr('data-src')
                });
            }
        });

        if (mons.length === 0) {
            throw new Error(`Pok\u00E9dex "${dex.name}" is empty.`);
        }

        let chosenMon: WebScrapedFakemon = null;
        if (args.length > 1) {
            // User gave a dex number
            let dexNum = parseInt(args[1]);
            if (!isNaN(dexNum)) {
                chosenMon = mons.find(mon => mon.num === dexNum);
                if (!chosenMon) {
                    throw new Error(`#${dexNum} is out of range or private for Pok\u00E9dex ${dex.name}.`);
                }
            }
            // User gave a Fakemon name
            else {
                chosenMon = mons.find(mon => mon.name.localeCompare(args[1], undefined, { sensitivity: 'base' }) === 0);
                if (!chosenMon) {
                    throw new Error(`Pok\u00E9mon "${args[1]}" does not exist in Pok\u00E9dex ${dex.name}.`);
                }
            }
        }

        // Get a random Fakemon with a front sprite
        if (!chosenMon) {
            mons = mons.filter(mon => mon.imagePath && !mon.imagePath.endsWith('unknown.png'));
            chosenMon = mons[Math.floor(Math.random() * mons.length)];
        }

        // Send embed
        const embed = new MessageEmbed();
        embed.setColor(SpindaColors.spots.base.hexString);
        embed.setAuthor(dex.name, dex.iconPath ? this.baseUrl + '/' + dex.iconPath : undefined);
        embed.setTitle(`#${this.formatNum(chosenMon.num)} ${chosenMon.name}`);
        embed.setURL(decodeURI(this.baseUrl + chosenMon.dexPath));
        embed.setImage(this.baseUrl + chosenMon.imagePath);
        embed.setFooter(bot.name, bot.iconUrl);

        msg.channel.send(embed);
    }
}