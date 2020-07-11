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
}