import { DiscordBot } from './bot';
import { config } from 'dotenv';
import { Environment } from './data/environment';

// Use local .env file
if (Environment.getEnvironment() !== 'production') {
    config();
}

(async () => {
    const bot = new DiscordBot();
    await bot.initialize();
    await bot.run();
})().catch(error => {
    console.error(error);
    process.exit(1);
});