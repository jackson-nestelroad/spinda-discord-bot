import { Command } from './lib/base';
import { PingCommand } from './lib/utility/ping';
import { HelpCommand } from './lib/utility/help';
import { SpindaCommand } from './lib/spinda';
import { ConchCommand } from './lib/fun/conch';
import { BotsnackCommand } from './lib/fun/botsnack';
import { EightBallCommand } from './lib/fun/8ball';
import { PokengineCommands } from './lib/pokengine';
import { RefreshCommand } from './lib/secret/refresh';
import { CleanCommand } from './lib/utility/clean';
import { RoutletteCommand } from './lib/fun/roulette';
import { EvalCommand } from './lib/secret/eval';
import { SayCommand } from './lib/secret/say';
import { UptimeCommand } from './lib/utility/uptime';
import { ImposterCommand } from './lib/fun/imposter';
import { PrefixCommand } from './lib/config/prefix';
import { LogsCommand } from './lib/config/logs';
import { SetCommandCommand } from './lib/config/set-command';
import { RemoveCommandCommand } from './lib/config/remove-command';
import { CustomHelpCommand } from './lib/utility/custom';
import { RunCustomCommand } from './lib/secret/run-custom';
import { ChooseCommand } from './lib/fun/choose';
import { ColorCommand } from './lib/fun/color';
import { ExternalCommands } from './lib/external';
import { ScreenshotCommand } from './lib/fun/screenshot';
import { BlacklistCommand } from './lib/config/blacklist';

const CommandTypes: Array<{ new(): Command }> = [
    PingCommand,
    HelpCommand,
    CleanCommand,
    UptimeCommand,

    SpindaCommand,
    BotsnackCommand,
    ConchCommand,
    EightBallCommand,
    RoutletteCommand,
    ImposterCommand,
    ChooseCommand,
    ColorCommand,
    ScreenshotCommand,

    ...ExternalCommands,
    ...PokengineCommands,

    EvalCommand,
    RefreshCommand,
    SayCommand,
    CustomHelpCommand,
    RunCustomCommand,

    PrefixCommand,
    LogsCommand,
    BlacklistCommand,
    SetCommandCommand,
    RemoveCommandCommand,
];

export namespace Commands {
    export function buildCommandMap(): Map<string, Command> {
        const map = new Map();
        for (const cmd of CommandTypes) {
            const instance = new cmd();
            map.set(instance.name, instance);
        }
        return map;
    }
}