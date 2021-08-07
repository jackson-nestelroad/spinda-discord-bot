import axios from 'axios';
import * as cheerio from 'cheerio';
import {
    ArgumentsConfig,
    ArgumentType,
    CommandParameters,
    ComplexCommand,
    StandardCooldowns,
} from 'panda-discord';

import { CommandCategory, CommandPermission, SpindaDiscordBot } from '../../../bot';
import { WebScrapedPokedex, WebScrapedDexBlock, PokengineUtil } from './util';

interface CertifiedArgs {
    dex?: string;
    mon?: string;
}

export class CertifiedCommand extends ComplexCommand<SpindaDiscordBot, CertifiedArgs> {
    public name = 'certified';
    public description =
        'Returns a link to a Pok\u{00E9}mon or Fak\u{00E9}mon from the certified Pok\u{00E9}dexes on the Pok\u{00E9}ngine website.';
    public moreDescription =
        'If no Pok\u{00E9}dex is given, a random one will be selected. If no Pok\u{00E9}mon or Dex Number is given, a random one will be selected.';
    public category = CommandCategory.Pokengine;
    public permission = CommandPermission.Everyone;
    public cooldown = StandardCooldowns.Medium;

    public args: ArgumentsConfig<CertifiedArgs> = {
        dex: {
            description: 'Pok\u{00E9}dex name.',
            type: ArgumentType.String,
            required: false,
        },
        mon: {
            description: 'Pok\u{00E9}mon name or Pok\u{00E9}dex number',
            type: ArgumentType.RestOfContent,
            required: false,
        },
    };

    public readonly pokedexPath: string = '/pok\u{00E9}dex';
    public certifiedDexNames: WebScrapedPokedex[];

    public async run({ bot, src }: CommandParameters<SpindaDiscordBot>, args: CertifiedArgs) {
        await src.deferReply();

        // Retrieve certified dex information
        // We cache this data since it is very unlikely to change
        if (!this.certifiedDexNames) {
            const dexesResponse = await axios.get(PokengineUtil.encodeURI(PokengineUtil.baseUrl + this.pokedexPath), {
                responseEncoding: 'binary',
            } as any);
            this.certifiedDexNames = [];

            cheerio
                .load(dexesResponse.data)('.dexes')
                .first()
                .find('a.button')
                .each((i, button) => {
                    const ctx = cheerio.load(button);
                    this.certifiedDexNames.push({
                        name: ctx.root().text(),
                        dexPath: button.attribs['href'],
                        iconPath: '/' + ctx('img').attr('src'),
                    });
                });
        }

        // Get dex from first argument, or choose a random one
        let dex: WebScrapedPokedex = null;
        if (args.dex === undefined) {
            dex = this.certifiedDexNames[Math.floor(Math.random() * this.certifiedDexNames.length)];
        } else {
            dex = this.certifiedDexNames.find(
                dex => dex.name.localeCompare(args.dex, undefined, { sensitivity: 'base' }) === 0,
            );
            if (!dex) {
                throw new Error(`Pok\u00E9dex "${args.dex}" does not exist or is not certified.`);
            }
        }

        // Get dex page, this is somewhat of a slow operation
        const dexResponse = await axios.get(PokengineUtil.baseUrl + dex.dexPath + '?all', {
            responseEncoding: 'binary',
        } as any);

        // Gather data
        // TODO: Think about caching this data
        let mons: WebScrapedDexBlock[] = [];
        cheerio
            .load(dexResponse.data)('.dex-block')
            .each((i, block) => {
                const ctx = cheerio.load(block).root();
                const split = ctx.text().split(' ');
                if (split.length > 1) {
                    mons.push({
                        num: parseInt(split[0]),
                        name: split.slice(1).join(' '),
                        pagePath: block.attribs['href'],
                        imagePath: ctx.find('img').attr('data-src'),
                    });
                }
            });

        if (mons.length === 0) {
            throw new Error(`Pok\u{00E9}dex "${dex.name}" is empty.`);
        }

        let chosenMon: WebScrapedDexBlock = null;
        if (args.mon !== undefined) {
            // User gave a dex number
            let dexNum = parseInt(args[1]);
            if (!isNaN(dexNum)) {
                chosenMon = mons.find(mon => mon.num === dexNum);
                if (!chosenMon) {
                    throw new Error(`#${dexNum} is out of range or private for Pok\u{00E9}dex ${dex.name}.`);
                }
            }
            // User gave a Fakemon name
            else {
                chosenMon = mons.find(
                    mon => mon.name.localeCompare(args.mon, undefined, { sensitivity: 'base' }) === 0,
                );
                if (!chosenMon) {
                    throw new Error(`Pok\u{00E9}mon "${args.mon}" does not exist in Pok\u{00E9}dex ${dex.name}.`);
                }
            }
        }

        // Get a random Fakemon with a front sprite
        if (!chosenMon) {
            mons = mons.filter(mon => mon.imagePath && !mon.imagePath.endsWith('unknown2.png'));
            chosenMon = mons[Math.floor(Math.random() * mons.length)];
        }

        // Send embed
        const embed = bot.createEmbed();
        PokengineUtil.embedDexBlock(embed, chosenMon);
        embed.setAuthor(dex.name, dex.iconPath ? PokengineUtil.baseUrl + dex.iconPath : undefined);

        await src.send({ embeds: [embed] });
    }
}
