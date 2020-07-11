import { Command } from './lib/base';
import { PingCommand } from './lib/utility/ping';
import { HelpCommand } from './lib/utility/help';
import { SpindaCommand } from './lib/spinda';
import { ConchCommand } from './lib/fun/conch';
import { BotsnackCommand } from './lib/fun/botsnack';
import { EightBallCommand } from './lib/fun/8ball';
import { PokengineCommands } from './lib/pokengine';

const CommandTypes: Array<{ new(): Command }> = [
    PingCommand,
    HelpCommand,

    SpindaCommand,
    BotsnackCommand,
    ConchCommand,
    EightBallCommand,

    ...PokengineCommands,
];

function buildCommandMap(): Map<string, Command> {
    const map = new Map();
    for (const cmd of CommandTypes) {
        const instance = new cmd();
        for (const name of instance.names) {
            map.set(name, instance);
        }
    }
    return map;
}

export const Commands = buildCommandMap();
