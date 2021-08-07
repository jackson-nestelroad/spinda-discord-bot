import { CommandTypeArray } from 'panda-discord';

import { BulbapediaCommand } from './bulbapedia';
import { FandomCommand } from './fandom';
import { MediaWikiCommand } from './media-wiki';
import { WikipediaCommand } from './wikipedia';

export const MediaWikiCommands: CommandTypeArray = [
    MediaWikiCommand,
    FandomCommand,
    WikipediaCommand,
    BulbapediaCommand,
];
