import { Listener } from '@sapphire/framework';

export class ReadyListener extends Listener {
    constructor(context, options) {
        super(context, {
            ...options,
            once: true,
            event: 'ready'
        });
    }
    async run (client) {
        const { username, id } = client.user;
        this.container.logger.info(`Logged in as ${username} (${id})`);
        this.container.statusRotatorCurrent = 0;
        this.container.motdRefresher = setInterval(async () => { // Refresh MOTD every 5 seconds
            this.container.motd = await this.container.db.get('motd') || { enabled: false };
            const maintenance = await this.container.db.get('maintenance') || false;
            if (maintenance == true && this.container.statusRotator) { // Set presence to maintenance if maintenance is enabled
                this.container.logger.info('Maintenance mode enabled.');
                this.container.statusRotator = null;
                clearInterval(this.container.statusRotator);
                await client.user.setPresence({ activities: [{ name: 'maintenance mode', type: 'PLAYING' }], status: 'dnd' });
            } else if (this.container.motd.enabled == true && this.container.statusRotator) { // Set presence to MOTD presence if MOTD is enabled
                this.container.logger.info('MOTD enabled.');
                this.container.statusRotator = null;
                clearInterval(this.container.statusRotator);
                await client.user.setPresence({ activities: [this.container.motd.presence], status: this.container.motd.presence.status });
            } else if (this.container.motd.enabled == false && maintenance == false && this.container.statusRotator == null) { // Set presence to status rotator if MOTD is disabled
                this.container.logger.info('Initialising presence rotator.');
                this.container.statusRotator = setInterval(async () => {
                    const activity = this.container.config.activities[this.container.statusRotatorCurrent];
                    client.user.setPresence({ activities: [activity], status: activity.status });
                    this.container.statusRotatorCurrent = this.container.statusRotatorCurrent >= this.container.config.activities.length - 1 ? 0 : this.container.statusRotatorCurrent + 1;
                }, this.container.config.activityRotateDelay * 1000);
            }
        }, 5000);
    }
}