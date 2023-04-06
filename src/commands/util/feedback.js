import { Command } from '@sapphire/framework';
import { ActionRowBuilder, TextInputBuilder, TextInputStyle, ModalBuilder } from 'discord.js';

export class FeedbackCommand extends Command {
    constructor(context, options) {
        super(context, {
            ...options,
            name: 'feedback',
            description: 'Allows you to provide any feedback you may have about Kana.'
        });
    }

    registerApplicationCommands(registry) {
        registry.registerChatInputCommand((builder) => 
            builder
                .setName(this.name)
                .setDescription(this.description)
        );
    }
    
    async chatInputRun(interaction) {
        const modal = new ModalBuilder()
            .setCustomId('feedback')
            .setTitle('Feedback');
        const feedbackInput = new TextInputBuilder()
            .setCustomId('feedbackInput')
            .setLabel('What would you like to tell the developers?')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);
        const actionRow = new ActionRowBuilder().addComponents(feedbackInput);
        modal.addComponents(actionRow);
        await interaction.showModal(modal);
    }
}
