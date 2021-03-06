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

    export namespace Pokengine {
        export function getCookie(): string {
            return process.env.POKENGINE_COOKIE;
        }
    
        export function getGuildId(): string {
            return process.env.POKENGINE_GUILD_ID;
        }
    
        export function getAccessChannelId(): string {
            return process.env.POKENGINE_ACCESS_CHANNEL_ID;
        }
    
        export function getAccessRoleId(): string {
            return process.env.POKENGINE_ACCESS_ROLE_ID;
        }
    }
}