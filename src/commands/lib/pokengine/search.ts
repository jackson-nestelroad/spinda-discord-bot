import axios from 'axios';
import * as cheerio from 'cheerio';
import { MessageEmbed } from 'discord.js';
import {
    ArgumentType,
    ArgumentsConfig,
    CommandParameters,
    CommandSource,
    ComplexCommand,
    StandardCooldowns,
} from 'panda-discord';

import { CommandCategory, CommandPermission, SpindaDiscordBot } from '../../../bot';
import { PokengineUtil } from './util';

enum SearchTabs {
    'Mons',
    'Auction',
    'Moves',
    'Items',
    'Abilities',
    'Players',
    'Maps',
    'Trainers',
    'Forums',
}

type SearchTab = keyof typeof SearchTabs;

interface SearchArgs {
    query: string;
    n: number;
    page: number;
}

type SearchTabHandler = (i: number, results: cheerio.CheerioAPI, embed: MessageEmbed) => void;

export class SearchCommand extends ComplexCommand<SpindaDiscordBot, SearchArgs> {
    public readonly searchPath: string = '/search';

    public name = 'search';
    public description = `Searches the Pok\u{00E9}ngine website with a given query and returns the first result only.`;
    public moreDescription = `If you can't find what you're looking for, be more specific!\n\nSee [this page](${this.searchFor(
        'help',
    )}) for help.`;
    public category = CommandCategory.Pokengine;
    public permission = CommandPermission.Everyone;
    public cooldown = StandardCooldowns.Medium;

    public args: ArgumentsConfig<SearchArgs> = {
        query: {
            description: 'Search query, including any filters.',
            type: ArgumentType.RestOfContent,
            required: true,
        },
        n: {
            description: 'Search result index to show. Default is 1 (first).',
            type: ArgumentType.Integer,
            required: false,
            named: true,
            default: 1,
            transformers: {
                any: (value, result) => {
                    if (value <= 0) {
                        result.error = 'N must be a positive integer.';
                    }
                    result.value = value;
                },
            },
        },
        page: {
            description: 'Page offset. Default is 1 (first).',
            type: ArgumentType.Integer,
            required: false,
            named: true,
            default: 1,
            transformers: {
                any: (value, result) => {
                    if (value <= 0) {
                        result.error = 'Page must be a positive integer.';
                    }
                    result.value = value;
                },
            },
        },
    };

    public tabNamesToUpperCase: Map<SearchTabs, string> = null;

    public searchTabHandlers: { [tab in SearchTabs]: SearchTabHandler } = {
        [SearchTabs.Mons]: (i, results, embed) => {
            const [dexBlock, handle] = this.handleDexBlock(i, results, embed);
            if (handle) {
                PokengineUtil.embedDexBlock(embed, {
                    num: parseInt(dexBlock.attr('data-id')),
                    name: dexBlock.attr('title'),
                    pagePath: dexBlock.attr('href'),
                    imagePath: dexBlock.find('img').attr('data-src'),
                });
            }
        },
        [SearchTabs.Auction]: (i, results, embed) => {
            const [dexBlock, handle] = this.handleDexBlock(i, results, embed);
            if (handle) {
                const levelMatch = dexBlock.text().match(/^Lv\.(\d+)/);
                const level = levelMatch ? levelMatch[1] : '???';
                PokengineUtil.embedDexBlock(embed, {
                    name: `Lv. ${level} ${dexBlock.attr('title')}`,
                    pagePath: dexBlock.attr('href'),
                    imagePath: dexBlock.find('img').attr('data-src'),
                });
                const bottomEntryNodes = dexBlock.find('span.time').contents();
                for (let i = 0; i < bottomEntryNodes.length; ++i) {
                    const nodeText = bottomEntryNodes.eq(i).text();
                    if (nodeText) {
                        const field = nodeText.split(':');
                        if (field.length === 2) {
                            embed.addField(field[0].trim(), field[1].trim(), true);
                        }
                    }
                }
            }
        },
        [SearchTabs.Trainers]: (i, results, embed) => {
            const [dexBlock, handle] = this.handleDexBlock(i, results, embed);
            if (handle) {
                PokengineUtil.embedDexBlock(embed, {
                    name: dexBlock.text(),
                    pagePath: dexBlock.attr('href'),
                    imagePath: dexBlock.find('img').attr('data-src'),
                });
            }
        },
        [SearchTabs.Moves]: (i, results, embed) => {
            const [cols, handle] = this.handleSearchTable(i, results, embed);
            if (handle) {
                PokengineUtil.embedMove(embed, {
                    num: parseInt(cols.eq(0).text().substr(1)),
                    name: cols.eq(1).text(),
                    type: cols.eq(2).text() as any,
                    category: cols.eq(3).text() as any,
                    description: cols.last().text(),
                    pagePath: cols.eq(1).find('a').attr('href'),
                });
            }
        },
        [SearchTabs.Items]: (i, results, embed) => {
            const [cols, handle] = this.handleSearchTable(i, results, embed);
            if (handle) {
                PokengineUtil.embedItem(embed, {
                    num: parseInt(cols.eq(0).text().substr(1)),
                    name: cols.eq(2).text(),
                    description: cols.eq(3).text(),
                    pagePath: cols.eq(2).find('a').attr('href'),
                    imagePath: cols.eq(1).find('img').attr('data-src'),
                });
            }
        },
        [SearchTabs.Abilities]: (i, results, embed) => {
            const [cols, handle] = this.handleSearchTable(i, results, embed);
            if (handle) {
                PokengineUtil.embedAbility(embed, {
                    num: parseInt(cols.eq(0).text().substr(1)),
                    name: cols.eq(1).text(),
                    description: cols.eq(2).text(),
                    pagePath: cols.eq(1).find('a').attr('href'),
                });
            }
        },
        [SearchTabs.Players]: (i, results, embed) => {
            const [cols, handle] = this.handleSearchTable(i, results, embed);
            if (handle) {
                PokengineUtil.embedPlayer(embed, {
                    num: parseInt(cols.eq(0).text().substr(1)),
                    name: cols.eq(2).text(),
                    joined: cols.eq(3).find('span').text(),
                    lastActive: cols.eq(4).find('span').text(),
                    pagePath: cols.eq(2).find('a').attr('href'),
                    imagePath: '/' + cols.eq(1).find('img').attr('data-src'),
                });
            }
        },
        [SearchTabs.Maps]: (i, results, embed) => {
            const [cols, handle] = this.handleSearchTable(i, results, embed);
            if (handle) {
                PokengineUtil.embedMap(embed, {
                    num: parseInt(cols.eq(0).text().substr(1)),
                    name: cols.eq(1).text() || 'Unnamed Map',
                    owner: cols.eq(2).find('a').text(),
                    region: (
                        cols
                            .eq(3)
                            .contents()
                            .filter((index, element) => (element as any).nodeType == 3)[0] as any
                    ).nodeValue,
                    pagePath: cols.eq(1).find('a').attr('href'),
                });
            }
        },
        [SearchTabs.Forums]: (i, results, embed) => {
            const forumPost = results('.content.below .content-inner.forum').eq(i);
            if (forumPost.length > 0) {
                const origin = forumPost.find('.time').find('a');
                PokengineUtil.embedPost(embed, {
                    title: forumPost.find('.title').text(),
                    author: origin.eq(0).text(),
                    posted: origin.eq(1).text(),
                    pagePath: origin.eq(1).attr('href'),
                });
            } else {
                embed.setTitle('Index is too large!');
            }
        },
    };

