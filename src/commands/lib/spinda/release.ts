import { CommandCategory, CommandPermission, CommandParameters, StandardCooldowns, ComplexCommand, ArgumentsConfig, ArgumentType } from '../base';
import { SpindaCommandNames } from './command-names';
import { EmbedTemplates } from '../../../util/embed';
import { SpindaGeneratorService } from './generator';
import { MessageActionRow, MessageAttachment, MessageButton, MessageComponentInteraction } from 'discord.js';

interface ReleaseArgs {
    position: number;
}

export class ReleaseCommand extends ComplexCommand<ReleaseArgs> {
    public name = SpindaCommandNames.Release;
    public description = 'Releases a single Spinda from your party.';
    public category = CommandCategory.Spinda;
    public permission = CommandPermission.Everyone;
    public cooldown = StandardCooldowns.High;

    public args: ArgumentsConfig<ReleaseArgs> = {
        position: {
            description: `Position to release, with 1 being the left-most and ${SpindaGeneratorService.partySize} being the right-most.`,
            type: ArgumentType.Integer,
            required: true,
        },
    };

    public async run({ bot, src }: CommandParameters, args: ReleaseArgs) {
        if (args.position <= 0) {
            throw new Error(`Position must be a positive integer.`);
        }

        const caughtSpinda = await bot.dataService.getCaughtSpinda(src.author.id);

        if (args.position > caughtSpinda.length) {
            throw new Error(`Invalid position. You only have ${caughtSpinda.length} Spinda caught.`);
        }

        const row = new MessageActionRow();
        const yesButton = new MessageButton();
        yesButton.setCustomID('confirm');
        yesButton.setStyle('DANGER');
        yesButton.setLabel('Release');

        const noButton = new MessageButton();
        noButton.setCustomID('cancel');
        noButton.setStyle('PRIMARY');
        noButton.setLabel('Cancel');

        const toRelease = await bot.spindaGeneratorService.generate(caughtSpinda[args.position - 1]);
        const attachment = new MessageAttachment(toRelease.buffer, 'thumbnail.png');

        const confirmationEmbed = bot.createEmbed(EmbedTemplates.Bare);
        confirmationEmbed.setTitle('Release Spinda Confirmation');
        confirmationEmbed.setDescription('Are you sure you want to release this Spinda?');
        confirmationEmbed.setThumbnail('attachment://thumbnail.png');

        let response = await src.reply({
            embeds: [confirmationEmbed],
            files: [attachment],
            components: [[yesButton, noButton]],
        });

        if (!response.isMessage) {
            throw new Error(`Release confirmation should have produced a message.`);
        }

        const disableButtons = async () => {
            yesButton.setDisabled(true);
            noButton.setDisabled(true);
            return await response.edit({ components: [[yesButton, noButton]] });
        };

        let interaction: MessageComponentInteraction;
        try {
            interaction = await response.message.awaitMessageComponentInteraction(interaction => {
                return interaction.user.id === src.author.id;
            }, { time: 10000 });   
        } catch (error) {
            throw new Error('You did not respond in time.');
        }

        response = await disableButtons();
        await interaction.deferUpdate();

        if (interaction.customID === 'cancel') {
            return;
        }
        else if (interaction.customID === 'confirm') {
            await bot.dataService.releaseCaughtSpinda(src.author.id, args.position - 1);

            const confirmEmbed = bot.createEmbed(EmbedTemplates.Success);
            confirmEmbed.setDescription(`Goodbye, Spinda! Successfully released position ${args.position}.`);
            await src.send({ embeds: [confirmEmbed] });
        }
        else {
            throw new Error(`Unknown interaction custom ID: ${interaction.customID}.`);
        }
    }
}