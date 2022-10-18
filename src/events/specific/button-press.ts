import { Interaction } from 'discord.js';
import { CommandSource, EmbedTemplates } from 'panda-discord';

import { BaseInteractionEvent } from '../base-interaction';

// This event handler is specific to the /poll command
export class ButtonPressEvent extends BaseInteractionEvent {
    public async run(interaction: Interaction) {
        if (!(await this.shouldProcess(interaction))) {
            return;
        }

        if (!interaction.isButton()) {
            return;
        }

        if (this.bot.pollsService.isPollVote(interaction)) {
            try {
                await this.bot.pollsService.handleInteraction(interaction);
            } catch (error) {
                await interaction.reply({
                    embeds: [
                        this.bot.createEmbed(EmbedTemplates.Error).setDescription(error.message || error.toString()),
                    ],
                    ephemeral: true,
                });
            }
        }
    }
}
