import { AllFlowsPrecondition } from '@sapphire/framework';

export class GlobalPrecondition extends AllFlowsPrecondition {
    constructor(context, options) {
        super(context, {
            ...options,
            position: 20
        });
    }

    chatInputRun(interaction) {
        return this.check(interaction.user.id, interaction);
    }

    contextMenuRun(interaction) {
        return this.check(interaction.user.id, interaction);
    }

    async check(u, i) {
        this.container.totalCommandsInvoked++;
        if (!i.channel.viewable) return this.error({ message: 'I don\'t have permissions to view the channel you\'re executing this command in. Ensure Kana has permissions to send and view messages in this channel before continuing.' });
        let maintenance = await this.container.db.get('maintenance');
        if (!maintenance) maintenance = false;
        if (maintenance == true && !this.container.config.ownerIds.includes(u)) return this.error({ message: 'Kana is currently in maintenance mode. Please try again later.' });
        return this.ok();
    }
}