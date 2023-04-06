import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';

export class FeedbackModalHandler extends InteractionHandler {
    constructor(ctx, options) {
        super(ctx, {
            ...options,
            interactionHandlerType: InteractionHandlerTypes.ModalSubmit
        });
    }

    parse(interaction) {
        if (interaction.customId !== 'feedback') return this.none();
        return this.some();
    }

    async run(interaction) {
        await interaction.reply({
            embeds: [this.container.util.embed('success', 'Submitted! Thank you for your feedback. You will most likely receive a response in the next few days.')],
            ephemeral: true
        });
        this.container.webhook.send({
            content: `**Feedback from ${interaction.user.tag} (${interaction.user.id}):**\n${interaction.fields.fields.get('feedbackInput').value}`
        });
    }
}