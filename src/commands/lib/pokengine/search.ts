import { Command, CommandCategory, CommandPermission } from '../base';
import { DiscordBot } from '../../../bot';
import { Message, MessageEmbed } from 'discord.js';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { PokengineUtil } from './util';

enum SearchTabs {
    'Pok\u00E9mon',
    'Moves',
    'Items',
    'Abilities',
    'Players',
    'Maps',
    'Trainers',
    'Forums',
    'Posts',
}

type SearchTab = keyof typeof SearchTabs;

export class SearchCommand implements Command {
    public readonly searchPath: string = '/search';

    public name = 'search';
    public args = 'query';
    public description = `Searches the Pok\u00E9ngine website with a given query and returns the *first* result only. If you can't find what you're looking for, be more specific!\n\nSee ${this.searchFor('help')}.`;
    public category = CommandCategory.Pokengine;
    public permission = CommandPermission.Everyone;

    public tabNamesToUpperCase: Map<SearchTab, string> = null;

    private searchFor(query: string): string {
        // Encode #, because they are used in searching
        return PokengineUtil.encodeURI(PokengineUtil.baseUrl + this.searchPath + '?query=' + query).replace(/#/g, '%23');
    }

    private sendEmbed(msg: Message, embed: MessageEmbed, searchUrl: string) {
        embed.setDescription(`[See more results](${searchUrl})`);
        msg.channel.send(embed);
    }

    public async run(bot: DiscordBot, msg: Message, args: string[]) {
        const query = args.join(' ');
        const searchUrl = this.searchFor(query);
        const searchResponse = await axios.get(searchUrl, { responseEncoding: 'binary' } as any);
        const searchResults = cheerio(searchResponse.data);
        const title = searchResults.find('#content .content.above').last();

        const embed: MessageEmbed = bot.createEmbed();
        
        // No results
        if (title.length === 0) {
            embed.setTitle('No results found!');
            this.sendEmbed(msg, embed, searchUrl);
            return;
        }

        // Cached map names to upper case string
        if (!this.tabNamesToUpperCase) {
            this.tabNamesToUpperCase = new Map();
            Object.keys(SearchTabs).filter(key => isNaN(parseInt(key))).forEach(name => {
                this.tabNamesToUpperCase.set(name as SearchTab, name.toUpperCase());
            });
        }

        const titleText = title.text();
        const upperCaseTitleText = titleText.toUpperCase();

        // Get which tab we are on
        // This is important for all search results that use a search table to display results
        let tab: SearchTab;
        const mapIter = this.tabNamesToUpperCase.entries();
        let curr = mapIter.next();
        while (!curr.done) {
            if (upperCaseTitleText.includes(curr.value[1])) {
                tab = curr.value[0];
                break;
            }
            curr = mapIter.next();
        }

        embed.setAuthor(`First result for "${titleText}"`);

        const firstDexBlock = searchResults.find('.dex-block').first();
        // Results are Pokemon or Trainers
        if (firstDexBlock.length > 0) {
            // Result is private
            if (firstDexBlock.text() === 'Private') {
                PokengineUtil.embedPrivate(embed);
            }
            // Results are Pokemon
            else if (searchResults.find('#monsters').length > 0) {
                PokengineUtil.embedDexBlock(embed, { 
                    num: parseInt(firstDexBlock.attr('data-id')),
                    name: firstDexBlock.attr('title'),
                    pagePath: firstDexBlock.attr('href'),
                    imagePath: firstDexBlock.find('img').attr('data-src'),
                });
            }
            // Results are Trainers
            else {
                PokengineUtil.embedDexBlock(embed, {
                    name: firstDexBlock.text(),
                    pagePath: firstDexBlock.attr('href'),
                    imagePath: firstDexBlock.find('img').attr('data-src'),
                });
            }
            
            this.sendEmbed(msg, embed, searchUrl);
            return;
        }

        // Check for search table
        const firstTableRow = searchResults.find('.search-table tr').first();
        if (firstTableRow.length > 0) {
            const cols = firstTableRow.children();
            
            switch (tab) {
                case 'Abilities': {
                    PokengineUtil.embedAbility(embed, {
                        num: parseInt(cols.eq(0).text().substr(1)),
                        name: cols.eq(1).text(),
                        description: cols.eq(2).text(),
                        pagePath: cols.eq(1).find('a').attr('href'),
                    });
                    
                    this.sendEmbed(msg, embed, searchUrl);
                    return;
                }

                case 'Items': {
                    PokengineUtil.embedItem(embed, {
                        num: parseInt(cols.eq(0).text().substr(1)),
                        name: cols.eq(2).text(),
                        description: cols.eq(3).text(),
                        pagePath: cols.eq(2).find('a').attr('href'),
                        imagePath: cols.eq(1).find('img').attr('data-src'),
                    });
                    
                    this.sendEmbed(msg, embed, searchUrl);
                    return;
                }

                case 'Maps': {
                    PokengineUtil.embedMap(embed, {
                        num: parseInt(cols.eq(0).text().substr(1)),
                        name: cols.eq(1).text() || 'Unnamed Map',
                        owner: cols.eq(2).find('a').text(),
                        region: cols.eq(3).contents().filter(function() {
                            return this.nodeType == 3;
                        })[0].nodeValue,
                        pagePath: cols.eq(1).find('a').attr('href'),
                    });
                    
                    this.sendEmbed(msg, embed, searchUrl);
                    return;
                }

                case 'Moves': {
                    PokengineUtil.embedMove(embed, {
                        num: parseInt(cols.eq(0).text().substr(1)),
                        name: cols.eq(1).text(),
                        type: cols.eq(2).text() as any,
                        category: cols.eq(3).text() as any,
                        description: cols.last().text(),
                        pagePath: cols.eq(1).find('a').attr('href'),
                    });
                    
                    this.sendEmbed(msg, embed, searchUrl);
                    return;
                }

                case 'Players': {
                    PokengineUtil.embedPlayer(embed, {
                        num: parseInt(cols.eq(0).text().substr(1)),
                        name: cols.eq(2).text(),
                        joined: cols.eq(3).find('span').text(),
                        lastActive: cols.eq(4).find('span').text(),
                        pagePath: cols.eq(2).find('a').attr('href'),
                        imagePath: '/' + cols.eq(1).find('img').attr('data-src'),
                    });
                    
                    this.sendEmbed(msg, embed, searchUrl);
                    return;
                }
            }
        }

        // The only other option is Forums/Posts
        const firstForumPost = searchResults.find('.content.below .content-inner.forum').first();
        if (firstForumPost.length > 0) {
            const origin = firstForumPost.find('.time').find('a');
            PokengineUtil.embedPost(embed, {
                title: firstForumPost.find('.title').text(),
                author: origin.eq(0).text(),
                posted: origin.eq(1).text(),
                pagePath: origin.eq(1).attr('href'),
            });

            this.sendEmbed(msg, embed, searchUrl);
            return;
        }

        embed.setTitle('Could not parse results.');
        this.sendEmbed(msg, embed, searchUrl);
    }
}