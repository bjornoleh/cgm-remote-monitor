<script lang="ts">
	import { slide } from 'svelte/transition';
	import { getClientState, updateClientState, type ClientSettings } from '$lib/stores/client-state.svelte.ts';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '$lib/components/ui/select';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';

	const clientState = getClientState();

	// Component state
	let isOpen = $state(false);
	let activeTab = $state('general');

	// Local settings state for editing
	let localSettings = $state<ClientSettings>({ ...clientState.settings });

	// Available options
	const unitOptions = [
		{ value: 'mg/dl', label: 'mg/dl' },
		{ value: 'mmol', label: 'mmol/L' }
	];

	const timeFormatOptions = [
		{ value: 12, label: '12-hour (AM/PM)' },
		{ value: 24, label: '24-hour' }
	];

	const themeOptions = [
		{ value: 'default', label: 'Default' },
		{ value: 'dark', label: 'Dark' },
		{ value: 'colors', label: 'Colorful' }
	];

	const languageOptions = [
		{ value: 'en', label: 'English' },
		{ value: 'de', label: 'Deutsch' },
		{ value: 'es', label: 'Español' },
		{ value: 'fr', label: 'Français' },
		{ value: 'it', label: 'Italiano' },
		{ value: 'nl', label: 'Nederlands' }
	];

	const alarmMinutesOptions = [
		{ value: 1, label: '1 minute' },
		{ value: 2, label: '2 minutes' },
		{ value: 3, label: '3 minutes' },
		{ value: 5, label: '5 minutes' },
		{ value: 10, label: '10 minutes' },
		{ value: 15, label: '15 minutes' },
		{ value: 30, label: '30 minutes' },
		{ value: 60, label: '1 hour' }
	];

	const focusHoursOptions = [
		{ value: 1, label: '1 hour' },
		{ value: 2, label: '2 hours' },
		{ value: 3, label: '3 hours' },
		{ value: 6, label: '6 hours' },
		{ value: 12, label: '12 hours' },
		{ value: 24, label: '24 hours' },
		{ value: 48, label: '48 hours' }
	];

	const pluginOptions = [
		{ value: 'delta', label: 'Delta' },
		{ value: 'direction', label: 'Direction' },
		{ value: 'upbat', label: 'Uploader Battery' },
		{ value: 'timeago', label: 'Time Ago' },
		{ value: 'devicestatus', label: 'Device Status' },
		{ value: 'errorcodes', label: 'Error Codes' },
		{ value: 'iob', label: 'IOB (Insulin on Board)' },
		{ value: 'cob', label: 'COB (Carbs on Board)' },
		{ value: 'bwp', label: 'Bolus Wizard Preview' },
		{ value: 'cage', label: 'Cannula Age' },
		{ value: 'sage', label: 'Sensor Age' },
		{ value: 'iage', label: 'Insulin Age' },
		{ value: 'bage', label: 'Battery Age' },
		{ value: 'basal', label: 'Basal Profile' },
		{ value: 'bridge', label: 'Share2Nightscout Bridge' },
		{ value: 'mmconnect', label: 'MiniMed Connect Bridge' },
		{ value: 'pump', label: 'Pump' },
		{ value: 'openaps', label: 'OpenAPS' },
		{ value: 'loop', label: 'Loop' },
		{ value: 'override', label: 'Override' }
	];

	// Functions
	function toggleDrawer() {
		isOpen = !isOpen;
		if (isOpen) {
			// Reset local settings to current state when opening
			localSettings = { ...clientState.settings };
		}
	}

	function switchTab(tab: string) {
		activeTab = tab;
	}

	function saveSettings() {
		// Update the client state with new settings
		updateClientState({ settings: localSettings });

		// Save to localStorage for persistence
		localStorage.setItem('nightscout-settings', JSON.stringify(localSettings));

		// TODO: Send settings to server if needed
		console.log('Settings saved:', localSettings);

		isOpen = false;
	}

	function resetToDefaults() {
		if (confirm('Are you sure you want to reset all settings to defaults?')) {
			localSettings = getDefaultSettings();
		}
	}

	function getDefaultSettings(): ClientSettings {
		return {
			units: 'mg/dl',
			timeFormat: 12,
			nightMode: false,
			showBGON: true,
			showIOB: true,
			showCOB: true,
			showBasal: true,
			showPlugins: ['delta', 'direction', 'timeago', 'devicestatus'],
			language: 'en',
			theme: 'default',
			alarmUrgentHigh: true,
			alarmUrgentHighMins: [15, 30, 60],
			alarmHigh: true,
			alarmHighMins: [30, 60],
			alarmLow: true,
			alarmLowMins: [15, 30, 45, 60],
			alarmUrgentLow: true,
			alarmUrgentLowMins: [5, 10, 15, 30],
			alarmTimeagoWarn: true,
			alarmTimeagoWarnMins: 15,
			alarmTimeagoUrgent: true,
			alarmTimeagoUrgentMins: 30,
			showForecast: true,
			focusHours: 3,
			heartbeat: 60,
			baseURL: '',
			authDefaultRoles: 'readable',
			thresholds: {
				bgHigh: 260,
				bgTargetTop: 180,
				bgTargetBottom: 80,
				bgLow: 55
			}
		};
	}

	function togglePlugin(plugin: string) {
		const plugins = localSettings.showPlugins || [];
		const index = plugins.indexOf(plugin);

		if (index > -1) {
			localSettings.showPlugins = plugins.filter(p => p !== plugin);
		} else {
			localSettings.showPlugins = [...plugins, plugin];
		}
	}

	function isPluginEnabled(plugin: string): boolean {
		return (localSettings.showPlugins || []).includes(plugin);
	}

	function addAlarmMinute(alarmType: 'alarmUrgentHighMins' | 'alarmHighMins' | 'alarmLowMins' | 'alarmUrgentLowMins', minutes: number) {
		const current = localSettings[alarmType] || [];
		if (!current.includes(minutes)) {
			localSettings[alarmType] = [...current, minutes].sort((a, b) => a - b);
		}
	}

	function removeAlarmMinute(alarmType: 'alarmUrgentHighMins' | 'alarmHighMins' | 'alarmLowMins' | 'alarmUrgentLowMins', minutes: number) {
		const current = localSettings[alarmType] || [];
		localSettings[alarmType] = current.filter(m => m !== minutes);
	}