    private handleDexBlock(
        i: number,
        results: cheerio.CheerioAPI,
        embed: MessageEmbed,
    ): [cheerio.Cheerio<cheerio.Element>, boolean] {
        const dexBlock = results('.dex-block').eq(i);
        if (dexBlock.length > 0) {
            if (dexBlock.text() === 'Private') {
                PokengineUtil.embedPrivate(embed);
                return [dexBlock, false];
            }
        } else {
            embed.setTitle('Index is too large!');
            return [dexBlock, false];
        }
        return [dexBlock, true];
    }

    private handleSearchTable(
        i: number,
        results: cheerio.CheerioAPI,
        embed: MessageEmbed,
    ): [cheerio.Cheerio<cheerio.Element>, boolean] {
        const tableRow = results('.search-table tr').eq(i);
        if (tableRow.length > 0) {
            return [tableRow.children(), true];
        } else {
            embed.setTitle('Index is too large!');
            return [null, false];
        }
    }

    private searchFor(query: string, page: number = 1): string {
        // Encode #, because they are used in searching
        return PokengineUtil.encodeURI(
            PokengineUtil.baseUrl + this.searchPath + '?query=' + query + '&page=' + page,
        ).replace(/#/g, '%23');
    }

    private async sendEmbed(src: CommandSource, embed: MessageEmbed, searchUrl: string) {
        embed.setDescription(`[See more results](${searchUrl})`);
        await src.send({ embeds: [embed] });
    }

    public async run({ bot, src }: CommandParameters<SpindaDiscordBot>, args: SearchArgs) {
        await src.deferReply();

        // Cached map names to upper case string
        if (!this.tabNamesToUpperCase) {
            this.tabNamesToUpperCase = new Map();
            Object.keys(SearchTabs)
                .map(key => parseInt(key))
                .filter(key => !isNaN(key))
                .forEach(id => {
                    this.tabNamesToUpperCase.set(id, SearchTabs[id].toUpperCase());
                });
        }

        const searchUrl = this.searchFor(args.query, args.page);
        const searchResponse = await axios.get(searchUrl, { responseEncoding: 'binary' } as any);
        const searchResults = cheerio.load(searchResponse.data);

        const selectedTab = searchResults('#top-bar .tabs > a.selected').first();
        const selectedTabTextUppercase = selectedTab.text().toUpperCase();

        // Get which tab we are on
        let tab: SearchTabs = -1;
        const mapIter = this.tabNamesToUpperCase.entries();
        let curr = mapIter.next();
        while (!curr.done) {
            if (selectedTabTextUppercase.indexOf(curr.value[1]) === 0) {
                tab = curr.value[0];
                break;
            }
            curr = mapIter.next();
        }

        const embed: MessageEmbed = bot.createEmbed();

        // No results
        if (tab < 0) {
            embed.setTitle('No results found!');
            return this.sendEmbed(src, embed, searchUrl);
        }

        const mainContent = searchResults('#content');
        const title = mainContent.find('.content.above').last();
        const titleText = title.text();
        const page = mainContent.find('.content .pages > span');
        let pageText = '1';
        if (page.length > 0) {
            pageText = page.first().text();
        }

        embed.setAuthor(
            titleText
                ? `${args.n === 1 ? 'First result' : `Result ${args.n}`} ${
                      args.page === 1 ? '' : `on page ${pageText} `
                  }for "${titleText}"`
                : '(No title)',
        );

        const handler = this.searchTabHandlers[tab];
        if (!handler) {
            embed.setTitle('Could not parse results.');
        } else {
            handler(args.n - 1, searchResults, embed);
        }
        this.sendEmbed(src, embed, searchUrl);
    }
}
