import { DiscordBot } from './bot';
import { config } from 'dotenv';
import { Environment } from './data/environment';

// Use local .env file
if (Environment.getEnvironment() !== 'production') {
    config();
}

const bot = new DiscordBot();
bot.run();