</script>

<!-- Settings Button -->
<Button
	variant={isOpen ? "default" : "secondary"}
	onclick={toggleDrawer}
	title="Settings"
	class="settings-btn"
>
	⚙️
</Button>

<!-- Settings Drawer -->
{#if isOpen}
	<div class="settings-drawer" transition:slide={{duration: 300}}>		<div class="drawer-header">
			<h3>Settings</h3>
			<Button variant="ghost" size="sm" onclick={() => isOpen = false} class="close-btn">×</Button>
		</div>
		<!-- Tab Navigation -->
		<div class="tab-nav">
			<Button
				variant="ghost"
				class="tab-btn {activeTab === 'general' ? 'active' : ''}"
				onclick={() => switchTab('general')}
			>
				General
			</Button>
			<Button
				variant="ghost"
				class="tab-btn {activeTab === 'alarms' ? 'active' : ''}"
				onclick={() => switchTab('alarms')}
			>
				Alarms
			</Button>
			<Button
				variant="ghost"
				class="tab-btn {activeTab === 'display' ? 'active' : ''}"
				onclick={() => switchTab('display')}
			>
				Display
			</Button>
			<Button
				variant="ghost"
				class="tab-btn {activeTab === 'plugins' ? 'active' : ''}"
				onclick={() => switchTab('plugins')}
			>
				Plugins
			</Button>
		</div>

		<div class="drawer-content">
			<!-- General Tab -->			{#if activeTab === 'general'}
				<Card class="settings-section">
					<CardHeader>
						<CardTitle>Units & Format</CardTitle>
					</CardHeader>
					<CardContent class="space-y-4">
						<div class="input-row">
							<Label for="units">Blood Glucose Units:</Label>
							<Select bind:value={localSettings.units}>
								<SelectTrigger>
									<SelectValue placeholder="Select units" />
								</SelectTrigger>
								<SelectContent>
									{#each unitOptions as option}
										<SelectItem value={option.value}>{option.label}</SelectItem>
									{/each}
								</SelectContent>
							</Select>
						</div>

						<div class="input-row">
							<Label for="timeFormat">Time Format:</Label>
							<Select bind:value={localSettings.timeFormat}>
								<SelectTrigger>
									<SelectValue placeholder="Select time format" />
								</SelectTrigger>
								<SelectContent>
									{#each timeFormatOptions as option}
										<SelectItem value={option.value}>{option.label}</SelectItem>
									{/each}
								</SelectContent>
							</Select>
						</div>

						<div class="input-row">
							<Label for="language">Language:</Label>
							<Select bind:value={localSettings.language}>
								<SelectTrigger>
									<SelectValue placeholder="Select language" />
								</SelectTrigger>
								<SelectContent>
									{#each languageOptions as option}
										<SelectItem value={option.value}>{option.label}</SelectItem>
									{/each}
								</SelectContent>
							</Select>
						</div>

						<div class="input-row">
							<Label for="focusHours">Focus Hours:</Label>
							<Select bind:value={localSettings.focusHours}>
								<SelectTrigger>
									<SelectValue placeholder="Select focus hours" />
								</SelectTrigger>
								<SelectContent>
									{#each focusHoursOptions as option}
										<SelectItem value={option.value}>{option.label}</SelectItem>
									{/each}
								</SelectContent>
							</Select>
						</div>
					</CardContent>
				</Card>

				<Card class="settings-section">
					<CardHeader>
						<CardTitle>BG Target Range</CardTitle>
						<p class="section-description">
							Set your target blood glucose range for better visualization.
						</p>
					</CardHeader>
					<CardContent class="space-y-4">
						<div class="input-row">
							<Label for="bgHigh">High Alert:</Label>
							<Input
								id="bgHigh"
								type="number"
								bind:value={localSettings.thresholds.bgHigh}
								min="100"
								max="400"
								step={localSettings.units === 'mmol' ? '0.1' : '1'}
							/>
							<span class="units">{localSettings.units}</span>
						</div>

						<div class="input-row">
							<Label for="bgTargetTop">Target Top:</Label>
							<Input
								id="bgTargetTop"
								type="number"
								bind:value={localSettings.thresholds.bgTargetTop}
								min="80"
								max="300"
								step={localSettings.units === 'mmol' ? '0.1' : '1'}
							/>
							<span class="units">{localSettings.units}</span>
						</div>

						<div class="input-row">
							<Label for="bgTargetBottom">Target Bottom:</Label>
							<Input
								id="bgTargetBottom"
								type="number"
								bind:value={localSettings.thresholds.bgTargetBottom}
								min="40"
								max="150"
								step={localSettings.units === 'mmol' ? '0.1' : '1'}
							/>
							<span class="units">{localSettings.units}</span>
						</div>

						<div class="input-row">
							<Label for="bgLow">Low Alert:</Label>
							<Input
								id="bgLow"
								type="number"
								bind:value={localSettings.thresholds.bgLow}
								min="30"
								max="100"
								step={localSettings.units === 'mmol' ? '0.1' : '1'}
							/>
							<span class="units">{localSettings.units}</span>
						</div>
					</CardContent>				</Card>
			{/if}

			<!-- Alarms Tab -->
			{#if activeTab === 'alarms'}
				<Card class="settings-section">
					<CardHeader>
						<CardTitle>BG Alarms</CardTitle>
					</CardHeader>
					<CardContent class="space-y-4">
						<div class="flex items-center space-x-2">
							<Checkbox
								id="alarmUrgentHigh"
								bind:checked={localSettings.alarmUrgentHigh}
							/>
							<Label for="alarmUrgentHigh">Urgent High Alarm</Label>
						</div>

						{#if localSettings.alarmUrgentHigh}
							<div class="alarm-minutes">
								<Label class="text-sm text-muted-foreground">Snooze options (minutes):</Label>
								<div class="minutes-list">
									{#each (localSettings.alarmUrgentHighMins || []) as minutes}
										<span class="minute-chip">
											{minutes}
											<Button variant="ghost" size="sm" onclick={() => removeAlarmMinute('alarmUrgentHighMins', minutes)}>×</Button>
										</span>
									{/each}
								</div>
								<Select onchange={(e) => addAlarmMinute('alarmUrgentHighMins', parseInt(e.target.value))}>
									<SelectTrigger>
										<SelectValue placeholder="Add snooze option" />
									</SelectTrigger>
									<SelectContent>
										{#each alarmMinutesOptions as option}
											<SelectItem value={option.value}>{option.label}</SelectItem>
										{/each}
									</SelectContent>
								</Select>
							</div>
						{/if}

						<div class="flex items-center space-x-2">
							<Checkbox
								id="alarmHigh"
								bind:checked={localSettings.alarmHigh}
							/>
							<Label for="alarmHigh">High Alarm</Label>
						</div>

						{#if localSettings.alarmHigh}
							<div class="alarm-minutes">
								<Label class="text-sm text-muted-foreground">Snooze options (minutes):</Label>
								<div class="minutes-list">
									{#each (localSettings.alarmHighMins || []) as minutes}
										<span class="minute-chip">
											{minutes}
											<Button variant="ghost" size="sm" onclick={() => removeAlarmMinute('alarmHighMins', minutes)}>×</Button>
										</span>
									{/each}
								</div>
								<Select onchange={(e) => addAlarmMinute('alarmHighMins', parseInt(e.target.value))}>
									<SelectTrigger>
										<SelectValue placeholder="Add snooze option" />
									</SelectTrigger>
									<SelectContent>
										{#each alarmMinutesOptions as option}
											<SelectItem value={option.value}>{option.label}</SelectItem>
										{/each}
									</SelectContent>
								</Select>
							</div>
					{/if}

						<div class="flex items-center space-x-2">
							<Checkbox
								id="alarmLow"
								bind:checked={localSettings.alarmLow}
							/>
							<Label for="alarmLow">Low Alarm</Label>
						</div>					{#if localSettings.alarmLow}
						<div class="alarm-minutes">
							<Label>Snooze options (minutes):</Label>
							<div class="minutes-list">
								{#each (localSettings.alarmLowMins || []) as minutes}
									<span class="minute-chip">
										{minutes}
										<Button variant="ghost" size="sm" onclick={() => removeAlarmMinute('alarmLowMins', minutes)}>×</Button>
									</span>
								{/each}
							</div>
							<Select onValueChange={(value) => addAlarmMinute('alarmLowMins', parseInt(value))}>
								<SelectTrigger>
									<SelectValue placeholder="Add snooze option" />
								</SelectTrigger>
								<SelectContent>
									{#each alarmMinutesOptions as option}
										<SelectItem value={option.value.toString()}>{option.label}</SelectItem>
									{/each}
								</SelectContent>
							</Select>
						</div>					{/if}

						<div class="flex items-center space-x-2">
							<Checkbox
								id="alarmUrgentLow"
								bind:checked={localSettings.alarmUrgentLow}
							/>
							<Label for="alarmUrgentLow">Urgent Low Alarm</Label>
						</div>

					{#if localSettings.alarmUrgentLow}
						<div class="alarm-minutes">
							<Label>Snooze options (minutes):</Label>
							<div class="minutes-list">
								{#each (localSettings.alarmUrgentLowMins || []) as minutes}
									<span class="minute-chip">
										{minutes}
										<Button variant="ghost" size="sm" onclick={() => removeAlarmMinute('alarmUrgentLowMins', minutes)}>×</Button>
									</span>
								{/each}
							</div>
							<Select onValueChange={(value) => addAlarmMinute('alarmUrgentLowMins', parseInt(value))}>
								<SelectTrigger>
									<SelectValue placeholder="Add snooze option" />
								</SelectTrigger>
								<SelectContent>
									{#each alarmMinutesOptions as option}
										<SelectItem value={option.value.toString()}>{option.label}</SelectItem>
									{/each}
								</SelectContent>
							</Select>
						</div>
					{/if}
				</Card>

				<Card class="settings-section">
					<CardHeader>
						<CardTitle>Data Staleness Alarms</CardTitle>
					</CardHeader>
					<CardContent class="space-y-4">
						<div class="flex items-center space-x-2">
							<Checkbox
								id="alarmTimeagoWarn"
								bind:checked={localSettings.alarmTimeagoWarn}
							/>
							<Label for="alarmTimeagoWarn">Data Warning Alarm</Label>
						</div>

						{#if localSettings.alarmTimeagoWarn}
							<div class="input-row">
								<Label for="warnAfter">Warning after:</Label>
								<Input
									id="warnAfter"
									type="number"
									bind:value={localSettings.alarmTimeagoWarnMins}
									min="1"
									max="60"
								/>
								<span class="units">minutes</span>
							</div>
						{/if}

						<div class="flex items-center space-x-2">
							<Checkbox
								id="alarmTimeagoUrgent"
								bind:checked={localSettings.alarmTimeagoUrgent}
							/>
							<Label for="alarmTimeagoUrgent">Data Urgent Alarm</Label>
						</div>

						{#if localSettings.alarmTimeagoUrgent}
							<div class="input-row">
								<Label for="urgentAfter">Urgent after:</Label>
								<Input
									id="urgentAfter"
									type="number"
									bind:value={localSettings.alarmTimeagoUrgentMins}
									min="1"
									max="120"
								/>
								<span class="units">minutes</span>
							</div>
						{/if}
					</CardContent>				</Card>
			{/if}

			<!-- Display Tab -->
			{#if activeTab === 'display'}
				<Card class="settings-section">
					<CardHeader>
						<CardTitle>Theme & Appearance</CardTitle>
					</CardHeader>
					<CardContent class="space-y-4">
						<div class="input-row">
							<Label for="theme">Theme:</Label>
							<Select bind:value={localSettings.theme}>
								<SelectTrigger>
									<SelectValue placeholder="Select theme" />
								</SelectTrigger>
								<SelectContent>
									{#each themeOptions as option}
										<SelectItem value={option.value}>{option.label}</SelectItem>
									{/each}
								</SelectContent>
							</Select>
						</div>

						<div class="flex items-center space-x-2">
							<Checkbox
								id="nightMode"
								bind:checked={localSettings.nightMode}
							/>
							<Label for="nightMode">Night Mode</Label>
						</div>

						<div class="flex items-center space-x-2">
							<Checkbox
								id="showForecast"
								bind:checked={localSettings.showForecast}
							/>
							<Label for="showForecast">Show Forecast</Label>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Display Elements</CardTitle>
					</CardHeader>
					<CardContent class="space-y-4">
						<div class="flex items-center space-x-2">
							<Checkbox
								id="showBGON"
								bind:checked={localSettings.showBGON}
							/>
							<Label for="showBGON">Show BG on Nightscout Icon</Label>
						</div>

						<div class="flex items-center space-x-2">
							<Checkbox
								id="showIOB"
								bind:checked={localSettings.showIOB}
							/>
							<Label for="showIOB">Show IOB (Insulin on Board)</Label>
						</div>

						<div class="flex items-center space-x-2">
							<Checkbox
								id="showCOB"
								bind:checked={localSettings.showCOB}
							/>
							<Label for="showCOB">Show COB (Carbs on Board)</Label>
						</div>

						<div class="flex items-center space-x-2">
							<Checkbox
								id="showBasal"
								bind:checked={localSettings.showBasal}
							/>
							<Label for="showBasal">Show Basal Rate</Label>
						</div>
					</CardContent>				</Card>
			{/if}

			<!-- Plugins Tab -->
			{#if activeTab === 'plugins'}
				<Card>
					<CardHeader>
						<CardTitle>Enable Plugins</CardTitle>
					</CardHeader>
					<CardContent>
						<p class="text-sm text-muted-foreground mb-4">
							Select which plugins to display in your Nightscout interface.
						</p>

						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							{#each pluginOptions as plugin}
								<div class="flex items-center space-x-2 p-3 border rounded-lg bg-muted/50">
									<Checkbox
										id="plugin-{plugin.value}"
										checked={isPluginEnabled(plugin.value)}
										onCheckedChange={() => togglePlugin(plugin.value)}
									/>
									<Label for="plugin-{plugin.value}" class="text-sm font-medium">
										{plugin.label}
									</Label>
								</div>
							{/each}
						</div>
					</CardContent>
				</Card>
			{/if}
		</div>
		<!-- Action Buttons -->
		<div class="drawer-footer">
			<Button variant="destructive" onclick={resetToDefaults}>
				Reset to Defaults
			</Button>
			<div class="action-buttons">
				<Button variant="outline" onclick={() => isOpen = false}>
					Cancel
				</Button>
				<Button onclick={saveSettings}>
					Save Settings
				</Button>
			</div>
		</div>
	</div>
{/if}

<style>
	.settings-drawer {
		position: fixed;
		top: 0;
		right: 0;
		width: 500px;
		height: 100vh;
		background: white;
		box-shadow: -4px 0 16px rgba(0,0,0,0.1);
		z-index: 1000;
		display: flex;
		flex-direction: column;
	}

	.drawer-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 16px 20px;
		border-bottom: 1px solid #e0e0e0;
		background: #f5f5f5;
	}

	.drawer-header h3 {
		margin: 0;
		color: #333;
	}

	.tab-nav {
		display: flex;
		border-bottom: 1px solid #e0e0e0;
		background: #fafafa;
	}

	.drawer-content {
		flex: 1;
		overflow-y: auto;
		padding: 20px;
	}

	.alarm-minutes {
		margin: 8px 0 16px 24px;
	}

	.alarm-minutes label {
		font-size: 13px;
		color: #666;
		margin-bottom: 6px;
		display: block;
	}

	.minutes-list {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-bottom: 8px;
	}

	.minute-chip {
		background: #e3f2fd;
		color: #1976d2;
		padding: 4px 8px;
		border-radius: 12px;
		font-size: 12px;
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.drawer-footer {
		padding: 20px;
		border-top: 1px solid #e0e0e0;
		background: #fafafa;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.action-buttons {
		display: flex;
		gap: 12px;
	}

	@media (max-width: 768px) {
		.settings-drawer {
			width: 100vw;
			left: 0;
		}
	}
</style>
