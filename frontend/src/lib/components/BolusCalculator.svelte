<!--
  Bolus Calculator Component - Converted from boluscalc.js
  Handles insulin dose calculations based on BG, carbs, IOB, COB, and profile settings
-->
<script lang="ts">
	import { slide } from 'svelte/transition';
	import { getClientState } from '$lib/stores/client-state.svelte.ts';
	import { formatTime } from '$lib/utils/nightscout-utils.ts';

	interface BolusRecord {
		eventTime?: Date;
		profile?: string;
		bg: number;
		carbs: number;
		insulin: number;
		insulinbg: number;
		insulincarbs: number;
		insulincob: number;
		othercorrection: number;
		iob: number;
		cob: number;
		targetBGLow: number;
		targetBGHigh: number;
		isf: number; // Insulin Sensitivity Factor
		ic: number; // Insulin to Carb ratio
		bgdiff: number;
		carbsneeded: number;
		roundingcorrection: number;
		gi: number; // Glycemic Index
		foods: FoodItem[];
	}

	interface FoodItem {
		name: string;
		carbs: number;
		portion: number;
		portions: number;
		unit: string;
	}

	interface ProfileData {
		targetBGLow: number;
		targetBGHigh: number;
		isf: number;
		ic: number;
		basal: number;
	}

	const clientState = getClientState();

	// Component state
	let isOpen = $state(false);
	let eventDate = $state(new Date().toISOString().split('T')[0]);
	let eventTime = $state(`${new Date().getHours()}:${new Date().getMinutes().toString().padStart(2, '0')}`);
	let useNowTime = $state(true);
	let useOtherTime = $state(false);
	
	// Form inputs
	let useBG = $state(true);
	let useCarbs = $state(true);
	let useCOB = $state(false);
	let useIOB = $state(true);
	let bgFromSensor = $state(true);
	let bg = $state('');
	let carbs = $state('');
	let notes = $state('');
	let enteredBy = $state('');
	let preBolus = $state(0);
	let otherCorrection = $state(0);
	let quickPick = $state(-1);
	let selectedProfile = $state('');

	// Calculation results
	let record = $state<BolusRecord>({
		bg: 0,
		carbs: 0,
		insulin: 0,
		insulinbg: 0,
		insulincarbs: 0,
		insulincob: 0,
		othercorrection: 0,
		iob: 0,
		cob: 0,
		targetBGLow: 0,
		targetBGHigh: 0,
		isf: 0,
		ic: 0,
		bgdiff: 0,
		carbsneeded: 0,
		roundingcorrection: 0,
		gi: 0,
		foods: []
	});

	let foods = $state<FoodItem[]>([]);
	let quickPickOptions = $state([
		{ value: -1, label: 'Select food' },
		{ value: 0, label: 'Slice of bread', carbs: 15 },
		{ value: 1, label: 'Apple', carbs: 15 },
		{ value: 2, label: 'Banana', carbs: 20 },
		{ value: 3, label: 'Orange', carbs: 15 },
		{ value: 4, label: 'Pasta (100g)', carbs: 25 },
		{ value: 5, label: 'Rice (100g)', carbs: 23 }
	]);

	// Derived values
	let mergedDateTime = $derived(() => {
		if (useNowTime) {
			return new Date();
		}
		const [hours, minutes] = eventTime.split(':').map(Number);
		const date = new Date(eventDate);
		date.setHours(hours, minutes, 0, 0);
		return date;
	});

	let isRetroMode = $derived(() => {
		return useOtherTime && mergedDateTime() < new Date();
	});

	let isFutureMode = $derived(() => {
		return useOtherTime && mergedDateTime() > new Date();
	});

	let profileData = $derived((): ProfileData => {
		// Mock profile data - in real implementation, this would come from profile settings
		return {
			targetBGLow: 80,
			targetBGHigh: 180,
			isf: 50, // 1 unit drops BG by 50 mg/dl
			ic: 10, // 1 unit covers 10g carbs
			basal: 1.0
		};
	});

	let oldBG = $state(false);

	// Functions
	function roundTo(x: number, step: number): number {
		if (x) {
			return Math.round(x / step) * step;
		}
		return 0;
	}

	function toggleDrawer() {
		isOpen = !isOpen;
		if (isOpen) {
			prepare();
		}
	}

	function prepare() {
		// Reset form to defaults
		foods = [];
		useBG = true;
		useCarbs = true;
		useCOB = false;
		useIOB = true;
		bgFromSensor = true;
		carbs = '';
		quickPick = -1;
		preBolus = 0;
		notes = '';
		enteredBy = localStorage.getItem('enteredBy') || '';
		useNowTime = true;
		useOtherTime = false;
		otherCorrection = 0;
		
		const now = new Date();
		eventDate = now.toISOString().split('T')[0];
		eventTime = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
		
		updateVisualisations();
		calculateInsulin();
	}

	function updateVisualisations() {
		// Update BG from sensor if enabled
		if (bgFromSensor && clientState.latestSGV) {
			const selectedTime = mergedDateTime();
			setBG(clientState.latestSGV, selectedTime);
		}
	}

	function setBG(sgv: any, selectedTime: Date) {
		let sensorbg = 0;
		oldBG = false;
		
		if (sgv) {
			sensorbg = sgv.mgdl || sgv.sgv;
			if (sensorbg < 39) {
				sensorbg = 0;
			} else if (clientState.settings.units === 'mmol') {
				sensorbg = Math.round((sensorbg / 18.01559) * 10) / 10;
			}
			
			if (selectedTime.getTime() - sgv.mills > 10 * 60 * 1000) {
				oldBG = true; // Do not use if record is older than 10 min
				sensorbg = 0;
			}
		}

		// Set BG if using sensor
		if (bgFromSensor) {
			bg = sensorbg ? sensorbg.toString() : '';
		}
	}

	function dateTimeChange() {
		useOtherTime = true;
		useNowTime = false;
		
		// Update BG from closest SGV to this time
		const selectedTime = mergedDateTime();
		const closestSGV = findClosestSGVToPastTime(selectedTime);
		setBG(closestSGV, selectedTime);
		
		calculateInsulin();
	}

	function findClosestSGVToPastTime(time: Date) {
		// Find the closest SGV entry to the specified time
		let closest = null;
		let minDiff = Infinity;
		
		for (const entry of clientState.entries) {
			const diff = Math.abs(entry.mills - time.getTime());
			if (diff < minDiff) {
				minDiff = diff;
				closest = entry;
			}
		}
		
		return closest;
	}

	function eventTimeTypeChange() {
		if (useOtherTime) {
			// Focus time input and show retro/future indicators
		} else {
			useNowTime = true;
			const now = new Date();
			eventDate = now.toISOString().split('T')[0];
			eventTime = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
			updateVisualisations();
			calculateInsulin();
		}
	}

	function calculateInsulin() {
		gatherBoluscalcData();
		updateGui();
		return record;
	}

	function gatherBoluscalcData() {
		record = {
			bg: 0,
			carbs: 0,
			insulin: 0,
			insulinbg: 0,
			insulincarbs: 0,
			insulincob: 0,
			othercorrection: 0,
			iob: 0,
			cob: 0,
			targetBGLow: 0,
			targetBGHigh: 0,
			isf: 0,
			ic: 0,
			bgdiff: 0,
			carbsneeded: 0,
			roundingcorrection: 0,
			gi: 0,
			foods: []
		};

		// Calculate event time
		record.eventTime = useNowTime ? new Date() : mergedDateTime();

		// Load profile data
		record.targetBGLow = profileData.targetBGLow;
		record.targetBGHigh = profileData.targetBGHigh;
		record.isf = profileData.isf;
		record.ic = profileData.ic;

		if (record.targetBGLow === 0 || record.targetBGHigh === 0 || record.isf === 0 || record.ic === 0) {
			// Invalid profile data
			return;
		}

		// Load IOB (Insulin on Board)
		if (useIOB) {
			record.iob = calculateIOB(record.eventTime);
		}

		// Load COB (Carbs on Board) 
		if (useCOB) {
			record.cob = calculateCOB(record.eventTime);
			record.insulincob = roundTo(record.cob / record.ic, 0.01);
		}

		// Load BG
		if (useBG && bg) {
			record.bg = parseFloat(bg.replace(',', '.')) || 0;
			if (record.bg > 0) {
				const target = (record.targetBGLow + record.targetBGHigh) / 2;
				record.bgdiff = record.bg - target;
				record.insulinbg = roundTo(record.bgdiff / record.isf, 0.01);
			}
		}

		// Load Carbs
		if (useCarbs) {
			const carbsTotal = foods.reduce((sum, food) => sum + (food.carbs * food.portions), 0);
			record.carbs = carbsTotal || (parseFloat(carbs.replace(',', '.')) || 0);
			if (record.carbs > 0) {
				record.insulincarbs = roundTo(record.carbs / record.ic, 0.01);
			}
		}

		// Calculate other correction
		record.othercorrection = otherCorrection;

		// Calculate total insulin needed
		record.insulin = record.insulinbg + record.insulincarbs + record.insulincob - record.iob + record.othercorrection;

		// Calculate rounding correction
		const roundedInsulin = roundTo(record.insulin, 0.05);
		record.roundingcorrection = roundedInsulin - record.insulin;
		record.insulin = roundedInsulin;

		// Calculate carbs needed if insulin is negative
		if (record.insulin < 0) {
			record.carbsneeded = Math.abs(record.insulin) * record.ic;
		}
	}

	function calculateIOB(eventTime: Date): number {
		// Mock IOB calculation - in real implementation, this would calculate
		// insulin on board from recent bolus treatments
		return 0;
	}

	function calculateCOB(eventTime: Date): number {
		// Mock COB calculation - in real implementation, this would calculate
		// carbs on board from recent carb treatments
		return 0;
	}

	function updateGui() {
		// This function is called after calculations to update the display
		// In Svelte, this is handled automatically by reactive statements
	}

	function addQuickPick() {
		if (quickPick >= 0 && quickPick < quickPickOptions.length) {
			const option = quickPickOptions[quickPick];
			if (option.carbs) {
				foods = [...foods, {
					name: option.label,
					carbs: option.carbs,
					portion: 1,
					portions: 1,
					unit: 'serving'
				}];
				quickPick = -1;
				calculateInsulin();
			}
		}
	}

	function deleteFoodRecord(index: number) {
		foods = foods.filter((_, i) => i !== index);
		calculateInsulin();
	}

	function submitTreatment() {
		if (record.insulin <= 0 && record.carbs <= 0) {
			alert('Please enter insulin dose or carbs');
			return;
		}

		const treatment = {
			eventType: 'Bolus',
			insulin: record.insulin > 0 ? record.insulin : undefined,
			carbs: record.carbs > 0 ? record.carbs : undefined,
			created_at: record.eventTime?.toISOString(),
			notes: notes || undefined,
			enteredBy: enteredBy || 'BolusCalculator'
		};

		// Store entered by for next time
		if (enteredBy) {
			localStorage.setItem('enteredBy', enteredBy);
		}

		// TODO: Submit treatment to server
		console.log('Submitting treatment:', treatment);
		
		// Close calculator after successful submission
		isOpen = false;
	}

	// Reactive updates
	$effect(() => {
		if (isOpen) {
			updateVisualisations();
		}
	});

	$effect(() => {
		if (useBG || useCarbs || useCOB || useIOB) {
			calculateInsulin();
		}
	});
