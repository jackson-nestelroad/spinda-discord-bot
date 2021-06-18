import axios from 'axios';
import { BaseService } from './base';
import { CommandSource } from '../util/command-source';

interface ConfirmedSiteEntry {
    siteName: string;
    homePage: string;
}

export class MediaWikiService extends BaseService {
    private readonly confirmPath = '/api.php?action=query&meta=siteinfo&siprop=general&format=json';

    // Sites confirmed to be MediaWiki sites that are safe to query
    private readonly confirmedSites: Map<string, ConfirmedSiteEntry> = new Map();

    private throwNotMediaWiki(site: string): never {
        throw new Error(`${site} does not appear to be a MediaWiki API endpoint.`);
    }

    private validateURL(url: string): string {
        let parsed: URL;
        try {
            parsed = new URL(url);
        } catch (error) {
            // Parsing failed
            // It is very likely there is no protocol, so we try adding it and parsing again
            try {
                parsed = new URL('https://' + url);
            } catch (error) {
                throw new Error(`${url} is not a valid URL.`);
            }
        }
        
        // Make sure we are using a valid protocol
        if (parsed.protocol !== 'https:') {
            parsed.protocol = 'https:';
        }

        return parsed.toString();
    }

    private createSearchPath(query: string): string {
        return `/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=5&namespace=0|14&format=json`;
    }

    public async searchSite(src: CommandSource, site: string, query: string) {
        if (!query) {
            throw new Error(`Search query cannot be empty.`);
        }

        await src.defer();
        site = site.toLowerCase();
        if (!this.confirmedSites.has(site)) {
            site = this.validateURL(site);
            try {
                // Get site information to check that this site uses the MediaWiki API
                const url = site + this.confirmPath;
                const response = await axios.get(url, { responseType: 'json' });
                if (response.status !== 200) {
                    this.throwNotMediaWiki(site);
                }

                const wikiInfo: any = response.data ?? this.throwNotMediaWiki(site);
                const generalInfo: any = wikiInfo?.query?.general ?? this.throwNotMediaWiki(site);
                const siteName: string = generalInfo?.sitename ?? this.throwNotMediaWiki(site);
                const homePage: string = generalInfo?.base ?? this.throwNotMediaWiki(site);

                // Save site as confirmed
                this.confirmedSites.set(site, {
                    siteName,
                    homePage,
                });
            } catch (error) {
                this.throwNotMediaWiki(site);
            }
        }

        const entry = this.confirmedSites.get(site);
        const url = site + this.createSearchPath(query);
        const response = await axios.get(url.toString(), { responseType: 'json' });

        // Make sure we got an OpenSource response in the format we expect
        if (!Array.isArray(response.data) || response.data.length !== 4) {
            throw new Error(`Invalid response data.`);
        }
        
        const embed = this.bot.createEmbed();
        embed.setTitle(entry.siteName);
        embed.setURL(entry.homePage);
        embed.setAuthor(`Top results for "${response.data[0]}"`);

        if (response.data[1].length === 0) {
            embed.setDescription('No results found!');
        }
        else {
            const results: string[] = [];
            for (let i = 0; i < response.data[1].length; ++i) {
                results.push(`${i + 1}. [${response.data[1][i]}](${response.data[3][i]})`);
            }
            embed.setDescription(results.join('\n'));
        }

        await src.send({ embeds: [embed] });
    }
}