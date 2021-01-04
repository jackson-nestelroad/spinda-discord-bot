import { Command } from '../base';
import { CertifiedCommand } from './certified';
import { SearchCommand } from './search';
import { AccessCommand } from './access';

export const PokengineCommands: Array<{ new(): Command }> = [
    CertifiedCommand,
    SearchCommand,
    AccessCommand,
];