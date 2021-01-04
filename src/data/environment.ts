export namespace Environment {
    export function getEnvironment(): 'production' | 'development' | undefined {
        return process.env.NODE_ENV as any;
    }
    
    export function getDiscordToken(): string {
        return process.env.DISCORD_TOKEN;
    }

    export function getGlobalOwner(): string {
        return process.env.GLOBAL_OWNER;
    }

    export function getDatabaseUrl(): string {
        return process.env.DATABASE_URL;
    }

    export function getPokengineCookie(): string {
        return process.env.POKENGINE_COOKIE;
    }

    export function getPokengineGuildId(): string {
        return process.env.POKENGINE_GUILD_ID;
    }

    export function getPokengineGrantRole(): string {
        return process.env.POKENGINE_GRANT_ROLE;
    }
}