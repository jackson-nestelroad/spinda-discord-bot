import axios from 'axios';
import * as cheerio from 'cheerio';
import { MessageEmbed } from 'discord.js';
import {
    ArgumentsConfig,
    ArgumentType,
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
}

type SearchTabHandler = (results: cheerio.CheerioAPI, embed: MessageEmbed) => void;

export class SearchCommand extends ComplexCommand<SpindaDiscordBot, SearchArgs> {
    public readonly searchPath: string = '/search';

    public name = 'search';
    public description = `Searches the Pok\u{00E9}ngine website with a given query and returns the first result only.`;
    public moreDescription = `If you can't find what you're looking for, be more specific!\n\nSee ${this.searchFor(
        'help',
    )}.`;
    public category = CommandCategory.Pokengine;
    public permission = CommandPermission.Everyone;
    public cooldown = StandardCooldowns.Medium;

    public args: ArgumentsConfig<SearchArgs> = {
        query: {
            description: 'Search query, including any filters.',
            type: ArgumentType.RestOfContent,
            required: true,
        },
    };

    public tabNamesToUpperCase: Map<SearchTabs, string> = null;

    public searchTabHandlers: { [tab in SearchTabs]: SearchTabHandler } = {
        [SearchTabs.Mons]: (results, embed) => {
            const [firstDexBlock, handle] = this.handleDexBlock(results, embed);
            if (handle) {
                PokengineUtil.embedDexBlock(embed, {
                    num: parseInt(firstDexBlock.attr('data-id')),
                    name: firstDexBlock.attr('title'),
                    pagePath: firstDexBlock.attr('href'),
                    imagePath: firstDexBlock.find('img').attr('data-src'),
                });
            }
        },
        [SearchTabs.Auction]: (results, embed) => {
            const [firstDexBlock, handle] = this.handleDexBlock(results, embed);
            if (handle) {
                const levelMatch = firstDexBlock.text().match(/^Lv\.(\d+)/);
                const level = levelMatch ? levelMatch[1] : '???';
                PokengineUtil.embedDexBlock(embed, {
                    name: `Lv. ${level} ${firstDexBlock.attr('title')}`,
                    pagePath: firstDexBlock.attr('href'),
                    imagePath: firstDexBlock.find('img').attr('data-src'),
                });
                const bottomEntryNodes = firstDexBlock.find('span.time').contents();
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
        [SearchTabs.Trainers]: (results, embed) => {
            const [firstDexBlock, handle] = this.handleDexBlock(results, embed);
            if (handle) {
                PokengineUtil.embedDexBlock(embed, {
                    name: firstDexBlock.text(),
                    pagePath: firstDexBlock.attr('href'),
                    imagePath: firstDexBlock.find('img').attr('data-src'),
                });
            }
        },
        [SearchTabs.Moves]: (results, embed) => {
            const [cols, handle] = this.handleSearchTable(results, embed);
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
        [SearchTabs.Items]: (results, embed) => {
            const [cols, handle] = this.handleSearchTable(results, embed);
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
        [SearchTabs.Abilities]: (results, embed) => {
            const [cols, handle] = this.handleSearchTable(results, embed);
            if (handle) {
                PokengineUtil.embedAbility(embed, {
                    num: parseInt(cols.eq(0).text().substr(1)),
                    name: cols.eq(1).text(),
                    description: cols.eq(2).text(),
                    pagePath: cols.eq(1).find('a').attr('href'),
                });
            }
        },
        [SearchTabs.Players]: (results, embed) => {
            const [cols, handle] = this.handleSearchTable(results, embed);
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
        [SearchTabs.Maps]: (results, embed) => {
            const [cols, handle] = this.handleSearchTable(results, embed);
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
        [SearchTabs.Forums]: (results, embed) => {
            const firstForumPost = results('.content.below .content-inner.forum').first();
            if (firstForumPost.length > 0) {
                const origin = firstForumPost.find('.time').find('a');
                PokengineUtil.embedPost(embed, {
                    title: firstForumPost.find('.title').text(),
                    author: origin.eq(0).text(),
                    posted: origin.eq(1).text(),
                    pagePath: origin.eq(1).attr('href'),
                });
            } else {
                embed.setTitle('Failed to parse forum post.');
            }
        },
    };

    private handleDexBlock(
        results: cheerio.CheerioAPI,
        embed: MessageEmbed,
    ): [cheerio.Cheerio<cheerio.Element>, boolean] {
        const firstDexBlock = results('.dex-block').first();
        if (firstDexBlock.length > 0) {
            if (firstDexBlock.text() === 'Private') {
                PokengineUtil.embedPrivate(embed);
                return [firstDexBlock, false];
            }
        } else {
            embed.setTitle('Failed to find dex block.');
            return [firstDexBlock, false];
        }
        return [firstDexBlock, true];
    }

    private handleSearchTable(
        results: cheerio.CheerioAPI,
        embed: MessageEmbed,
    ): [cheerio.Cheerio<cheerio.Element>, boolean] {
        const firstTableRow = results('.search-table tr').first();
        if (firstTableRow.length > 0) {
            return [firstTableRow.children(), true];
        }
        return [null, false];
    }

    private searchFor(query: string): string {
        // Encode #, because they are used in searching
        return PokengineUtil.encodeURI(PokengineUtil.baseUrl + this.searchPath + '?query=' + query).replace(
            /#/g,
            '%23',
        );
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

        const searchUrl = this.searchFor(args.query);
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

        const title = searchResults('#content .content.above').last();
        const titleText = title.text();
        embed.setAuthor(titleText ? `First result for "${titleText}"` : '(No title)');

        const handler = this.searchTabHandlers[tab];
        if (!handler) {
            embed.setTitle('Could not parse results.');
        } else {
            handler(searchResults, embed);
        }
        this.sendEmbed(src, embed, searchUrl);
    }
}
