export namespace Environment {
    export function getEnvironment(): string {
        return process.env.ENVIRONMENT;
    }
    
    export function getDiscordToken(): string {
        return process.env.DISCORD_TOKEN;
    }

    export function getGlobalOwner(): string {
        return process.env.GLOBAL_OWNER;
    }
}