import { CommandTypeArray, HelpCommand } from 'panda-discord';

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
import { PollCommand } from './lib/fun/poll';
import { RollCommand } from './lib/fun/roll';
import { RoutletteCommand } from './lib/fun/roulette';
import { ScreenshotCommand } from './lib/fun/screenshot';
import { BlocklistCommand } from './lib/moderation/blocklist';
import { LogsCommand } from './lib/moderation/logs';
import { MemberMessagesCommand } from './lib/moderation/member-messages';
import { PruneCommand } from './lib/moderation/prune';
import { WarnCommand } from './lib/moderation/warn';
import { WarningsCommand } from './lib/moderation/warnings';
import { PokengineCommands } from './lib/pokengine';
import { EvalCommand } from './lib/secret/eval';
import { RefreshCommand } from './lib/secret/refresh';
import { RestartVmCommand } from './lib/secret/restart-vm';
import { SayCommand } from './lib/secret/say';
import { ShowArgsCommand } from './lib/secret/show-args';
import { SpindaCommands } from './lib/spinda';
import { CleanCommand } from './lib/utility/clean';
import { MemoryCommand } from './lib/utility/memory';
import { PingCommand } from './lib/utility/ping';
import { UptimeCommand } from './lib/utility/uptime';

export const CommandTypes: CommandTypeArray = [
    PingCommand,
    HelpCommand,
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
    PollCommand,

    ...ExternalCommands,
    ...PokengineCommands,

    EvalCommand,
    RefreshCommand,
    RestartVmCommand,
    SayCommand,
    ShowArgsCommand,

    PrefixCommand,
    SetCommandCommand,
    RemoveCommandCommand,
    RunCustomCommand,
    RunUniversalCommand,
    SnapshotMembersCommand,

    LogsCommand,
    MemberMessagesCommand,
    PruneCommand,
    BlocklistCommand,
    WarnCommand,
    WarningsCommand,
];
