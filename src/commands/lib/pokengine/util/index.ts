import { MessageEmbed } from 'discord.js';

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
    num: number;
    name: string;
    type: PokemonType;
    category: MoveType;
    description: string;
    pagePath: string;
}

export interface WebScrapedItem {
    num: number;
    name: string;
    description: string;
    pagePath: string;
    imagePath: string;
}

export interface WebScrapedAbility {
    num: number;
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
    num: number;
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
    export const baseUrl: string = 'http://pokengine.org';

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

    export function embedDexBlock(embed: MessageEmbed, block: WebScrapedDexBlock) {
        if (block.num) {
            embed.setTitle(`#${formatNum(block.num)} ${block.name}`);
        }
        else {
            embed.setTitle(block.name);
        }
        embed.setURL(decodeURI(baseUrl + block.pagePath));
        embed.setImage(baseUrl + block.imagePath);
    }

    export function embedPrivate(embed: MessageEmbed) {
        embed.setTitle('Private');
        embed.setDescription('This result cannot be viewed.');
    }

    export function embedMove(embed: MessageEmbed, move: WebScrapedMove) {
        embed.setTitle(`#${move.num} ${move.name}`);
        embed.setURL(decodeURI(baseUrl + move.pagePath));
        embed.setDescription(move.description);
        embed.addField('Type', move.type, true);
        embed.addField('Category', move.category, true);
    }

    export function embedItem(embed: MessageEmbed, item: WebScrapedItem) {
        embed.setTitle(`#${item.num} ${item.name}`);
        embed.setURL(decodeURI(baseUrl + item.pagePath));
        embed.setThumbnail(baseUrl + item.imagePath);
        embed.setDescription(item.description);
    }

    export function embedAbility(embed: MessageEmbed, ability: WebScrapedAbility) {
        embed.setTitle(`#${ability.num} ${ability.name}`);
        embed.setURL(decodeURI(baseUrl + ability.pagePath));
        embed.setDescription(ability.description);
    }

    export function embedPlayer(embed: MessageEmbed, player: WebScrapedPlayer) {
        embed.setTitle(`#${player.num} ${player.name}`);
        embed.setURL(decodeURI(baseUrl + player.pagePath));
        embed.setThumbnail(baseUrl + player.imagePath);
        embed.addField('Joined', player.joined, true);
        embed.addField('Last Active', player.lastActive, true);
    }

    export function embedMap(embed: MessageEmbed, map: WebScrapedMap) {
        embed.setTitle(`#${map.num} ${map.name}`);
        embed.setURL(decodeURI(baseUrl + map.pagePath));
        embed.addField('Owner', map.owner, true);
        embed.addField('Region', map.region, true);
    }

    export function embedPost(embed: MessageEmbed, post: WebScrapedPost) {
        embed.setTitle(post.title);
        embed.setURL(decodeURI(baseUrl + post.pagePath));
        embed.addField('Author', post.author, true);
        embed.addField('Posted', post.posted, true);
    }
}