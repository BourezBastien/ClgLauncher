// @ts-nocheck
/**
 * Remote configuration service for CLG Launcher
 * Fetches server configuration from http://launcher.urahost.fr/sample_distribution.json
 */

import axios from 'axios';

const DISTRIBUTION_URL = 'http://launcher.urahost.fr/sample_distribution.json';

// Cache for remote configuration
let cachedConfig = null;
let configFetchPromise = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch remote configuration from the distribution server
 * @returns {Promise<Object>} The configuration object
 */
export async function fetchRemoteConfig() {
    const now = Date.now();

    // Return cached config if still valid
    if (cachedConfig && (now - lastFetchTime) < CACHE_DURATION) {
        return cachedConfig;
    }

    // If a fetch is already in progress, return that promise
    if (configFetchPromise) {
        return configFetchPromise;
    }

    configFetchPromise = (async () => {
        try {
            const response = await axios.get(DISTRIBUTION_URL, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'CLG Launcher/1.0.0',
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            });

            cachedConfig = response.data;
            lastFetchTime = now;
            console.log('[RemoteConfig] Configuration fetched successfully:', cachedConfig);
            return cachedConfig;
        } catch (error) {
            console.error('[RemoteConfig] Failed to fetch configuration:', error.message);

            // Return cached config if available, even if expired
            if (cachedConfig) {
                console.warn('[RemoteConfig] Using expired cached config due to fetch failure');
                return cachedConfig;
            }

            // Return fallback defaults
            console.warn('[RemoteConfig] Using fallback defaults');
            return getFallbackConfig();
        } finally {
            configFetchPromise = null;
        }
    })();

    return configFetchPromise;
}

/**
 * Get the main server configuration
 * @returns {Promise<Object>} The main server config with address and minecraftVersion
 */
export async function getMainServerConfig() {
    try {
        const config = await fetchRemoteConfig();

        if (config.servers && Array.isArray(config.servers)) {
            const mainServer = config.servers.find(s => s.mainServer === true);
            if (mainServer) {
                // Parse address to extract IP and port
                const [ip, port] = (mainServer.address || ':').split(':');

                return {
                    id: mainServer.id,
                    name: mainServer.name,
                    description: mainServer.description,
                    ip: ip,
                    port: parseInt(port) || 25565,
                    minecraftVersion: mainServer.minecraftVersion || '1.19.4',
                    autoconnect: mainServer.autoconnect !== false,
                    icon: mainServer.icon,
                    discord: mainServer.discord
                };
            }
        }
    } catch (error) {
        console.error('[RemoteConfig] Error getting main server config:', error);
    }

    // Fallback to defaults
    return {
        id: 'fallback-server',
        name: 'Serveur Club informatique',
        ip: '179.61.190.50',
        port: 25565,
        minecraftVersion: '1.19.4',
        autoconnect: true
    };
}

/**
 * Get the Minecraft version for the main server
 * @returns {Promise<string>} The Minecraft version
 */
export async function getServerMinecraftVersion() {
    const config = await getMainServerConfig();
    return config.minecraftVersion;
}

/**
 * Get the server address (IP and port)
 * @returns {Promise<Object>} Object with ip and port properties
 */
export async function getServerAddress() {
    const config = await getMainServerConfig();
    return {
        ip: config.ip,
        port: config.port
    };
}

/**
 * Force refresh the remote configuration
 */
export async function refreshRemoteConfig() {
    lastFetchTime = 0;
    cachedConfig = null;
    return await fetchRemoteConfig();
}

/**
 * Get fallback configuration when remote is unavailable
 */
function getFallbackConfig() {
    return {
        version: '1.0.0',
        discord: {
            clientId: '',
            smallImageText: 'Mon Serveur',
            smallImageKey: 'seal-circle'
        },
        java: {
            oracle: 'http://www.oracle.com/technetwork/java/javase/downloads/jre8-downloads-2133155.html'
        },
        servers: [
            {
                id: 'fallback-server',
                name: 'Serveur Club informatique',
                description: 'Serveur Minecraft du Club Informatique du Collège Madame d\'Epinay.',
                icon: 'assets/images/logo.png',
                version: '1.0.0',
                address: '179.61.190.50:25565',
                minecraftVersion: '1.19.4',
                discord: {
                    shortId: 'Club informatique - CLG Madame Epinay',
                    largeImageText: 'Club informatique - CLG Madame Epinay',
                    largeImageKey: 'server-club-informatique-clg-madame-epinay'
                },
                mainServer: true,
                autoconnect: true,
                modules: []
            }
        ]
    };
}
