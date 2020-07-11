import { Command } from '../base';
import { CertifiedCommand } from './certified';

export const PokengineCommands: Array<{ new(): Command }> = [
    CertifiedCommand,
];