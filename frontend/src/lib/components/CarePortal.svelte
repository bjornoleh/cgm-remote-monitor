<!--
  Care Portal Component - Converted from careportal.js
  Handles treatment entry forms with various event types
-->
<script lang="ts">
  import { slide } from "svelte/transition";
  import { getClientState } from "$lib/stores/client-state.svelte.ts";

  interface EventType {
    val: string;
    name: string;
    bg?: boolean;
    insulin?: boolean;
    carbs?: boolean;
    protein?: boolean;
    fat?: boolean;
    prebolus?: boolean;
    duration?: boolean;
    percent?: boolean;
    absolute?: boolean;
    profile?: boolean;
    sensor?: boolean;
    reasons?: Reason[];
    targets?: boolean;
  }

  interface Reason {
    name: string;
    targetTop?: number;
    targetBottom?: number;
    duration?: number;
  }

  const clientState = getClientState();

  // Component state
  let isOpen = $state(false);
  let eventDate = $state(new Date().toISOString().split("T")[0]);
  let eventTime = $state(
    `${new Date().getHours()}:${new Date().getMinutes().toString().padStart(2, "0")}`
  );

  // Form inputs
  let selectedEventType = $state("");
  let bg = $state("");
  let insulin = $state("");
  let carbs = $state("");
  let protein = $state("");
  let fat = $state("");
  let notes = $state("");
  let enteredBy = $state("");
  let duration = $state("");
  let percent = $state("");
  let absolute = $state("");
  let preBolus = $state("");
  let glucoseType = $state("");
  let selectedReason = $state("");
  let targetTop = $state("");
  let targetBottom = $state("");

  // Event types configuration
  const eventTypes: EventType[] = [
    { val: "BG Check", name: "BG Check", bg: true, glucoseType: true },
    {
      val: "Snack Bolus",
      name: "Snack Bolus",
      insulin: true,
      carbs: true,
      protein: true,
      fat: true,
      prebolus: true,
    },
    {
      val: "Meal Bolus",
      name: "Meal Bolus",
      insulin: true,
      carbs: true,
      protein: true,
      fat: true,
      prebolus: true,
    },
    {
      val: "Correction Bolus",
      name: "Correction Bolus",
      insulin: true,
      bg: true,
      glucoseType: true,
    },
    {
      val: "Carb Correction",
      name: "Carb Correction",
      carbs: true,
      bg: true,
      glucoseType: true,
    },
    {
      val: "Combo Bolus",
      name: "Combo Bolus",
      insulin: true,
      carbs: true,
      protein: true,
      fat: true,
      duration: true,
    },
    { val: "Announcement", name: "Announcement", notes: true },
    { val: "Note", name: "Note", notes: true },
    { val: "Question", name: "Question", notes: true },
    { val: "Exercise", name: "Exercise", duration: true, notes: true },
    { val: "Site Change", name: "Pump Site Change" },
    { val: "Sensor Start", name: "CGM Sensor Start" },
    { val: "Sensor Stop", name: "CGM Sensor Stop" },
    { val: "Pump Battery Change", name: "Pump Battery Change" },
    { val: "Insulin Change", name: "Insulin Cartridge Change" },
    {
      val: "Temp Basal",
      name: "Temp Basal",
      duration: true,
      percent: true,
      absolute: true,
    },
    {
      val: "Profile Switch",
      name: "Profile Switch",
      profile: true,
      duration: true,
    },
    {
      val: "D.A.D. Alert",
      name: "D.A.D. Alert",
      reasons: [
        { name: "Meal", targetTop: 180, targetBottom: 80, duration: 120 },
        { name: "Correction", targetTop: 120, targetBottom: 80, duration: 90 },
        { name: "Exercise", targetTop: 140, targetBottom: 80, duration: 60 },
        { name: "Sleep", targetTop: 120, targetBottom: 80, duration: 480 },
      ],
    },
    {
      val: "Temporary Target",
      name: "Temporary Target",
      targets: true,
      duration: true,
      reasons: [
        { name: "Eating Soon", targetTop: 80, targetBottom: 80, duration: 45 },
        { name: "Exercise", targetTop: 140, targetBottom: 140, duration: 120 },
        { name: "High", targetTop: 100, targetBottom: 100, duration: 60 },
        { name: "Low", targetTop: 120, targetBottom: 120, duration: 30 },
      ],
    },
    { val: "OpenAPS Offline", name: "OpenAPS Offline", duration: true },
    { val: "Pump Battery Low", name: "Pump Battery Low" },
    { val: "Pump Reservoir Low", name: "Pump Reservoir Low" },
    { val: "Pump No Delivery", name: "Pump No Delivery" },
    { val: "Pump Occlusion", name: "Pump Occlusion" },
  ];

  // Derived values
  let selectedEvent = $derived.by(() => {
    return eventTypes.find((et) => et.val === selectedEventType);
  });

  let mergedDateTime = $derived.by(() => {
    const [hours, minutes] = eventTime.split(":").map(Number);
    const date = new Date(eventDate);
    date.setHours(hours, minutes, 0, 0);
    return date;
  });

  let isValid = $derived.by(() => {
    if (!selectedEventType) return false;

    const event = selectedEvent;
    if (!event) return false;

    // Check required fields based on event type
    if (event.bg && !bg) return false;
    if (event.insulin && !insulin) return false;
    if (event.carbs && !carbs) return false;
    if (event.duration && !duration) return false;

    return true;
  });

  // Functions
  function toggleDrawer() {
    isOpen = !isOpen;
    if (isOpen) {
      prepare();
    }
  }

  function prepare() {
    // Reset form to defaults
    selectedEventType = "";
    bg = "";
    insulin = "";
    carbs = "";
    protein = "";
    fat = "";
    notes = "";
    enteredBy = localStorage.getItem("enteredBy") || "";
    duration = "";
    percent = "";
    absolute = "";
    preBolus = "";
    glucoseType = "";
    selectedReason = "";
    targetTop = "";
    targetBottom = "";

    const now = new Date();
    eventDate = now.toISOString().split("T")[0];
    eventTime = `${now.getHours()}:${now.getMinutes().toString().padStart(2, "0")}`;
  }

  function onEventTypeChange() {
    // Reset form fields when event type changes
    bg = "";
    insulin = "";
    carbs = "";
    protein = "";
    fat = "";
    duration = "";
    percent = "";
    absolute = "";
    preBolus = "";
    selectedReason = "";
    targetTop = "";
    targetBottom = "";

    // Auto-fill BG from sensor if available for BG check events
    if (selectedEvent?.bg && clientState.latestSGV) {
      const sgv = clientState.latestSGV;
      let bgValue = sgv.mgdl || sgv.sgv;

      if (clientState.settings.units === "mmol") {
        bgValue = Math.round((bgValue / 18.01559) * 10) / 10;
      }

      bg = bgValue.toString();
      glucoseType = "Sensor";
    }
  }

  function onReasonChange() {
    if (selectedReason && selectedEvent?.reasons) {
      const reason = selectedEvent.reasons.find(
        (r) => r.name === selectedReason
      );
      if (reason) {
        if (reason.targetTop) targetTop = reason.targetTop.toString();
        if (reason.targetBottom) targetBottom = reason.targetBottom.toString();
        if (reason.duration) duration = reason.duration.toString();
      }
    }
  }

  function submitTreatment() {
    if (!isValid) {
      alert("Please fill in all required fields");
      return;
    }

    const treatment: any = {
      eventType: selectedEventType,
      created_at: mergedDateTime().toISOString(),
      enteredBy: enteredBy || "CarePortal",
    };

    // Add fields based on what's filled in
    if (bg) {
      treatment.glucose = parseFloat(bg);
      treatment.glucoseType = glucoseType || "Finger";
      treatment.units = clientState.settings.units;
    }

    if (insulin) treatment.insulin = parseFloat(insulin);
    if (carbs) treatment.carbs = parseFloat(carbs);
    if (protein) treatment.protein = parseFloat(protein);
    if (fat) treatment.fat = parseFloat(fat);
    if (duration) treatment.duration = parseFloat(duration);
    if (percent) treatment.percent = parseFloat(percent);
    if (absolute) treatment.absolute = parseFloat(absolute);
    if (preBolus) treatment.preBolus = parseFloat(preBolus);
    if (notes) treatment.notes = notes;
    if (selectedReason) treatment.reason = selectedReason;
    if (targetTop) treatment.targetTop = parseFloat(targetTop);
    if (targetBottom) treatment.targetBottom = parseFloat(targetBottom);

    // Store entered by for next time
    if (enteredBy) {
      localStorage.setItem("enteredBy", enteredBy);
    }

    // TODO: Submit treatment to server
    console.log("Submitting treatment:", treatment);

    // Close care portal after successful submission
    isOpen = false;
  }

  function quickFillFromCalculator() {
    // If bolus calculator is available, fill from its results
    // This would integrate with the BolusCalculator component
    console.log("Quick fill from calculator - TODO: implement integration");
  }
