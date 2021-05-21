import { CommandTypeArray } from '../base';
import { MediaWikiCommands } from './wiki';

export const ExternalCommands: CommandTypeArray = [
    ...MediaWikiCommands,
];