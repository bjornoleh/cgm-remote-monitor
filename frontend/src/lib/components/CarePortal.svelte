<!--
  Care Portal Component - Converted from careportal.js
  Handles treatment entry forms with various event types
-->
<script lang="ts">
  import { slide } from "svelte/transition";
  import { getClientState } from "$lib/stores/client-state.svelte.ts";
  import { Button } from "$lib/components/ui/button";
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
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
    glucoseType?: boolean;
    notes?: boolean;
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
    targetBottom = ""; // Auto-fill BG from sensor if available for BG check events
    if (selectedEvent?.bg && clientState.latestSGV) {
      const sgv = clientState.latestSGV;
      let bgValue = sgv.mgdl || sgv.sgv;

      if (bgValue && clientState.settings.units === "mmol") {
        bgValue = Math.round((bgValue / 18.01559) * 10) / 10;
      }

      if (bgValue) {
        bg = bgValue.toString();
        glucoseType = "Sensor";
      }
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
      created_at: mergedDateTime.toISOString(),
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
<Button
  variant="outline"
  size="sm"
  class="care-portal-btn {isOpen ? 'bg-accent' : ''}"
  onclick={toggleDrawer}
  title="Care Portal"
>
  📝
</Button>

<!-- Care Portal Drawer -->
{#if isOpen}
  <div class="care-portal-drawer" transition:slide={{ duration: 300 }}>
    <Card class="h-full">
      <CardHeader
        class="flex flex-row items-center justify-between space-y-0 pb-4"
      >
        <CardTitle>Care Portal</CardTitle>
        <Button variant="ghost" size="sm" onclick={() => (isOpen = false)}>
          ×
        </Button>
      </CardHeader>

      <CardContent class="space-y-4">
        <!-- Date and Time -->
        <div class="space-y-2">
          <Label>Date & Time</Label>
          <div class="flex gap-2">
            <Input type="date" bind:value={eventDate} class="flex-1" />
            <Input type="time" bind:value={eventTime} class="flex-1" />
          </div>
        </div>

        <!-- Event Type Selection -->
        <div class="space-y-2">
          <Label for="event-type">Event Type</Label>
          <select
            id="event-type"
            bind:value={selectedEventType}
            onchange={onEventTypeChange}
            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">Select event type</option>
            {#each eventTypes as eventType}
              <option value={eventType.val}>{eventType.name}</option>
            {/each}
          </select>
        </div>
        {#if selectedEvent}
          <!-- Blood Glucose -->
          {#if selectedEvent.bg}
            <div class="space-y-2">
              <Label>Blood Glucose</Label>
              <div class="flex items-center gap-2">
                <Input
                  type="number"
                  bind:value={bg}
                  placeholder="Enter BG value"
                  step={clientState.settings.units === "mmol" ? "0.1" : "1"}
                  class="flex-1"
                />
                <span class="text-sm text-muted-foreground min-w-[60px]">
                  {clientState.settings.units}
                </span>
                {#if selectedEvent.glucoseType}
                  <select
                    bind:value={glucoseType}
                    class="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
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
            <div class="space-y-2">
              <Label>Insulin</Label>
              <div class="flex items-center gap-2">
                <Input
                  type="number"
                  bind:value={insulin}
                  placeholder="Enter insulin dose"
                  step="0.1"
                  class="flex-1"
                />
                <span class="text-sm text-muted-foreground min-w-[20px]">
                  U
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onclick={quickFillFromCalculator}
                >
                  Use Calculator
                </Button>
              </div>
            </div>
          {/if}
          <!-- Carbohydrates -->
          {#if selectedEvent.carbs}
            <div class="space-y-2">
              <Label>Carbohydrates</Label>
              <div class="flex items-center gap-2">
                <Input
                  type="number"
                  bind:value={carbs}
                  placeholder="Enter carb amount"
                  step="1"
                  class="flex-1"
                />
                <span class="text-sm text-muted-foreground min-w-[20px]">
                  g
                </span>
              </div>
            </div>
          {/if}

          <!-- Protein -->
          {#if selectedEvent.protein}
            <div class="space-y-2">
              <Label>Protein</Label>
              <div class="flex items-center gap-2">
                <Input
                  type="number"
                  bind:value={protein}
                  placeholder="Enter protein amount"
                  step="1"
                  class="flex-1"
                />
                <span class="text-sm text-muted-foreground min-w-[20px]">
                  g
                </span>
              </div>
            </div>
          {/if}

          <!-- Fat -->
          {#if selectedEvent.fat}
            <div class="space-y-2">
              <Label>Fat</Label>
              <div class="flex items-center gap-2">
                <Input
                  type="number"
                  bind:value={fat}
                  placeholder="Enter fat amount"
                  step="1"
                  class="flex-1"
                />
                <span class="text-sm text-muted-foreground min-w-[20px]">
                  g
                </span>
              </div>
            </div>
          {/if}

          <!-- Pre-bolus -->
          {#if selectedEvent.prebolus}
            <div class="space-y-2">
              <Label>Pre-bolus</Label>
              <div class="flex items-center gap-2">
                <Input
                  type="number"
                  bind:value={preBolus}
                  placeholder="Pre-bolus time"
                  step="1"
                  class="flex-1"
                />
                <span class="text-sm text-muted-foreground min-w-[30px]">
                  min
                </span>
              </div>
            </div>
          {/if}

          <!-- Duration -->
          {#if selectedEvent.duration}
            <div class="space-y-2">
              <Label>Duration</Label>
              <div class="flex items-center gap-2">
                <Input
                  type="number"
                  bind:value={duration}
                  placeholder="Enter duration"
                  step="1"
                  class="flex-1"
                />
                <span class="text-sm text-muted-foreground min-w-[30px]">
                  min
                </span>
              </div>
            </div>
          {/if}
          <!-- Percent (for temp basal) -->
          {#if selectedEvent.percent}
            <div class="space-y-2">
              <Label>Percent</Label>
              <div class="flex items-center gap-2">
                <Input
                  type="number"
                  bind:value={percent}
                  placeholder="Percentage"
                  step="1"
                  class="flex-1"
                />
                <span class="text-sm text-muted-foreground min-w-[20px]">
                  %
                </span>
              </div>
            </div>
          {/if}

          <!-- Absolute (for temp basal) -->
          {#if selectedEvent.absolute}
            <div class="space-y-2">
              <Label>Absolute Rate</Label>
              <div class="flex items-center gap-2">
                <Input
                  type="number"
                  bind:value={absolute}
                  placeholder="Absolute rate"
                  step="0.1"
                  class="flex-1"
                />
                <span class="text-sm text-muted-foreground min-w-[40px]">
                  U/hr
                </span>
              </div>
            </div>
          {/if}

          <!-- Reasons -->
          {#if selectedEvent.reasons && selectedEvent.reasons.length > 0}
            <div class="space-y-2">
              <Label for="reason">Reason</Label>
              <select
                id="reason"
                bind:value={selectedReason}
                onchange={onReasonChange}
                class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Select reason</option>
                {#each selectedEvent.reasons as reason}
                  <option value={reason.name}>{reason.name}</option>
                {/each}
              </select>
            </div>
          {/if}

          <!-- Targets (for temporary targets) -->
          {#if selectedEvent.targets}
            <Card class="bg-muted/50">
              <CardContent class="pt-4 space-y-4">
                <div class="space-y-2">
                  <Label>Target Low</Label>
                  <div class="flex items-center gap-2">
                    <Input
                      type="number"
                      bind:value={targetBottom}
                      placeholder="Low target"
                      step={clientState.settings.units === "mmol" ? "0.1" : "1"}
                      class="flex-1"
                    />
                    <span class="text-sm text-muted-foreground min-w-[60px]">
                      {clientState.settings.units}
                    </span>
                  </div>
                </div>
                <div class="space-y-2">
                  <Label>Target High</Label>
                  <div class="flex items-center gap-2">
                    <Input
                      type="number"
                      bind:value={targetTop}
                      placeholder="High target"
                      step={clientState.settings.units === "mmol" ? "0.1" : "1"}
                      class="flex-1"
                    />
                    <span class="text-sm text-muted-foreground min-w-[60px]">
                      {clientState.settings.units}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          {/if}
          <!-- Notes -->
          <div class="space-y-2">
            <Label for="notes">Notes</Label>
            <textarea
              id="notes"
              bind:value={notes}
              placeholder="Optional notes..."
              rows="3"
              class="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
            ></textarea>
          </div>

          <!-- Entered By -->
          <div class="space-y-2">
            <Label for="entered-by">Entered by</Label>
            <Input
              id="entered-by"
              type="text"
              bind:value={enteredBy}
              placeholder="Your name"
            />
          </div>

          <!-- Submit Button -->
          <Button class="w-full" onclick={submitTreatment} disabled={!isValid}>
            Submit {selectedEvent.name}
          </Button>
        {/if}
      </CardContent>
    </Card>
  </div>
{/if}

<style>
  .care-portal-drawer {
    position: fixed;
    top: 0;
    right: 0;
    height: 100vh;
    width: 400px;
    background: var(--background);
    border-left: 1px solid var(--border);
    z-index: 1000;
    overflow-y: auto;
  }

  @media (max-width: 768px) {
    .care-portal-drawer {
      width: 100vw;
      left: 0;
    }
  }
</style>
