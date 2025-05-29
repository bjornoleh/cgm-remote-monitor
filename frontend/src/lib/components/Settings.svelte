<!--
  Settings Component - Handles user preferences and Nightscout configuration
-->
<script lang="ts">
	import { slide } from 'svelte/transition';
	import { getClientState, updateClientState, type ClientSettings } from '$lib/stores/client-state.svelte.ts';

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
<button 
	class="settings-btn {isOpen ? 'active' : ''}"
	onclick={toggleDrawer}
	title="Settings"
>
	⚙️
</button>

<!-- Settings Drawer -->
{#if isOpen}
	<div class="settings-drawer" transition:slide={{duration: 300}}>
		<div class="drawer-header">
			<h3>Settings</h3>
			<button class="close-btn" onclick={() => isOpen = false}>×</button>
		</div>

		<!-- Tab Navigation -->
		<div class="tab-nav">
			<button 
				class="tab-btn {activeTab === 'general' ? 'active' : ''}"
				onclick={() => switchTab('general')}
			>
				General
			</button>
			<button 
				class="tab-btn {activeTab === 'alarms' ? 'active' : ''}"
				onclick={() => switchTab('alarms')}
			>
				Alarms
			</button>
			<button 
				class="tab-btn {activeTab === 'display' ? 'active' : ''}"
				onclick={() => switchTab('display')}
			>
				Display
			</button>
			<button 
				class="tab-btn {activeTab === 'plugins' ? 'active' : ''}"
				onclick={() => switchTab('plugins')}
			>
				Plugins
			</button>
		</div>

		<div class="drawer-content">
			<!-- General Tab -->
			{#if activeTab === 'general'}
				<div class="settings-section">
					<h4>Units & Format</h4>
					
					<div class="input-row">
						<label>Blood Glucose Units:</label>
						<select bind:value={localSettings.units}>
							{#each unitOptions as option}
								<option value={option.value}>{option.label}</option>
							{/each}
						</select>
					</div>

					<div class="input-row">
						<label>Time Format:</label>
						<select bind:value={localSettings.timeFormat}>
							{#each timeFormatOptions as option}
								<option value={option.value}>{option.label}</option>
							{/each}
						</select>
					</div>

					<div class="input-row">
						<label>Language:</label>
						<select bind:value={localSettings.language}>
							{#each languageOptions as option}
								<option value={option.value}>{option.label}</option>
							{/each}
						</select>
					</div>

					<div class="input-row">
						<label>Focus Hours:</label>
						<select bind:value={localSettings.focusHours}>
							{#each focusHoursOptions as option}
								<option value={option.value}>{option.label}</option>
							{/each}
						</select>
					</div>
				</div>

				<div class="settings-section">
					<h4>BG Thresholds</h4>
					
					<div class="input-row">
						<label>Urgent High:</label>
						<input 
							type="number" 
							bind:value={localSettings.thresholds.bgHigh}
							step={localSettings.units === 'mmol' ? '0.1' : '1'}
						/>
						<span class="units">{localSettings.units}</span>
					</div>

					<div class="input-row">
						<label>Target High:</label>
						<input 
							type="number" 
							bind:value={localSettings.thresholds.bgTargetTop}
							step={localSettings.units === 'mmol' ? '0.1' : '1'}
						/>
						<span class="units">{localSettings.units}</span>
					</div>

					<div class="input-row">
						<label>Target Low:</label>
						<input 
							type="number" 
							bind:value={localSettings.thresholds.bgTargetBottom}
							step={localSettings.units === 'mmol' ? '0.1' : '1'}
						/>
						<span class="units">{localSettings.units}</span>
					</div>

					<div class="input-row">
						<label>Urgent Low:</label>
						<input 
							type="number" 
							bind:value={localSettings.thresholds.bgLow}
							step={localSettings.units === 'mmol' ? '0.1' : '1'}
						/>
						<span class="units">{localSettings.units}</span>
					</div>
				</div>
			{/if}

			<!-- Alarms Tab -->
			{#if activeTab === 'alarms'}
				<div class="settings-section">
					<h4>BG Alarms</h4>
					
					<div class="checkbox-row">
						<label>
							<input type="checkbox" bind:checked={localSettings.alarmUrgentHigh} />
							Urgent High Alarm
						</label>
					</div>

					{#if localSettings.alarmUrgentHigh}
						<div class="alarm-minutes">
							<label>Snooze options (minutes):</label>
							<div class="minutes-list">
								{#each (localSettings.alarmUrgentHighMins || []) as minutes}
									<span class="minute-chip">
										{minutes}
										<button onclick={() => removeAlarmMinute('alarmUrgentHighMins', minutes)}>×</button>
									</span>
								{/each}
							</div>
							<select onchange={(e) => addAlarmMinute('alarmUrgentHighMins', parseInt(e.target.value))}>
								<option value="">Add snooze option</option>
								{#each alarmMinutesOptions as option}
									<option value={option.value}>{option.label}</option>
								{/each}
							</select>
						</div>
					{/if}

					<div class="checkbox-row">
						<label>
							<input type="checkbox" bind:checked={localSettings.alarmHigh} />
							High Alarm
						</label>
					</div>

					{#if localSettings.alarmHigh}
						<div class="alarm-minutes">
							<label>Snooze options (minutes):</label>
							<div class="minutes-list">
								{#each (localSettings.alarmHighMins || []) as minutes}
									<span class="minute-chip">
										{minutes}
										<button onclick={() => removeAlarmMinute('alarmHighMins', minutes)}>×</button>
									</span>
								{/each}
							</div>
							<select onchange={(e) => addAlarmMinute('alarmHighMins', parseInt(e.target.value))}>
								<option value="">Add snooze option</option>
								{#each alarmMinutesOptions as option}
									<option value={option.value}>{option.label}</option>
								{/each}
							</select>
						</div>
					{/if}

					<div class="checkbox-row">
						<label>
							<input type="checkbox" bind:checked={localSettings.alarmLow} />
							Low Alarm
						</label>
					</div>

					{#if localSettings.alarmLow}
						<div class="alarm-minutes">
							<label>Snooze options (minutes):</label>
							<div class="minutes-list">
								{#each (localSettings.alarmLowMins || []) as minutes}
									<span class="minute-chip">
										{minutes}
										<button onclick={() => removeAlarmMinute('alarmLowMins', minutes)}>×</button>
									</span>
								{/each}
							</div>
							<select onchange={(e) => addAlarmMinute('alarmLowMins', parseInt(e.target.value))}>
								<option value="">Add snooze option</option>
								{#each alarmMinutesOptions as option}
									<option value={option.value}>{option.label}</option>
								{/each}
							</select>
						</div>
					{/if}

					<div class="checkbox-row">
						<label>
							<input type="checkbox" bind:checked={localSettings.alarmUrgentLow} />
							Urgent Low Alarm
						</label>
					</div>

					{#if localSettings.alarmUrgentLow}
						<div class="alarm-minutes">
							<label>Snooze options (minutes):</label>
							<div class="minutes-list">
								{#each (localSettings.alarmUrgentLowMins || []) as minutes}
									<span class="minute-chip">
										{minutes}
										<button onclick={() => removeAlarmMinute('alarmUrgentLowMins', minutes)}>×</button>
									</span>
								{/each}
							</div>
							<select onchange={(e) => addAlarmMinute('alarmUrgentLowMins', parseInt(e.target.value))}>
								<option value="">Add snooze option</option>
								{#each alarmMinutesOptions as option}
									<option value={option.value}>{option.label}</option>
								{/each}
							</select>
						</div>
					{/if}
				</div>

				<div class="settings-section">
					<h4>Data Staleness Alarms</h4>
					
					<div class="checkbox-row">
						<label>
							<input type="checkbox" bind:checked={localSettings.alarmTimeagoWarn} />
							Data Warning Alarm
						</label>
					</div>

					{#if localSettings.alarmTimeagoWarn}
						<div class="input-row">
							<label>Warning after:</label>
							<input 
								type="number" 
								bind:value={localSettings.alarmTimeagoWarnMins}
								min="1"
								max="60"
							/>
							<span class="units">minutes</span>
						</div>
					{/if}

					<div class="checkbox-row">
						<label>
							<input type="checkbox" bind:checked={localSettings.alarmTimeagoUrgent} />
							Data Urgent Alarm
						</label>
					</div>

					{#if localSettings.alarmTimeagoUrgent}
						<div class="input-row">
							<label>Urgent after:</label>
							<input 
								type="number" 
								bind:value={localSettings.alarmTimeagoUrgentMins}
								min="1"
								max="120"
							/>
							<span class="units">minutes</span>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Display Tab -->
			{#if activeTab === 'display'}
				<div class="settings-section">
					<h4>Theme & Appearance</h4>
					
					<div class="input-row">
						<label>Theme:</label>
						<select bind:value={localSettings.theme}>
							{#each themeOptions as option}
								<option value={option.value}>{option.label}</option>
							{/each}
						</select>
					</div>

					<div class="checkbox-row">
						<label>
							<input type="checkbox" bind:checked={localSettings.nightMode} />
							Night Mode
						</label>
					</div>

					<div class="checkbox-row">
						<label>
							<input type="checkbox" bind:checked={localSettings.showForecast} />
							Show Forecast
						</label>
					</div>
				</div>

				<div class="settings-section">
					<h4>Display Elements</h4>
					
					<div class="checkbox-row">
						<label>
							<input type="checkbox" bind:checked={localSettings.showBGON} />
							Show BG on Nightscout Icon
						</label>
					</div>

					<div class="checkbox-row">
						<label>
							<input type="checkbox" bind:checked={localSettings.showIOB} />
							Show IOB (Insulin on Board)
						</label>
					</div>

					<div class="checkbox-row">
						<label>
							<input type="checkbox" bind:checked={localSettings.showCOB} />
							Show COB (Carbs on Board)
						</label>
					</div>

					<div class="checkbox-row">
						<label>
							<input type="checkbox" bind:checked={localSettings.showBasal} />
							Show Basal Rate
						</label>
					</div>
				</div>
			{/if}

			<!-- Plugins Tab -->
			{#if activeTab === 'plugins'}
				<div class="settings-section">
					<h4>Enable Plugins</h4>
					<p class="section-description">
						Select which plugins to display in your Nightscout interface.
					</p>
					
					<div class="plugins-grid">
						{#each pluginOptions as plugin}
							<div class="plugin-item">
								<label>
									<input 
										type="checkbox" 
										checked={isPluginEnabled(plugin.value)}
										onchange={() => togglePlugin(plugin.value)}
									/>
									{plugin.label}
								</label>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>

		<!-- Action Buttons -->
		<div class="drawer-footer">
			<button class="reset-btn" onclick={resetToDefaults}>
				Reset to Defaults
			</button>
			<div class="action-buttons">
				<button class="cancel-btn" onclick={() => isOpen = false}>
					Cancel
				</button>
				<button class="save-btn" onclick={saveSettings}>
					Save Settings
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.settings-btn {
		background: #757575;
		color: white;
		border: none;
		border-radius: 8px;
		padding: 12px 16px;
		font-size: 18px;
		cursor: pointer;
		transition: all 0.2s ease;
		box-shadow: 0 2px 4px rgba(0,0,0,0.1);
	}

	.settings-btn:hover {
		background: #616161;
		transform: translateY(-2px);
		box-shadow: 0 4px 8px rgba(0,0,0,0.2);
	}

	.settings-btn.active {
		background: #616161;
	}

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

	.close-btn {
		background: none;
		border: none;
		font-size: 24px;
		cursor: pointer;
		color: #666;
		padding: 0;
		width: 30px;
		height: 30px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.tab-nav {
		display: flex;
		border-bottom: 1px solid #e0e0e0;
		background: #fafafa;
	}

	.tab-btn {
		flex: 1;
		background: none;
		border: none;
		padding: 12px 16px;
		cursor: pointer;
		color: #666;
		font-weight: 500;
		transition: all 0.2s ease;
		border-bottom: 2px solid transparent;
	}

	.tab-btn:hover {
		background: #f0f0f0;
		color: #333;
	}

	.tab-btn.active {
		color: #2196F3;
		border-bottom-color: #2196F3;
		background: white;
	}

	.drawer-content {
		flex: 1;
		overflow-y: auto;
		padding: 20px;
	}

	.settings-section {
		margin-bottom: 30px;
	}

	.settings-section h4 {
		margin: 0 0 16px 0;
		color: #333;
		font-size: 16px;
		font-weight: 600;
		border-bottom: 1px solid #e0e0e0;
		padding-bottom: 8px;
	}

	.section-description {
		margin: 0 0 16px 0;
		color: #666;
		font-size: 14px;
		line-height: 1.4;
	}

	.input-row {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 12px;
	}

	.input-row label {
		min-width: 140px;
		font-weight: 500;
		color: #333;
		font-size: 14px;
	}

	.input-row input,
	.input-row select {
		flex: 1;
		padding: 8px 12px;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 14px;
	}

	.input-row input:focus,
	.input-row select:focus {
		outline: none;
		border-color: #2196F3;
		box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.2);
	}

	.units {
		color: #666;
		font-size: 14px;
		min-width: 50px;
	}

	.checkbox-row {
		margin-bottom: 12px;
	}

	.checkbox-row label {
		display: flex;
		align-items: center;
		gap: 8px;
		cursor: pointer;
		font-weight: 500;
		color: #333;
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

	.minute-chip button {
		background: none;
		border: none;
		color: #1976d2;
		cursor: pointer;
		padding: 0;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.minute-chip button:hover {
		background: rgba(25, 118, 210, 0.1);
	}

	.plugins-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 12px;
	}

	.plugin-item {
		padding: 8px;
		border: 1px solid #e0e0e0;
		border-radius: 6px;
		background: #fafafa;
	}

	.plugin-item label {
		display: flex;
		align-items: center;
		gap: 8px;
		cursor: pointer;
		font-size: 14px;
		color: #333;
	}

	.drawer-footer {
		padding: 20px;
		border-top: 1px solid #e0e0e0;
		background: #fafafa;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.reset-btn {
		background: #f44336;
		color: white;
		border: none;
		padding: 10px 16px;
		border-radius: 4px;
		cursor: pointer;
		font-size: 14px;
		transition: background-color 0.2s ease;
	}

	.reset-btn:hover {
		background: #d32f2f;
	}

	.action-buttons {
		display: flex;
		gap: 12px;
	}

	.cancel-btn {
		background: #757575;
		color: white;
		border: none;
		padding: 10px 20px;
		border-radius: 4px;
		cursor: pointer;
		font-size: 14px;
		transition: background-color 0.2s ease;
	}

	.cancel-btn:hover {
		background: #616161;
	}

	.save-btn {
		background: #4CAF50;
		color: white;
		border: none;
		padding: 10px 20px;
		border-radius: 4px;
		cursor: pointer;
		font-size: 14px;
		font-weight: 500;
		transition: background-color 0.2s ease;
	}

	.save-btn:hover {
		background: #45a049;
	}

	@media (max-width: 768px) {
		.settings-drawer {
			width: 100vw;
			left: 0;
		}

		.plugins-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
