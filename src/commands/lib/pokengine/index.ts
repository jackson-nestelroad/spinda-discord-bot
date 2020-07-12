import { Command } from '../base';
import { CertifiedCommand } from './certified';
import { SearchCommand } from './search';

export const PokengineCommands: Array<{ new(): Command }> = [
    CertifiedCommand,
    SearchCommand,
];