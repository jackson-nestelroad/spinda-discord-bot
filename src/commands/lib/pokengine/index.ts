import { Command } from '../base';
import { CertifiedCommand } from './certified';
import { SearchCommand } from './search';
import { AccessCommand } from './access';
import { JcoadCommand } from './jcoad';

export const PokengineCommands: Array<{ new(): Command }> = [
    CertifiedCommand,
    SearchCommand,
    JcoadCommand,
    AccessCommand,
];