// @ts-nocheck
/**
 * Server Manager - Adds servers to Minecraft's server list (servers.dat)
 */

import fs from 'fs/promises';
import path from 'path';
import { nbt } from 'nbt';

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

        let serversData = {
            data: {
                servers: {
                    type: 'list',
                    value: []
                }
            }
        };

        // Try to read existing servers.dat
        try {
            const existingData = await fs.readFile(serversDatPath);
            // Parse NBT data (gzipped)
            const nbtData = await parseNBTData(existingData);
            if (nbtData && nbtData.servers) {
                serversData.data.servers.value = nbtData.servers;
            }
        } catch (error) {
            // File doesn't exist or is invalid, start with empty list
            console.log('[ServerManager] No existing servers.dat, creating new one');
        }

        // Check if server already exists
        const existingServer = serversData.data.servers.value.find(
            server => server.ip.value === serverIp
        );

        if (existingServer) {
            console.log(`[ServerManager] Server ${serverIp} already exists, updating name`);
            existingServer.name.value = serverName;
            existingServer.accept.value = resourcePack ? 1 : 0;
        } else {
            // Add new server
            console.log(`[ServerManager] Adding server ${serverName} (${serverIp})`);
            serversData.data.servers.value.push({
                name: { type: 'string', value: serverName },
                ip: { type: 'string', value: serverIp },
                icon: { type: 'byteArray', value: [] },
                accept: { type: 'byte', value: resourcePack ? 1 : 0 }
            });
        }

        // Write the servers.dat file
        const nbtBuffer = await encodeNBTData(serversData.data);
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
        try {
            const nbtReader = new nbt.Reader(buffer, (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            });
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Encode NBT data to buffer (gzipped)
 */
async function encodeNBTData(data) {
    return new Promise((resolve, reject) => {
        try {
            const nbtWriter = new nbt.Writer(data, (error, buffer) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(buffer);
                }
            });
        } catch (error) {
            reject(error);
        }
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

        if (!nbtData || !nbtData.servers) {
            return false;
        }

        // Filter out the server
        const originalLength = nbtData.servers.length;
        nbtData.servers = nbtData.servers.filter(server => server.ip.value !== serverIp);

        if (nbtData.servers.length === originalLength) {
            return false; // Server not found
        }

        // Write back
        const newData = { servers: nbtData.servers };
        const nbtBuffer = await encodeNBTData(newData);
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

        if (!nbtData || !nbtData.servers) {
            return [];
        }

        return nbtData.servers.map(server => ({
            name: server.name.value,
            ip: server.ip.value,
            accept: server.accept.value === 1
        }));
    } catch (error) {
        console.error('[ServerManager] Error reading servers:', error);
        return [];
    }
}
