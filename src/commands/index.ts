import { CommandTypeArray } from 'panda-discord';

import { BlocklistCommand } from './lib/config/blocklist';
import { LogsCommand } from './lib/config/logs';
import { PrefixCommand } from './lib/config/prefix';
import { RemoveCommandCommand } from './lib/config/remove-command';
import { RunCustomCommand } from './lib/config/run-custom';
import { RunUniversalCommand } from './lib/config/run-universal';
import { SetCommandCommand } from './lib/config/set-command';
import { SnapshotMembersCommand } from './lib/config/snapshot-members';
import { ExternalCommands } from './lib/external';
import { EightBallCommand } from './lib/fun/8ball';
import { BotsnackCommand } from './lib/fun/botsnack';
import { ChooseCommand } from './lib/fun/choose';
import { ColorCommand } from './lib/fun/color';
import { ConchCommand } from './lib/fun/conch';
import { ImpostorCommand } from './lib/fun/impostor';
import { RollCommand } from './lib/fun/roll';
import { RoutletteCommand } from './lib/fun/roulette';
import { ScreenshotCommand } from './lib/fun/screenshot';
import { PokengineCommands } from './lib/pokengine';
import { EvalCommand } from './lib/secret/eval';
import { RefreshCommand } from './lib/secret/refresh';
import { SayCommand } from './lib/secret/say';
import { ShowArgsCommand } from './lib/secret/show-args';
import { SpindaCommands } from './lib/spinda';
import { CleanCommand } from './lib/utility/clean';
import { SpindaHelpCommand } from './lib/utility/help';
import { MemoryCommand } from './lib/utility/memory';
import { PingCommand } from './lib/utility/ping';
import { UptimeCommand } from './lib/utility/uptime';

export const CommandTypes: CommandTypeArray = [
    PingCommand,
    SpindaHelpCommand,
    CleanCommand,
    UptimeCommand,
    MemoryCommand,

    ...SpindaCommands,

    BotsnackCommand,
    ConchCommand,
    EightBallCommand,
    RollCommand,
    RoutletteCommand,
    ImpostorCommand,
    ChooseCommand,
    ColorCommand,
    ScreenshotCommand,

    ...ExternalCommands,
    ...PokengineCommands,

    EvalCommand,
    RefreshCommand,
    SayCommand,
    ShowArgsCommand,

    PrefixCommand,
    LogsCommand,
    BlocklistCommand,
    SetCommandCommand,
    RemoveCommandCommand,
    RunCustomCommand,
    RunUniversalCommand,
    SnapshotMembersCommand,
];
