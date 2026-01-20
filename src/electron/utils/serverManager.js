// @ts-nocheck
/**
 * Server Manager - Adds servers to Minecraft's server list (servers.dat)
 */

import fs from 'fs/promises';
import path from 'path';
import nbt from 'nbt';

/**
 * Add a server to Minecraft's server list (servers.dat)
 * @param {string} minecraftPath - Path to Minecraft directory
 * @param {string} serverName - Display name of the server
 * @param {string} serverIp - Server IP address (with port if needed, e.g., "localhost:25565")
 * @param {boolean} [resourcePack=false] - Whether to accept server resource packs
 */
export async function addServerToList(minecraftPath, serverName, serverIp, resourcePack = false) {
    try {
        const serversDatPath = path.join(minecraftPath, 'servers.dat');

        let serversList = [];

        // Try to read existing servers.dat
        try {
            const existingData = await fs.readFile(serversDatPath);
            const nbtData = await parseNBTData(existingData);
            if (nbtData && nbtData.servers && nbtData.servers.value) {
                serversList = nbtData.servers.value;
            }
        } catch (error) {
            // File doesn't exist or is invalid, start with empty list
            console.log('[ServerManager] No existing servers.dat, creating new one');
        }

        // Check if server already exists
        const existingServerIndex = serversList.findIndex(
            server => server.ip && server.ip.value === serverIp
        );

        if (existingServerIndex !== -1) {
            console.log(`[ServerManager] Server ${serverIp} already exists, updating name`);
            serversList[existingServerIndex].name.value = serverName;
            if (serversList[existingServerIndex].acceptTextures) {
                serversList[existingServerIndex].acceptTextures.value = resourcePack ? 1 : 0;
            }
        } else {
            // Add new server
            console.log(`[ServerManager] Adding server ${serverName} (${serverIp})`);
            serversList.push({
                name: { type: 'string', value: serverName },
                ip: { type: 'string', value: serverIp }
            });
        }

        // Write the servers.dat file
        const nbtBuffer = await encodeNBTData(serversList);
        await fs.writeFile(serversDatPath, nbtBuffer);

        console.log(`[ServerManager] Server list saved to ${serversDatPath}`);
        return true;
    } catch (error) {
        console.error('[ServerManager] Error adding server to list:', error);
        return false;
    }
}

/**
 * Parse NBT data from buffer (gzipped)
 */
async function parseNBTData(buffer) {
    return new Promise((resolve, reject) => {
        nbt.parse(buffer, (error, result) => {
            if (error) {
                reject(error);
            } else {
                resolve(result.value);
            }
        });
    });
}

/**
 * Encode NBT data to buffer (gzipped)
 */
async function encodeNBTData(serversList) {
    return new Promise((resolve, reject) => {
        const nbtData = {
            name: '',
            value: {
                servers: {
                    type: 'list',
                    value: {
                        type: 'compound',
                        value: serversList
                    }
                }
            }
        };

        nbt.write(nbtData, (error, buffer) => {
            if (error) {
                reject(error);
            } else {
                resolve(buffer);
            }
        });
    });
}

/**
 * Remove a server from the server list
 */
export async function removeServerFromList(minecraftPath, serverIp) {
    try {
        const serversDatPath = path.join(minecraftPath, 'servers.dat');
        const existingData = await fs.readFile(serversDatPath);
        const nbtData = await parseNBTData(existingData);

        if (!nbtData || !nbtData.servers || !nbtData.servers.value) {
            return false;
        }

        let serversList = nbtData.servers.value;

        // Filter out the server
        const originalLength = serversList.length;
        serversList = serversList.filter(server => server.ip && server.ip.value !== serverIp);

        if (serversList.length === originalLength) {
            return false; // Server not found
        }

        // Write back
        const nbtBuffer = await encodeNBTData(serversList);
        await fs.writeFile(serversDatPath, nbtBuffer);

        return true;
    } catch (error) {
        console.error('[ServerManager] Error removing server:', error);
        return false;
    }
}

/**
 * Get all servers from the server list
 */
export async function getServersList(minecraftPath) {
    try {
        const serversDatPath = path.join(minecraftPath, 'servers.dat');
        const existingData = await fs.readFile(serversDatPath);
        const nbtData = await parseNBTData(existingData);

        if (!nbtData || !nbtData.servers || !nbtData.servers.value) {
            return [];
        }

        return nbtData.servers.value.map(server => ({
            name: server.name ? server.name.value : 'Unknown',
            ip: server.ip ? server.ip.value : '',
            acceptTextures: server.acceptTextures ? server.acceptTextures.value === 1 : false
        }));
    } catch (error) {
        console.error('[ServerManager] Error reading servers:', error);
        return [];
    }
}
