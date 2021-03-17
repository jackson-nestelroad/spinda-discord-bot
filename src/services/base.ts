import { DiscordBot } from '../bot';

export abstract class BaseService {
    constructor(protected bot: DiscordBot) { }
}