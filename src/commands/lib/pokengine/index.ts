import { CommandTypeArray } from 'panda-discord';

import { AccessCommand } from './access';
import { CertifiedCommand } from './certified';
import { JcoadCommand } from './jcoad';
import { PasswordCommand } from './password';
import { SearchCommand } from './search';

export const PokengineCommands: CommandTypeArray = [
    CertifiedCommand,
    SearchCommand,
    JcoadCommand,
    AccessCommand,
    PasswordCommand,
];
