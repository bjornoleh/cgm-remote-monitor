<script lang="ts">
	import { io } from 'socket.io-client';
	import { onMount, onDestroy } from 'svelte';
	import { getClientState, updateClientState } from '$lib/stores/client-state.svelte.ts';

	interface Props {
		serverSettings: any;
		onDataUpdate?: (data: any) => void;
		onAlarm?: (alarm: any) => void;
		onAnnouncement?: (announcement: any) => void;
	}

	let { 
		serverSettings,
		onDataUpdate,
		onAlarm,
		onAnnouncement
	}: Props = $props();

	let socket: any = null;
	let alarmSocket: any = null;
	let reconnectTimer: number | null = null;
	let isConnected = $state(false);

	const clientState = getClientState();

	onMount(() => {
		connectSockets();
		
		// Handle browser visibility changes for reconnection
		document.addEventListener('visibilitychange', handleVisibilityChange);
		
		return () => {
			disconnectSockets();
			document.removeEventListener('visibilitychange', handleVisibilityChange);
		};
	});

	onDestroy(() => {
		disconnectSockets();
		if (reconnectTimer) {
			clearTimeout(reconnectTimer);
		}
	});

	function connectSockets() {
		try {
			// Main data socket
			socket = io({ 
				transports: ['polling'],
				timeout: 5000,
				autoConnect: true
			});

			// Alarm socket
			alarmSocket = io('/alarm', {
				multiplex: true,
				transports: ['polling'],
				timeout: 5000,
				autoConnect: true
			});

			setupSocketEvents();
		} catch (error) {
			console.error('Failed to connect sockets:', error);
			scheduleReconnect();
		}
	}

	function setupSocketEvents() {
		if (!socket || !alarmSocket) return;

		// Main socket events
		socket.on('connect', () => {
			console.log('Client connected to server');
			isConnected = true;
			updateClientState({ isConnected: true });
			
			if (reconnectTimer) {
				clearTimeout(reconnectTimer);
				reconnectTimer = null;
			}
		});

		socket.on('disconnect', (reason: string) => {
			console.log('Client disconnected:', reason);
			isConnected = false;
			updateClientState({ isConnected: false });
			
			if (reason === 'io server disconnect') {
				// Server initiated disconnect, try to reconnect
				scheduleReconnect();
			}
		});

		socket.on('dataUpdate', (data: any) => {
			console.log('Data update received:', data);
			handleDataUpdate(data);
			onDataUpdate?.(data);
		});

		socket.on('retroUpdate', (retroData: any) => {
			console.log('Retro update received:', retroData);
			// Handle historical data updates
			updateClientState({ 
				entries: [...clientState.entries, ...retroData.entries || []],
				treatments: [...clientState.treatments, ...retroData.treatments || []]
			});
		});

		socket.on('connect_error', (error: any) => {
			console.error('Socket connection error:', error);
			scheduleReconnect();
		});

		// Alarm socket events
		alarmSocket.on('connect', () => {
			console.log('Alarm socket connected');
		});

		alarmSocket.on('notification', (notify: any) => {
			console.log('Notification received:', notify);
			// Handle notifications (different from alarms)
		});

		alarmSocket.on('announcement', (notify: any) => {
			console.log('Announcement received:', notify);
			updateClientState({
				currentAnnouncement: {
					...notify,
					received: Date.now()
				}
			});
			onAnnouncement?.(notify);
		});

		alarmSocket.on('alarm', (notify: any) => {
			console.log('Alarm received:', notify);
			updateClientState({ alarmInProgress: true });
			onAlarm?.(notify);
		});

		alarmSocket.on('urgent_alarm', (notify: any) => {
			console.log('Urgent alarm received:', notify);
			updateClientState({ alarmInProgress: true });
			onAlarm?.(notify);
		});

		alarmSocket.on('clear_alarm', (notify: any) => {
			console.log('Alarm cleared:', notify);
			updateClientState({ alarmInProgress: false });
		});
	}

	function handleDataUpdate(data: any) {
		const updates: any = {
			now: Date.now()
		};

		if (data.sgvs && Array.isArray(data.sgvs)) {
			updates.entries = data.sgvs;
			updates.latestSGV = data.sgvs[data.sgvs.length - 1];
		}

		if (data.treatments && Array.isArray(data.treatments)) {
			updates.treatments = data.treatments;
		}

		if (data.devicestatus && Array.isArray(data.devicestatus)) {
			updates.deviceStatus = data.devicestatus;
		}

		updateClientState(updates);
	}

	function disconnectSockets() {
		if (socket) {
			socket.disconnect();
			socket = null;
		}
		
		if (alarmSocket) {
			alarmSocket.disconnect();
			alarmSocket = null;
		}
		
		isConnected = false;
		updateClientState({ isConnected: false });
	}

	function scheduleReconnect() {
		if (reconnectTimer) return;
		
		reconnectTimer = setTimeout(() => {
			console.log('Attempting to reconnect...');
			disconnectSockets();
			connectSockets();
		}, 5000);
	}

	function handleVisibilityChange() {
		if (!document.hidden && !isConnected) {
			console.log('Page became visible, checking connection...');
			scheduleReconnect();
		}
	}

	// Expose connection status and manual reconnect function
	export function reconnect() {
		disconnectSockets();
		connectSockets();
	}

	export function getConnectionStatus() {
		return isConnected;
	}
</script>

<!-- Connection status indicator -->
<div class="fixed top-4 right-4 z-50">
	{#if !isConnected}
		<div class="bg-destructive text-destructive-foreground px-3 py-1 rounded-lg text-sm font-medium flex items-center space-x-2">
			<div class="w-2 h-2 bg-current rounded-full animate-pulse"></div>
			<span>Connecting...</span>
		</div>
	{:else}
		<div class="bg-success text-success-foreground px-3 py-1 rounded-lg text-sm font-medium flex items-center space-x-2 opacity-0 transition-opacity duration-1000" class:opacity-100={clientState.isConnected}>
			<div class="w-2 h-2 bg-current rounded-full"></div>
			<span>Connected</span>
		</div>
	{/if}
</div>
