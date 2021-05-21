import { CommandTypeArray } from '../base';
import { AccessCommand } from './access';
import { CertifiedCommand } from './certified';
import { JcoadCommand } from './jcoad';
import { SearchCommand } from './search';

export const PokengineCommands: CommandTypeArray = [
    CertifiedCommand,
    SearchCommand,
    JcoadCommand,
    AccessCommand,
];