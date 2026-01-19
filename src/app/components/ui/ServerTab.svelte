<script>
    // @ts-nocheck
    import { onMount, onDestroy } from 'svelte';
    import { selectedAccountUsername, userAccountState } from "../../stores/account";
    import { uiState, showToast } from "../../stores/ui";
    import { fetchServerStatus, getServerIP, getServerPort, initServerConfig } from "../../services/api";
    import { getServerMinecraftVersion } from "../../services/remoteConfig";
    import { t } from "../../stores/i18n";
    import { getSelectedAccount } from "../../shared/user";
    import { settings } from "../../stores/settings";
    import {
        isLaunching,
        launchStatus,
        canLaunch,
        launchActions
    } from "../../stores/launch";
    import { logger } from "../../utils/logger";
    import { discordRPCManager } from '../../utils/discordRPCManager.js';
    import SimpleTip from "./SimpleTip.svelte";

    let { hasAccount } = userAccountState;

    // Helper function to compare Minecraft versions
    function isVersionGreaterOrEqual(version, target) {
        const vParts = version.split('.').map(Number);
        const tParts = target.split('.').map(Number);

        for (let i = 0; i < Math.max(vParts.length, tParts.length); i++) {
            const v = vParts[i] || 0;
            const t = tParts[i] || 0;
            if (v > t) return true;
            if (v < t) return false;
        }
        return true;
    }

    // Server status
    let serverStatus = {
        online: false,
        players: { online: 0, max: 0, list: [] },
        motd: '',
        version: '',
        icon: null
    };
    let statusInterval;

    // Server version to launch - loaded from remote config
    let serverVersion = '1.19.4';
    let serverIp = '179.61.190.50';
    let serverPort = 25565;

    onMount(async () => {
        // Initialize server configuration from remote
        await initServerConfig();
        serverIp = getServerIP();
        serverPort = getServerPort();
        serverVersion = await getServerMinecraftVersion();
        console.log(`[ServerTab] Config loaded: ${serverIp}:${serverPort}, version ${serverVersion}`);

        await updateServerStatus();
        statusInterval = setInterval(updateServerStatus, 30000); // Update every 30 seconds
    });

    onDestroy(() => {
        if (statusInterval) {
            clearInterval(statusInterval);
        }
    });

    async function updateServerStatus() {
        serverStatus = await fetchServerStatus();
    }

    async function handleJoinServer() {
        if ($isLaunching) {
            return;
        }

        if (!$selectedAccountUsername) {
            if ($hasAccount) {
                uiState.activeTab.set('accountmanager');
            } else {
                uiState.toggleModel.set('accountadder');
            }
            return;
        }

        try {
            await logger.startSession();
            logger.success(`--------------------------------------------------------------------`)
            logger.success(`* \n${new Date().toLocaleString()} : ${$t('mainContent.launch.launchStatus.preparing')} [ Minecraft ${serverVersion} - Server: ${serverIp}:${serverPort} ]\n`)
            logger.success(`--------------------------------------------------------------------`)
            launchActions.setLaunching(true);
            launchActions.setStatus('preparing');

            // Add server to Minecraft's server list (servers.dat)
            try {
                const minecraftFolder = await window.electron.getMinecraftFolder();
                await window.electron.addServerToList(
                    minecraftFolder,
                    'Serveur Club informatique',
                    `${serverIp}:${serverPort}`
                );
                logger.success(`Server added to Minecraft server list`);
            } catch (serverError) {
                console.warn('Could not add server to list:', serverError);
                // Don't fail the launch if adding to server list fails
            }

            // Build game arguments with server auto-connect
            let gameArgs = $settings.game.runtime.gameArgs.value ? $settings.game.runtime.gameArgs.value.split(' ') : [];

            // Add server connection arguments based on Minecraft version
            // For Minecraft 1.20+, use quickPlayMultiplayer instead of --server/--port
            const isModernVersion = isVersionGreaterOrEqual(serverVersion, '1.20.0');

            if (isModernVersion) {
                // Minecraft 1.20+ uses Quick Play system
                gameArgs.push('--quickPlayMultiplayer', `${serverIp}:${serverPort}`);
            } else {
                // Older versions use --server and --port
                gameArgs.push('--server', serverIp);
                gameArgs.push('--port', String(serverPort));
            }

            let launchOptions = {
                url: null,
                authenticator: getSelectedAccount(),
                timeout: 10000,
                path: $settings.storage.directories.minecraftFolder.value,
                version: serverVersion,
                detached: $settings.game.runtime.runDetached.value,
                downloadFileMultiple: 10,
                intelEnabledMac: $settings.game.runtime.intelEnabledMac.value,
                loader: { enable: false },
                verify: $settings.game.runtime.verifyGameFiles.value,
                ignored: $settings.game.runtime.ignored.value,
                javaPath: $settings.game.runtime.javaPath.value === '' ? null : $settings.game.runtime.javaPath.value,
                JVM_ARGS: $settings.game.runtime.JVMArgs.value.split(' ') || [],
                GAME_ARGS: gameArgs,
                memory: {
                    min: `${$settings.game.performance.ramAllocation.min.value}G`,
                    max: `${$settings.game.performance.ramAllocation.max.value}G`
                }
            };
            await window.electron.launchGame(launchOptions);
        } catch (error) {
            launchActions.setError(error.message || 'Launch failed');
            showToast($t('toast.launchError'), 'error');
            launchActions.reset();
        }

        await discordRPCManager.setIdleActivity();
    }
