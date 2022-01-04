import { BlocklistCommand } from './lib/config/blocklist';
import { BotsnackCommand } from './lib/fun/botsnack';
import { ChooseCommand } from './lib/fun/choose';
import { CleanCommand } from './lib/utility/clean';
import { ColorCommand } from './lib/fun/color';
import { CommandTypeArray } from 'panda-discord';
import { ConchCommand } from './lib/fun/conch';
import { EightBallCommand } from './lib/fun/8ball';
import { EvalCommand } from './lib/secret/eval';
import { ExternalCommands } from './lib/external';
import { ImpostorCommand } from './lib/fun/impostor';
import { LogsCommand } from './lib/config/logs';
import { MemoryCommand } from './lib/utility/memory';
import { PingCommand } from './lib/utility/ping';
import { PokengineCommands } from './lib/pokengine';
import { PrefixCommand } from './lib/config/prefix';
import { RefreshCommand } from './lib/secret/refresh';
import { RemoveCommandCommand } from './lib/config/remove-command';
import { RollCommand } from './lib/fun/roll';
import { RoutletteCommand } from './lib/fun/roulette';
import { RunCustomCommand } from './lib/config/run-custom';
import { RunUniversalCommand } from './lib/config/run-universal';
import { SayCommand } from './lib/secret/say';
import { ScreenshotCommand } from './lib/fun/screenshot';
import { SetCommandCommand } from './lib/config/set-command';
import { ShowArgsCommand } from './lib/secret/show-args';
import { SnapshotMembersCommand } from './lib/config/snapshot-members';
import { SpindaCommands } from './lib/spinda';
import { SpindaHelpCommand } from './lib/utility/help';
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
