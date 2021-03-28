import { Command } from '../base';
import { CatchCommand } from './catch';
import { HordeCommand } from './horde';
import { MySpindaCommand } from './my-spinda';
import { ReleaseCommand } from './release';
import { SpindaCommand } from './spinda';
import { SwapCommand } from './swap';

export const SpindaCommands: Array<{ new(): Command }> = [
    SpindaCommand,
    HordeCommand,
    CatchCommand,
    MySpindaCommand,
    SwapCommand,
    ReleaseCommand,
];