</script>

<div class="server-tab-container">
    <div class="server-info-card">
        <div class="server-header">
            <div class="server-icon">
                {#if serverStatus.icon}
                    <img src={serverStatus.icon} alt="Server icon" />
                {:else}
                    <i class="fa fa-server"></i>
                {/if}
            </div>
            <div class="server-details">
                <h2>{$t('server.title')}</h2>
                <span class="server-address">{serverIp}:{serverPort}</span>
            </div>
            <div class="server-status-badge" class:online={serverStatus.online} class:offline={!serverStatus.online}>
                <span class="status-dot"></span>
                {serverStatus.online ? $t('server.online') : $t('server.offline')}
            </div>
        </div>

        {#if serverStatus.motd}
            <div class="server-motd">
                {serverStatus.motd}
            </div>
        {/if}

        <div class="server-stats">
            <div class="stat-item">
                <i class="fa fa-users"></i>
                <span class="stat-value">{serverStatus.players.online}</span>
                <span class="stat-label">/ {serverStatus.players.max} {$t('server.players')}</span>
            </div>
            <div class="stat-item">
                <i class="fa fa-cube"></i>
                <span class="stat-value">{serverVersion}</span>
                <span class="stat-label">{$t('server.version')}</span>
            </div>
        </div>

        {#if serverStatus.players.list && serverStatus.players.list.length > 0}
            <div class="players-list">
                <h4>{$t('server.onlinePlayers')}</h4>
                <div class="players-grid">
                    {#each serverStatus.players.list as player}
                        <span class="player-name">{player}</span>
                    {/each}
                </div>
            </div>
        {/if}
    </div>

    <div class="join-section">
        <div class="join-btn-container" class:busy-btn={$isLaunching}>
            <button
                on:click={handleJoinServer}
                class="join-btn"
                class:launching={$isLaunching}
                disabled={!$canLaunch || !serverStatus.online}
            >
                <span class="btn-label">
                    {#if $isLaunching}
                        {$launchStatus === 'running' ? $t('server.playing') : $t('mainContent.launch.launching')}
                    {:else if !serverStatus.online}
                        {$t('server.serverOffline')}
                    {:else}
                        {$t('server.joinServer')}
                    {/if}
                </span>
                <span class="btn-sublabel">
                    {#if $isLaunching}
                        {$t(`mainContent.launch.launchStatus.${$launchStatus}`)}
                    {:else if serverStatus.online}
                        Minecraft {serverVersion}
                    {/if}
                </span>
            </button>
            {#if $isLaunching}
                <SimpleTip text="{$launchStatus === 'running' ? $t('mainContent.launch.closeGame') : $t('mainContent.launch.cancel')}" direction="right">
                    <button
                        class="cancel-btn"
                        aria-label="Cancel"
                        on:click={async () => {
                            await window.electron.cancelLaunch();
                        }}
                    >
                        <i class="fa fa-stop"></i>
                    </button>
                </SimpleTip>
            {/if}
        </div>
    </div>
</div>

<style>
    .server-tab-container {
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        row-gap: 1.5vw;
        overflow: hidden;
    }

    .server-info-card {
        background-color: var(--surface-color);
        border: 2px solid var(--border-color);
        border-radius: var(--border-radius-20);
        padding: 2vw;
        display: flex;
        flex-direction: column;
        row-gap: 1.5vw;
        flex-grow: 1;
    }

    .server-header {
        display: flex;
        flex-direction: row;
        align-items: center;
        column-gap: 1.5vw;
    }

    .server-icon {
        width: 4rem;
        height: 4rem;
        background-color: var(--base-color);
        border-radius: var(--border-radius-10);
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;

        img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        i {
            font-size: 2rem;
            color: var(--text-color-muted);
        }
    }

    .server-details {
        flex-grow: 1;

        h2 {
            font-size: 1.5rem;
            color: var(--text-color);
            margin: 0;
        }

        .server-address {
            font-size: var(--font-size-fluid-sm);
            color: var(--text-color-muted);
            font-family: monospace;
        }
    }

    .server-status-badge {
        display: flex;
        align-items: center;
        column-gap: 0.5rem;
        padding: 0.5vw 1vw;
        border-radius: var(--border-radius-5);
        font-size: var(--font-size-fluid-sm);
        font-weight: 600;

        .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
        }
    }

    .server-status-badge.online {
        background-color: var(--success-color-25);
        color: var(--success-color);

        .status-dot {
            background-color: var(--success-color);
            box-shadow: 0 0 8px var(--success-color);
        }
    }

    .server-status-badge.offline {
        background-color: var(--error-color-25);
        color: var(--error-color);

        .status-dot {
            background-color: var(--error-color);
        }
    }

    .server-motd {
        background-color: var(--base-color);
        padding: 1vw;
        border-radius: var(--border-radius-10);
        color: var(--text-color-muted);
        font-size: var(--font-size-fluid-base);
        text-align: center;
    }

    .server-stats {
        display: flex;
        flex-direction: row;
        column-gap: 2vw;
    }

    .stat-item {
        display: flex;
        align-items: center;
        column-gap: 0.5vw;
        padding: 1vw 2vw;
        background-color: var(--base-color);
        border-radius: var(--border-radius-10);

        i {
            color: var(--accent-color);
            font-size: var(--font-size-fluid-lg);
        }

        .stat-value {
            font-size: var(--font-size-fluid-xl);
            font-weight: 700;
            color: var(--text-color);
        }

        .stat-label {
            color: var(--text-color-muted);
            font-size: var(--font-size-fluid-sm);
        }
    }

    .players-list {
        background-color: var(--base-color);
        padding: 1vw;
        border-radius: var(--border-radius-10);

        h4 {
            margin: 0 0 0.5vw 0;
            color: var(--text-color);
            font-size: var(--font-size-fluid-base);
        }
    }

    .players-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5vw;
    }

    .player-name {
        background-color: var(--overlay-color-1);
        padding: 0.3vw 0.8vw;
        border-radius: var(--border-radius-5);
        font-size: var(--font-size-fluid-sm);
        color: var(--text-color);
    }

    .join-section {
        display: flex;
        justify-content: center;
    }

    .join-btn-container {
        display: flex;
        flex-direction: row;
        box-shadow: inset 0 0 0 3px var(--accent-color);
        overflow: hidden;
        border-radius: var(--border-radius-10);
        background: linear-gradient(
            to right,
            var(--accent-color),
            var(--accent-color-light)
        );
        text-shadow: 2px 1px 3px rgba(0, 0, 0, 0.192);
        transition: all .4s ease;

        &:hover {
            background: linear-gradient(
                to right,
                var(--accent-color),
                var(--accent-color-light),
                var(--accent-color)
            );
            box-shadow: inset 0 0 0 3px #ffffff50;
        }
    }

    .join-btn-container.busy-btn {
        background: linear-gradient(to right, var(--error-color), #fd4343);
        box-shadow: inset 0 0 0 3px var(--error-color);

        &:hover {
            background: linear-gradient(
                to right,
                var(--error-color),
                #fd4343,
                var(--error-color)
            );
            box-shadow: inset 0 0 0 3px #ffffff50;
        }
    }

    .join-btn {
        padding: 1.5vw 4vw;
        min-width: 15rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: var(--text-color) !important;
        transition: all .2s ease !important;

        .btn-label {
            font-weight: 800;
            font-size: 1.3rem;
            text-transform: uppercase;
        }

        .btn-sublabel {
            font-size: 0.9rem;
            opacity: 0.9;
        }
    }

    .join-btn:disabled {
        opacity: 0.7;
        cursor: not-allowed;
    }

    .cancel-btn {
        padding: 1.2vw 1.5vw !important;
        background-color: #0000002d;
        color: var(--text-color);
        font-size: 1.23rem;
        display: flex;
        align-items: center;
        justify-content: center;

        &:hover {
            background-color: #0000003d;
        }
    }
</style>
