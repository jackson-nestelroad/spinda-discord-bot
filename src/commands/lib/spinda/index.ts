import { Command } from '../base';
import { CatchCommand } from './catch';
import { MySpindaCommand } from './my-spinda';
import { SpindaCommand } from './spinda';

export const SpindaCommands: Array<{ new(): Command }> = [
    SpindaCommand,
    CatchCommand,
    MySpindaCommand,
];