import { EmbedBuilder } from 'discord.js';

export enum PokemonTypes {
    Normal,
    Fighting,
    Flying,
    Poison,
    Ground,
    Rock,
    Bug,
    Ghost,
    Steel,
    '???',
    Fire,
    Water,
    Grass,
    Electric,
    Psychic,
    Ice,
    Dark,
    Bird,
    Dragon,
    Fairy,
    Nuclear,
}

export enum MoveTypes {
    Physical,
    Special,
    Status,
}

export type PokemonType = keyof typeof PokemonTypes;
export type MoveType = keyof typeof MoveTypes;

export interface WebScrapedPokedex {
    name: string;
    dexPath: string;
    iconPath: string;
}

export interface WebScrapedDexBlock {
    num?: number;
    name: string;
    pagePath: string;
    imagePath: string;
}

export interface WebScrapedMove {
    name: string;
    type: PokemonType;
    category: MoveType;
    description: string;
    pagePath: string;
}

export interface WebScrapedItem {
    name: string;
    description: string;
    pagePath: string;
    imagePath: string;
}

export interface WebScrapedAbility {
    name: string;
    description: string;
    pagePath: string;
}

export interface WebScrapedPlayer {
    num: number;
    name: string;
    joined: string;
    lastActive: string;
    pagePath: string;
    imagePath: string;
}

export interface WebScrapedMap {
    name: string;
    owner: string;
    region: string;
    pagePath: string;
}

export interface WebScrapedPost {
    title: string;
    author: string;
    posted: string;
    pagePath: string;
}

export namespace PokengineUtil {
    const noneString: string = 'None';
    export const baseHost: string = 'pokengine.org';
    export const baseOrigin: string = `https://${baseHost}`;

    export function formatNum(num: number, length: number = 3): string {
        const str = num.toString();
        return str.length < length ? '0'.repeat(length - str.length) + str : str;
    }

    export function encodeURI(uri: string) {
        return global.encodeURI(uri).replace(/%20/g, '+');
    }

    export function decodeURI(uri: string) {
        return global.decodeURI(uri).replace(/ /g, '+');
    }

    export function setURLOrigin(urlString: string): string {
        try {
            const url = new URL(urlString);
            if (url.host === 'pokengine.b-cdn.net') {
                url.host = baseHost;
            }
            return url.toString();
        } catch (error) {
            return `${baseOrigin}${urlString.charAt(0) === '/' ? '' : '/'}${urlString}`;
        }
    }

    export function embedDexBlock(embed: EmbedBuilder, block: WebScrapedDexBlock) {
        if (block.num || block.num === 0) {
            embed.setTitle(`#${formatNum(block.num)} ${block.name}`);
        } else {
            embed.setTitle(block.name);
        }
        embed.setURL(setURLOrigin(decodeURI(block.pagePath)));
        embed.setImage(setURLOrigin(block.imagePath));
    }

    export function embedPrivate(embed: EmbedBuilder) {
        embed.setTitle('Private');
        embed.addFields({ name: 'Error', value: 'This result cannot be viewed.' });
    }

    export function embedMove(embed: EmbedBuilder, move: WebScrapedMove) {
        embed.setTitle(`${move.name}`);
        embed.setURL(setURLOrigin(decodeURI(move.pagePath)));
        embed.addFields(
            { name: 'Description', value: move.description || noneString },
            { name: 'Type', value: move.type || noneString, inline: true },
            { name: 'Category', value: move.category || noneString, inline: true },
        );
    }

    export function embedItem(embed: EmbedBuilder, item: WebScrapedItem) {
        embed.setTitle(`${item.name}`);
        embed.setURL(setURLOrigin(decodeURI(item.pagePath)));
        embed.setThumbnail(setURLOrigin(item.imagePath));
        embed.addFields({ name: 'Description', value: item.description || noneString });
    }

    export function embedAbility(embed: EmbedBuilder, ability: WebScrapedAbility) {
        embed.setTitle(`${ability.name}`);
        embed.setURL(setURLOrigin(decodeURI(ability.pagePath)));
        embed.addFields({ name: 'Description', value: ability.description || noneString });
    }

    export function embedPlayer(embed: EmbedBuilder, player: WebScrapedPlayer) {
        embed.setTitle(`#${player.num} ${player.name}`);
        embed.setURL(setURLOrigin(decodeURI(player.pagePath)));
        embed.setThumbnail(setURLOrigin(player.imagePath));
        embed.addFields(
            { name: 'Joined', value: player.joined || noneString, inline: true },
            { name: 'Last Active', value: player.lastActive || noneString, inline: true },
        );
    }

    export function embedMap(embed: EmbedBuilder, map: WebScrapedMap) {
        embed.setTitle(`${map.name}`);
        embed.setURL(setURLOrigin(decodeURI(map.pagePath)));
        embed.addFields(
            { name: 'Owner', value: map.owner || noneString, inline: true },
            { name: 'Region', value: map.region || noneString, inline: true },
        );
    }

    export function embedPost(embed: EmbedBuilder, post: WebScrapedPost) {
        embed.setTitle(post.title);
        embed.setURL(setURLOrigin(decodeURI(post.pagePath)));
        embed.addFields(
            { name: 'Author', value: post.author || noneString, inline: true },
            { name: 'Posted', value: post.posted || noneString, inline: true },
        );
    }
}
