import { CommandCategory, CommandPermission, CommandParameters, ArgumentsConfig, ArgumentType, LegacyCommand, ChatCommandParameters } from '../base';
import { CustomCommandEngine } from '../../../events/util/custom-command';
import { ExpireAgeConversion } from '../../../util/timed-cache';
import { GuildMember, MessageActionRow, MessageButton, MessageComponentInteraction, Permissions } from 'discord.js';
import { EmbedTemplates } from '../../../util/embed';

interface RunCustomArgs {
    code: string;
    universal: boolean;
}

export class RunCustomCommand extends LegacyCommand<RunCustomArgs> {
    public name = 'run-custom';
    public description = 'Runs the custom command engine for the given message. All `$N` arguments will be undefined.';
    public moreDescription = `The \`universal\` option will run the command universally, which means it is run for every member of the guild. This can only be run every ${ExpireAgeConversion.toString(CustomCommandEngine.universalCooldown)}.`;
    public category = CommandCategory.Config;
    public permission = CommandPermission.Administrator;
    
    public disableInCustomCommand = true;

    public args: ArgumentsConfig<RunCustomArgs> = {
        universal: {
            description: 'Run once for all members?',
            type: ArgumentType.Boolean,
            required: true,
        },
        code: {
            description: 'Custom command code.',
            type: ArgumentType.RestOfContent,
            required: true,
        },
    };

    public argsString(): string {
        return '(universal?) code';
    }

    public readonly universalArg = 'universal';

    public parseChatArgs({ args, content }: ChatCommandParameters): RunCustomArgs {
        const parsed: Partial<RunCustomArgs> = { };

        if (args[0] === this.universalArg) {
            parsed.universal = true;
            parsed.code = content.substr(this.universalArg.length).trimLeft();
        }
        else {
            parsed.universal = false;
            parsed.code = content;
        }

        return parsed as RunCustomArgs;
    }

    public async run({ bot, src, guild }: CommandParameters, args: RunCustomArgs) {
        if (args.universal) {
            const members = await bot.memberListService.getMemberListForGuild(guild.id);
            const otherAdmins = members.filter(member => member.permissions.has('ADMINISTRATOR') && !member.user.bot);
            otherAdmins.delete(src.author.id);

            if (otherAdmins.size > 0) {
                const row = new MessageActionRow();
                const button = new MessageButton();
                button.setCustomID('confirm');
                button.setLabel('Run Universal Command');
                button.setEmoji(`\u{2755}`);
                button.setStyle('DANGER');
                row.addComponents(button);
    
                let response = await src.reply({
                    content: 'Running a universal command is an extremely dangerous action. Please have another Administrator confirm this command.',
                    components: [row],
                });

                if (!response.isMessage) {
                    throw new Error(`Response to universal command should have produced a message.`);
                }

                const disableButton = async () => {
                    const updatedRow = new MessageActionRow();
                    button.setDisabled(true);
                    updatedRow.addComponents(button);
                    response = await response.edit({ components: [updatedRow] });
                };

                let interaction: MessageComponentInteraction;
                try {
                    interaction = await response.message.awaitMessageComponentInteraction(interaction => {
                        return interaction.customID === 'confirm' && otherAdmins.has(interaction.member.user.id);
                    }, { time: 60 * 1000 });
                } catch (error) {
                    await disableButton();
                    const embed = bot.createEmbed(EmbedTemplates.Error);
                    embed.setDescription('Universal command confirmation timed out.');
                    await src.reply({ embeds: [embed] });
                    return;
                }

                await disableButton();
                await interaction.reply(`Confirmation given by ${interaction.member.toString()}.`);
            }
        }
        await new CustomCommandEngine({
            bot: bot,
            src: src,
            guild: guild,
        }, 'content', [], { 
            universal: args.universal,
        }).run(args.code);
    }
}