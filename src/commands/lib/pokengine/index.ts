import { CommandTypeArray } from 'panda-discord';

import { AccessCommand } from './access';
import { JcoadCommand } from './jcoad';
import { PasswordCommand } from './password';
import { PokemonCommand } from './pokemon';
import { SearchCommand } from './search';

export const PokengineCommands: CommandTypeArray = [
    PokemonCommand,
    SearchCommand,
    JcoadCommand,
    AccessCommand,
    PasswordCommand,
];