</script>

<!-- Bolus Calculator Button -->
<button 
	class="bolus-calc-btn {isOpen ? 'active' : ''}"
	onclick={toggleDrawer}
	title="Bolus Calculator"
>
	💉
</button>

<!-- Bolus Calculator Drawer -->
{#if isOpen}
	<div class="bolus-calc-drawer" transition:slide={{duration: 300}}>
		<div class="drawer-header">
			<h3>Bolus Calculator</h3>
			<button class="close-btn" onclick={() => isOpen = false}>×</button>
		</div>

		<div class="drawer-content">
			<!-- Time Selection -->
			<div class="time-section">
				<div class="time-controls">
					<label>
						<input type="radio" bind:group={useNowTime} value={true} onchange={eventTimeTypeChange} />
						Use current time
					</label>
					<label>
						<input type="radio" bind:group={useOtherTime} value={true} onchange={eventTimeTypeChange} />
						Specify time
					</label>
				</div>

				{#if useOtherTime}
					<div class="time-inputs">
						<input 
							type="date" 
							bind:value={eventDate}
							onchange={dateTimeChange}
						/>
						<input 
							type="time" 
							bind:value={eventTime}
							onchange={dateTimeChange}
						/>
						{#if isRetroMode}
							<div class="retro-indicator retro">RETRO MODE</div>
						{:else if isFutureMode}
							<div class="retro-indicator future">IN THE FUTURE</div>
						{/if}
					</div>
				{/if}
			</div>

			<!-- Input Checkboxes -->
			<div class="input-toggles">
				<label>
					<input type="checkbox" bind:checked={useBG} onchange={calculateInsulin} />
					Use BG
				</label>
				<label>
					<input type="checkbox" bind:checked={useCarbs} onchange={calculateInsulin} />
					Use Carbs
				</label>
				<label>
					<input type="checkbox" bind:checked={useIOB} onchange={calculateInsulin} />
					Use IOB
				</label>
				<label>
					<input type="checkbox" bind:checked={useCOB} onchange={calculateInsulin} />
					Use COB
				</label>
			</div>

			<!-- BG Input -->
			{#if useBG}
				<div class="input-row">
					<label>Blood Glucose:</label>
					<div class="bg-inputs">
						<input 
							type="number" 
							bind:value={bg}
							class="bg-input {oldBG && bgFromSensor ? 'old-bg' : ''}"
							placeholder="Enter BG"
							oninput={calculateInsulin}
						/>
						<label class="checkbox-small">
							<input type="checkbox" bind:checked={bgFromSensor} onchange={updateVisualisations} />
							From sensor
						</label>
					</div>
					<span class="units">{clientState.settings.units}</span>
				</div>
			{/if}

			<!-- Carbs Input -->
			{#if useCarbs}
				<div class="input-row">
					<label>Carbohydrates:</label>
					<input 
						type="number" 
						bind:value={carbs}
						class="carbs-input"
						placeholder="Enter carbs"
						disabled={foods.length > 0}
						oninput={calculateInsulin}
					/>
					<span class="units">g</span>
				</div>

				<!-- Quick Pick Food -->
				<div class="input-row">
					<label>Quick pick:</label>
					<select bind:value={quickPick} onchange={addQuickPick}>
						{#each quickPickOptions as option}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
				</div>

				<!-- Food Items -->
				{#if foods.length > 0}
					<div class="food-list">
						<h4>Selected Foods:</h4>
						{#each foods as food, index}
							<div class="food-item">
								<button class="delete-food" onclick={() => deleteFoodRecord(index)}>×</button>
								<span class="food-name">{food.name}</span>
								<span class="food-details">
									{(food.portion * food.portions).toFixed(1)} {food.unit}
									({(food.carbs * food.portions).toFixed(1)} g)
								</span>
							</div>
						{/each}
					</div>
				{/if}
			{/if}

			<!-- Other Correction -->
			<div class="input-row">
				<label>Other correction:</label>
				<input 
					type="number" 
					step="0.1"
					bind:value={otherCorrection}
					oninput={calculateInsulin}
				/>
				<span class="units">U</span>
			</div>

			<!-- Results Display -->
			<div class="results">
				<h4>Calculation Results</h4>
				
				<div class="result-grid">
					{#if useBG && record.bg > 0}
						<div class="result-item">
							<label>BG correction:</label>
							<span class="value">{record.insulinbg.toFixed(2)} U</span>
							<span class="detail">
								Target: {record.targetBGLow}-{record.targetBGHigh} {clientState.settings.units}
								ISF: {record.isf}
							</span>
						</div>
					{/if}

					{#if useCarbs && record.carbs > 0}
						<div class="result-item">
							<label>Carb coverage:</label>
							<span class="value">{record.insulincarbs.toFixed(2)} U</span>
							<span class="detail">IC: {record.ic}</span>
						</div>
					{/if}

					{#if useIOB && record.iob !== 0}
						<div class="result-item">
							<label>IOB:</label>
							<span class="value">{record.iob > 0 ? '-' : ''}{Math.abs(record.iob).toFixed(2)} U</span>
						</div>
					{/if}

					{#if useCOB && record.cob > 0}
						<div class="result-item">
							<label>COB:</label>
							<span class="value">{record.cob.toFixed(2)} g</span>
							<span class="detail">({record.insulincob.toFixed(2)} U)</span>
						</div>
					{/if}

					<div class="result-item total">
						<label>Total insulin:</label>
						<span class="value total-value">{record.insulin.toFixed(2)} U</span>
					</div>

					{#if record.insulin < 0}
						<div class="result-item warning">
							<label>Carbs needed:</label>
							<span class="value">{record.carbsneeded.toFixed(0)} g</span>
						</div>
					{/if}
				</div>
			</div>

			<!-- Notes and Submit -->
			<div class="submit-section">
				<div class="input-row">
					<label>Notes:</label>
					<input type="text" bind:value={notes} placeholder="Optional notes" />
				</div>

				<div class="input-row">
					<label>Entered by:</label>
					<input type="text" bind:value={enteredBy} placeholder="Your name" />
				</div>

				<button 
					class="submit-btn"
					onclick={submitTreatment}
					disabled={record.insulin <= 0 && record.carbs <= 0}
				>
					Submit Treatment
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.bolus-calc-btn {
		background: #2196F3;
		color: white;
		border: none;
		border-radius: 8px;
		padding: 12px 16px;
		font-size: 18px;
		cursor: pointer;
		transition: all 0.2s ease;
		box-shadow: 0 2px 4px rgba(0,0,0,0.1);
	}

	.bolus-calc-btn:hover {
		background: #1976D2;
		transform: translateY(-2px);
		box-shadow: 0 4px 8px rgba(0,0,0,0.2);
	}

	.bolus-calc-btn.active {
		background: #1976D2;
	}

	.bolus-calc-drawer {
		position: fixed;
		top: 0;
		right: 0;
		width: 400px;
		height: 100vh;
		background: white;
		box-shadow: -4px 0 16px rgba(0,0,0,0.1);
		z-index: 1000;
		overflow-y: auto;
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

	.drawer-content {
		padding: 20px;
	}

	.time-section {
		margin-bottom: 20px;
		padding-bottom: 20px;
		border-bottom: 1px solid #e0e0e0;
	}

	.time-controls {
		display: flex;
		gap: 16px;
		margin-bottom: 12px;
	}

	.time-controls label {
		display: flex;
		align-items: center;
		gap: 6px;
		cursor: pointer;
	}

	.time-inputs {
		display: flex;
		gap: 8px;
		align-items: center;
	}

	.time-inputs input {
		padding: 8px;
		border: 1px solid #ddd;
		border-radius: 4px;
	}

	.retro-indicator {
		padding: 4px 8px;
		border-radius: 4px;
		font-size: 12px;
		font-weight: bold;
		color: white;
	}

	.retro-indicator.retro {
		background: #f44336;
	}

	.retro-indicator.future {
		background: #2196F3;
	}

	.input-toggles {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		margin-bottom: 20px;
		padding-bottom: 16px;
		border-bottom: 1px solid #e0e0e0;
	}

	.input-toggles label {
		display: flex;
		align-items: center;
		gap: 6px;
		cursor: pointer;
	}

	.input-row {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 12px;
	}

	.input-row label {
		min-width: 120px;
		font-weight: 500;
	}

	.input-row input,
	.input-row select {
		flex: 1;
		padding: 8px;
		border: 1px solid #ddd;
		border-radius: 4px;
	}

	.bg-inputs {
		display: flex;
		align-items: center;
		gap: 8px;
		flex: 1;
	}

	.bg-input {
		flex: 1;
	}

	.bg-input.old-bg {
		background-color: #ffebee;
		border-color: #f44336;
	}

	.checkbox-small {
		font-size: 12px;
		white-space: nowrap;
		min-width: auto !important;
	}

	.units {
		color: #666;
		font-size: 14px;
		min-width: 30px;
	}

	.food-list {
		margin: 16px 0;
		padding: 12px;
		background: #f9f9f9;
		border-radius: 8px;
	}

	.food-list h4 {
		margin: 0 0 12px 0;
		font-size: 14px;
		color: #666;
	}

	.food-item {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px;
		background: white;
		border-radius: 4px;
		margin-bottom: 6px;
	}

	.delete-food {
		background: #f44336;
		color: white;
		border: none;
		border-radius: 50%;
		width: 20px;
		height: 20px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 12px;
	}

	.food-name {
		font-weight: 500;
		flex: 1;
	}

	.food-details {
		font-size: 12px;
		color: #666;
	}

	.results {
		margin: 20px 0;
		padding: 16px;
		background: #f0f8ff;
		border-radius: 8px;
		border: 1px solid #e3f2fd;
	}

	.results h4 {
		margin: 0 0 16px 0;
		color: #1976d2;
	}

	.result-grid {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.result-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 8px 0;
	}

	.result-item.total {
		border-top: 1px solid #ddd;
		padding-top: 12px;
		font-weight: bold;
	}

	.result-item.warning {
		color: #f44336;
		font-weight: 500;
	}

	.result-item label {
		font-size: 14px;
		min-width: auto;
	}

	.value {
		font-weight: 500;
		color: #1976d2;
	}

	.total-value {
		font-size: 18px;
		font-weight: bold;
	}

	.detail {
		font-size: 12px;
		color: #666;
		margin-left: 8px;
	}

	.submit-section {
		margin-top: 20px;
		padding-top: 20px;
		border-top: 1px solid #e0e0e0;
	}

	.submit-btn {
		width: 100%;
		background: #4CAF50;
		color: white;
		border: none;
		padding: 12px;
		border-radius: 6px;
		font-size: 16px;
		font-weight: 500;
		cursor: pointer;
		margin-top: 16px;
		transition: background-color 0.2s ease;
	}

	.submit-btn:hover:not(:disabled) {
		background: #45a049;
	}

	.submit-btn:disabled {
		background: #ccc;
		cursor: not-allowed;
	}

	@media (max-width: 768px) {
		.bolus-calc-drawer {
			width: 100vw;
			left: 0;
		}
	}
</style>
