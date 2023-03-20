import { Listener } from '@sapphire/framework';
import { ActivityType } from 'discord.js';

export class ReadyListener extends Listener {
    constructor(context, options) {
        super(context, {
            ...options,
            once: true,
            event: 'ready'
        });
    }
    async run (client) {
        // Check for playlists database
        let playlists = await this.container.db.get('playlists');
        if (!playlists) {
            playlists = {
                '000000000000': {
                    info: {
                        id: '000000000000', // ID of the playlist (should be unique)
                        name: '', // Name of the playlist
                        description: '', // Playlist description
                        owner: '', // ID of the playlist owner
                        iconURL: '', // URL of the playlist icon
                        private: true, // Set to false if the playlist can be accessed using its identifier
                    },
                    tracks: [] // Array of tracks
                }
            };
            await this.container.db.set('playlists', playlists);
        }

        const { username, id } = client.user;
        this.container.logger.info(`Logged in as ${username} (${id})`);

        this.container.statusRotatorCurrent = 0;
        this.container.presenceUpdateRequired = true;

        // Status rotate (configurable interval)
        setInterval(async () => {
            const motd = await this.container.db.get('motd') || { enabled: false };
            const maintenance = await this.container.db.get('maintenance') || false;
            this.container.motd = motd;
            this.container.maintenance = maintenance;

            if (maintenance && client.user.presence.activities[0].name !== 'maintenance mode') {
                client.user.setPresence({ activities: [{ name: 'maintenance mode', type: ActivityType.Playing }], status: 'dnd' });
                this.container.logger.debug('Presence updated.');
            }
            if (motd.enabled && client.user.presence.activities[0].name !== motd.presence.name) {
                client.user.setPresence({ activities: [motd.presence], status: motd.presence.status });
                this.container.logger.debug('Presence updated.');
            }
            if (!maintenance && !motd.enabled && this.container.presenceUpdateRequired) {
                const activity = this.container.config.activities[this.container.statusRotatorCurrent];
                if (client.user.presence.activities.name !== activity.name) {
                    client.user.setPresence({ activities: [activity], status: activity.status });
                    this.container.logger.debug('Presence updated.');
                }
                this.container.statusRotatorCurrent = this.container.statusRotatorCurrent >= this.container.config.activities.length - 1 ? 0 : this.container.statusRotatorCurrent + 1;
                this.container.presenceUpdateRequired = false;
            }
        }, 5000);

        setInterval(async () => {
            this.container.presenceUpdateRequired = true;
        }, this.container.config.activityRotateDelay * 1000);

        setInterval(async () => {
            const stats = await this.container.db.get('stats');
            if (!stats) {
                this.container.db.set('stats', {
                    tracksPlayed: this.container.tracksPlayed,
                    totalTracksPlayed: this.container.totalTracksPlayed,
                    totalDuration: this.container.totalTrackDuration,
                    totalCommandsInvoked: this.container.totalCommandsInvoked, 
                    totalUptime: process.uptime()
                });
            } else {
                this.container.db.set('stats', { 
                    tracksPlayed: [...stats.tracksPlayed, ...this.container.tracksPlayed], // List of tracks played by the bot ({ identifier, source, title, author })
                    totalTracksPlayed: this.container.totalTracksPlayed + stats.totalTracksPlayed, // Total number of tracks played by the bot
                    totalDuration: this.container.totalTrackDuration + stats.totalDuration, // Total duration of all tracks played by the bot (not including streams of course) in milliseconds
                    totalCommandsInvoked: this.container.totalCommandsInvoked + stats.totalCommandsInvoked, // Total number of commands invoked by users
                    totalUptime: process.uptime() + stats.totalUptime // Total uptime of the bot in seconds
                });
            }
            this.container.tracksPlayed = [];
            this.container.tracksPlayed = 0;
            this.container.totalTracksPlayed = 0;
            this.container.totalDuration = 0;
            this.container.totalCommandsInvoked = 0;
            this.container.totalUptime = 0;
            this.container.logger.debug('Stats updated.');
        }, 300000);
    }
}