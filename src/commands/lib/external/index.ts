import { Command } from '../base';
import { MediaWikiCommands } from './wiki';

export const ExternalCommands: Array<{ new(): Command }> = [
    ...MediaWikiCommands,
];