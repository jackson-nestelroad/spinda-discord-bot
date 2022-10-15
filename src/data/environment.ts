import { Snowflake } from 'discord.js';

export namespace Environment {
    export function getEnvironment(): 'production' | 'development' | undefined {
        return process.env.NODE_ENV as any;
    }

    export function getDiscordToken(): string {
        return process.env.DISCORD_TOKEN;
    }

    export function getGlobalOwner(): Snowflake {
        return process.env.GLOBAL_OWNER as Snowflake;
    }

    export function getDatabaseUrl(): string {
        return process.env.DATABASE_URL;
    }

    export namespace Pokengine {
        export function getCookie(): string {
            return process.env.POKENGINE_COOKIE;
        }

        export function getGuildId(): Snowflake {
            return process.env.POKENGINE_GUILD_ID as Snowflake;
        }

        export function getAccessRoleId(): Snowflake {
            return process.env.POKENGINE_ACCESS_ROLE_ID as Snowflake;
        }

        export function getSecretAccessLink(): string {
            return process.env.POKENGINE_SECRET_ACCESS_LINK;
        }

        export function getSecretPasswordLink(): string {
            return process.env.POKENGINE_SECRET_PASSWORD_LINK;
        }
    }

    export namespace GoogleCompute {
        export function getProjectId(): string {
            return process.env.GCE_PROJECT_ID;
        }

        export function getZone(): string {
            return process.env.GCE_ZONE;
        }

        export function getInstanceName(): string {
            return process.env.GCE_INSTANCE_NAME;
        }
    }
}
