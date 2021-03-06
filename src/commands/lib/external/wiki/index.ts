import { Command } from '../../base';
import { MediaWikiCommand } from './media-wiki';
import { WikipediaCommand } from './wikipedia';
import { FandomCommand } from './fandom';
import { BulbapediaCommand } from './bulbapedia';

export const MediaWikiCommands: Array<{ new(): Command }> = [
    MediaWikiCommand,
    FandomCommand,
    WikipediaCommand,
    BulbapediaCommand,
];