</script>

<!-- Care Portal Button -->
<button
  class="care-portal-btn {isOpen ? 'active' : ''}"
  onclick={toggleDrawer}
  title="Care Portal"
>
  📝
</button>

<!-- Care Portal Drawer -->
{#if isOpen}
  <div class="care-portal-drawer" transition:slide={{ duration: 300 }}>
    <div class="drawer-header">
      <h3>Care Portal</h3>
      <button class="close-btn" onclick={() => (isOpen = false)}>×</button>
    </div>

    <div class="drawer-content">
      <!-- Date and Time -->
      <div class="input-row">
        <label>Date & Time:</label>
        <div class="datetime-inputs">
          <input type="date" bind:value={eventDate} />
          <input type="time" bind:value={eventTime} />
        </div>
      </div>

      <!-- Event Type Selection -->
      <div class="input-row">
        <label>Event Type:</label>
        <select bind:value={selectedEventType} onchange={onEventTypeChange}>
          <option value="">Select event type</option>
          {#each eventTypes as eventType}
            <option value={eventType.val}>{eventType.name}</option>
          {/each}
        </select>
      </div>

      {#if selectedEvent}
        <!-- Blood Glucose -->
        {#if selectedEvent.bg}
          <div class="input-row">
            <label>Blood Glucose:</label>
            <div class="bg-input-group">
              <input
                type="number"
                bind:value={bg}
                placeholder="Enter BG value"
                step={clientState.settings.units === "mmol" ? "0.1" : "1"}
              />
              <span class="units">{clientState.settings.units}</span>
              {#if selectedEvent.glucoseType}
                <select bind:value={glucoseType}>
                  <option value="Finger">Finger</option>
                  <option value="Sensor">Sensor</option>
                  <option value="Manual">Manual</option>
                </select>
              {/if}
            </div>
          </div>
        {/if}

        <!-- Insulin -->
        {#if selectedEvent.insulin}
          <div class="input-row">
            <label>Insulin:</label>
            <div class="input-with-units">
              <input
                type="number"
                bind:value={insulin}
                placeholder="Enter insulin dose"
                step="0.1"
              />
              <span class="units">U</span>
              <button
                type="button"
                class="quick-fill-btn"
                onclick={quickFillFromCalculator}
              >
                Use Calculator
              </button>
            </div>
          </div>
        {/if}

        <!-- Carbohydrates -->
        {#if selectedEvent.carbs}
          <div class="input-row">
            <label>Carbohydrates:</label>
            <div class="input-with-units">
              <input
                type="number"
                bind:value={carbs}
                placeholder="Enter carb amount"
                step="1"
              />
              <span class="units">g</span>
            </div>
          </div>
        {/if}

        <!-- Protein -->
        {#if selectedEvent.protein}
          <div class="input-row">
            <label>Protein:</label>
            <div class="input-with-units">
              <input
                type="number"
                bind:value={protein}
                placeholder="Enter protein amount"
                step="1"
              />
              <span class="units">g</span>
            </div>
          </div>
        {/if}

        <!-- Fat -->
        {#if selectedEvent.fat}
          <div class="input-row">
            <label>Fat:</label>
            <div class="input-with-units">
              <input
                type="number"
                bind:value={fat}
                placeholder="Enter fat amount"
                step="1"
              />
              <span class="units">g</span>
            </div>
          </div>
        {/if}

        <!-- Pre-bolus -->
        {#if selectedEvent.prebolus}
          <div class="input-row">
            <label>Pre-bolus:</label>
            <div class="input-with-units">
              <input
                type="number"
                bind:value={preBolus}
                placeholder="Pre-bolus time"
                step="1"
              />
              <span class="units">min</span>
            </div>
          </div>
        {/if}

        <!-- Duration -->
        {#if selectedEvent.duration}
          <div class="input-row">
            <label>Duration:</label>
            <div class="input-with-units">
              <input
                type="number"
                bind:value={duration}
                placeholder="Enter duration"
                step="1"
              />
              <span class="units">min</span>
            </div>
          </div>
        {/if}

        <!-- Percent (for temp basal) -->
        {#if selectedEvent.percent}
          <div class="input-row">
            <label>Percent:</label>
            <div class="input-with-units">
              <input
                type="number"
                bind:value={percent}
                placeholder="Percentage"
                step="1"
              />
              <span class="units">%</span>
            </div>
          </div>
        {/if}

        <!-- Absolute (for temp basal) -->
        {#if selectedEvent.absolute}
          <div class="input-row">
            <label>Absolute Rate:</label>
            <div class="input-with-units">
              <input
                type="number"
                bind:value={absolute}
                placeholder="Absolute rate"
                step="0.1"
              />
              <span class="units">U/hr</span>
            </div>
          </div>
        {/if}

        <!-- Reasons -->
        {#if selectedEvent.reasons && selectedEvent.reasons.length > 0}
          <div class="input-row">
            <label>Reason:</label>
            <select bind:value={selectedReason} onchange={onReasonChange}>
              <option value="">Select reason</option>
              {#each selectedEvent.reasons as reason}
                <option value={reason.name}>{reason.name}</option>
              {/each}
            </select>
          </div>
        {/if}

        <!-- Targets (for temporary targets) -->
        {#if selectedEvent.targets}
          <div class="target-inputs">
            <div class="input-row">
              <label>Target Low:</label>
              <div class="input-with-units">
                <input
                  type="number"
                  bind:value={targetBottom}
                  placeholder="Low target"
                  step={clientState.settings.units === "mmol" ? "0.1" : "1"}
                />
                <span class="units">{clientState.settings.units}</span>
              </div>
            </div>
            <div class="input-row">
              <label>Target High:</label>
              <div class="input-with-units">
                <input
                  type="number"
                  bind:value={targetTop}
                  placeholder="High target"
                  step={clientState.settings.units === "mmol" ? "0.1" : "1"}
                />
                <span class="units">{clientState.settings.units}</span>
              </div>
            </div>
          </div>
        {/if}

        <!-- Notes -->
        <div class="input-row">
          <label>Notes:</label>
          <textarea
            bind:value={notes}
            placeholder="Optional notes..."
            rows="3"
          ></textarea>
        </div>

        <!-- Entered By -->
        <div class="input-row">
          <label>Entered by:</label>
          <input type="text" bind:value={enteredBy} placeholder="Your name" />
        </div>

        <!-- Submit Button -->
        <button
          class="submit-btn"
          onclick={submitTreatment}
          disabled={!isValid}
        >
          Submit {selectedEvent.name}
        </button>
      {/if}
    </div>
  </div>
{/if}

<style>
  .care-portal-btn {
    background: #4caf50;
    color: white;
    border: none;
    border-radius: 8px;
    padding: 12px 16px;
    font-size: 18px;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .care-portal-btn:hover {
    background: #45a049;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }

  .care-portal-btn.active {
    background: #45a049;
  }

  .care-portal-drawer {
    position: fixed;
    top: 0;
    right: 0;
    width: 400px;
    height: 100vh;
    background: white;
    box-shadow: -4px 0 16px rgba(0, 0, 0, 0.1);
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

  .input-row {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 16px;
  }

  .input-row label {
    font-weight: 500;
    color: #333;
    font-size: 14px;
  }

  .input-row input,
  .input-row select,
  .input-row textarea {
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 14px;
  }

  .input-row input:focus,
  .input-row select:focus,
  .input-row textarea:focus {
    outline: none;
    border-color: #4caf50;
    box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
  }

  .datetime-inputs {
    display: flex;
    gap: 8px;
  }

  .datetime-inputs input {
    flex: 1;
  }

  .bg-input-group {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .bg-input-group input {
    flex: 1;
  }

  .bg-input-group select {
    min-width: 100px;
  }

  .input-with-units {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .input-with-units input {
    flex: 1;
  }

  .units {
    color: #666;
    font-size: 14px;
    min-width: 30px;
  }

  .quick-fill-btn {
    background: #2196f3;
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    white-space: nowrap;
  }

  .quick-fill-btn:hover {
    background: #1976d2;
  }

  .target-inputs {
    background: #f9f9f9;
    padding: 12px;
    border-radius: 6px;
    margin-bottom: 16px;
  }

  .submit-btn {
    width: 100%;
    background: #4caf50;
    color: white;
    border: none;
    padding: 14px;
    border-radius: 6px;
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;
    margin-top: 20px;
    transition: background-color 0.2s ease;
  }

  .submit-btn:hover:not(:disabled) {
    background: #45a049;
  }

  .submit-btn:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  textarea {
    resize: vertical;
    min-height: 60px;
  }

  @media (max-width: 768px) {
    .care-portal-drawer {
      width: 100vw;
      left: 0;
    }
  }
</style>
