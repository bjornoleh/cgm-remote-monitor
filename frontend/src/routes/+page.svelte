<script lang="ts">
  import { onMount } from "svelte";
  import LiveChart from "$lib/components/LiveChart.svelte";
  import BGStatus from "$lib/components/BGStatus.svelte";
  import TreatmentPills from "$lib/components/TreatmentPills.svelte";
  import SocketManager from "$lib/components/SocketManager.svelte";
  import BolusCalculator from "$lib/components/BolusCalculator.svelte";
  import CarePortal from "$lib/components/CarePortal.svelte";
  import Settings from "$lib/components/Settings.svelte";
  import {
    getClientState,
    updateClientState,
    scaleBG,
    getDirectionInfo,
  } from "$lib/stores/client-state.svelte.ts";
  import {
    submitTreatment,
    getAPISecret,
    type TreatmentData,
    type APIResponse,
  } from "$lib/api/treatments.ts";
  import type { PageData } from "./$types";

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  const clientState = getClientState();
  // Component visibility state
  let showBolusCalculator = $state(false);
  let showCarePortal = $state(false);
  let showSettings = $state(false);
  let showReportsMenu = $state(false);
  let showActionMenu = $state(false);
  let showHelpDialog = $state(false);
  let lastSubmissionStatus = $state<{
    success: boolean;
    message: string;
  } | null>(null);

  // Handle treatment submission
  async function handleTreatmentSubmit(
    treatment: TreatmentData
  ): Promise<void> {
    const apiSecret = getAPISecret();
    if (!apiSecret) {
      lastSubmissionStatus = {
        success: false,
        message: "API secret required to submit treatments",
      };
      return;
    }

    const result = await submitTreatment(treatment, apiSecret);
    lastSubmissionStatus = {
      success: result.success,
      message: result.message || result.error || "Unknown result",
    };

    if (result.success) {
      // Refresh treatments data
      // In a real app, you might want to refresh from the server or add optimistically
      console.log("Treatment submitted successfully:", result.data);
    }

    // Clear status after 5 seconds
    setTimeout(() => {
      lastSubmissionStatus = null;
    }, 5000);
  }

  // Initialize client state with server data
  onMount(() => {
    if (data.loading) {
      updateClientState({
        isLoading: true,
      });
      return;
    }

    const defaultSettings = {
      units: "mg/dl",
      timeFormat: 12,
      nightMode: false,
      showBGON: true,
      showIOB: true,
      showCOB: true,
      showBasal: true,
      showPlugins: ["delta", "direction", "timeago"],
      language: "en",
      theme: "auto",
      alarmUrgentHigh: true,
      alarmUrgentHighMins: [30, 60, 90, 120],
      alarmHigh: true,
      alarmHighMins: [30, 60, 90, 120],
      alarmLow: true,
      alarmLowMins: [15, 30, 45, 60],
      alarmUrgentLow: true,
      alarmUrgentLowMins: [15, 30, 45],
      alarmTimeagoWarn: true,
      alarmTimeagoWarnMins: 15,
      alarmTimeagoUrgent: true,
      alarmTimeagoUrgentMins: 30,
      showForecast: true,
      focusHours: data.initialData?.focusHours || 3,
      heartbeat: 60,
      baseURL: "",
      authDefaultRoles: "readable",
      thresholds: {
        bgHigh: 180,
        bgTargetTop: 140,
        bgTargetBottom: 80,
        bgLow: 55,
      },
      ...data.serverSettings?.settings,
    };

    updateClientState({
      entries: data.entries || [],
      treatments: data.treatments || [],
      deviceStatus: data.deviceStatus || [],
      settings: defaultSettings,
      now: data.initialData?.now || Date.now(),
      latestSGV: data.entries?.[data.entries.length - 1],
      isLoading: false,
      isConnected: false,
      focusRangeMS: (data.initialData?.focusHours || 3) * 60 * 60 * 1000,
      brushExtent: [
        new Date(
          Date.now() - (data.initialData?.focusHours || 3) * 60 * 60 * 1000
        ),
        new Date(),
      ],
    });
  });

  // Calculate delta from previous reading
  let delta = $derived.by(() => {
    if (!clientState.entries || clientState.entries.length < 2) return null;

    const current = clientState.latestSGV;
    const previous = clientState.entries[clientState.entries.length - 2];

    if (!current || !previous) return null;

    const currentValue = current.sgv || current.mgdl || 0;
    const previousValue = previous.sgv || previous.mgdl || 0;
    const diff = currentValue - previousValue;

    const scaledDiff = scaleBG(Math.abs(diff), clientState.settings.units);
    const sign = diff >= 0 ? "+" : "-";

    return {
      display: `${sign}${scaledDiff}`,
      value: diff,
    };
  });

  // Handle brush changes from chart
  function handleBrushChange(extent: [Date, Date]) {
    updateClientState({
      brushExtent: extent,
      inRetroMode: true,
    });
  }

  // Reset to live view
  function resetToLive() {
    const now = new Date();
    const focusStart = new Date(now.getTime() - clientState.focusRangeMS);

    updateClientState({
      brushExtent: [focusStart, now],
      inRetroMode: false,
    });
  }

  // Handle socket data updates
  function handleDataUpdate(data: any) {
    // Data is already handled in SocketManager
    console.log("Main page received data update");
  }

  // Handle alarms
  function handleAlarm(alarm: any) {
    console.log("Alarm triggered:", alarm);
    // Could trigger browser notifications, sound alerts, etc.

    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Nightscout Alert", {
        body: alarm.message || "Blood glucose alert",
        icon: "/favicon.ico",
      });
    }
  }

  // Handle announcements
  function handleAnnouncement(announcement: any) {
    console.log("Announcement received:", announcement);
  }

  // Request notification permission on mount
  onMount(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  });

  // Keyboard shortcuts
  function handleKeydown(event: KeyboardEvent) {
    if (event.metaKey || event.ctrlKey) {
      switch (event.key) {
        case "b":
          event.preventDefault();
          showBolusCalculator = true;
          break;
        case "c":
          event.preventDefault();
          showCarePortal = true;
          break;
        case ",":
          event.preventDefault();
          showSettings = true;
          break;
        case "r":
          event.preventDefault();
          resetToLive();
          break;
      }
    }

    // Escape key to close modals
    if (event.key === "Escape") {
      showBolusCalculator = false;
      showCarePortal = false;
      showSettings = false;
      showActionMenu = false;
      showHelpDialog = false;
    }

    // F1 for help
    if (event.key === "F1") {
      event.preventDefault();
      showHelpDialog = true;
    }
  }

  // Update document title with current BG
  $effect(() => {
    if (clientState.latestSGV && clientState.settings) {
      const current = clientState.latestSGV;
      const value = scaleBG(
        current.sgv || current.mgdl || 0,
        clientState.settings.units
      );
      const direction = getDirectionInfo(current.direction);
      const deltaText = delta ? ` ${delta.display}` : "";

      document.title = `${value} ${direction.arrow}${deltaText} - Nightscout`;
    } else {
      document.title = "Nightscout";
    }
  });
</script>

<svelte:head>
  <title>Nightscout</title>
  <meta
    name="description"
    content="Nightscout - Open Source Continuous Glucose Monitoring"
  />
</svelte:head>

<svelte:body onkeydown={handleKeydown} />

<!-- Socket Manager for real-time updates -->
{#if data.serverSettings}
  <SocketManager
    serverSettings={data.serverSettings}
    onDataUpdate={handleDataUpdate}
    onAlarm={handleAlarm}
    onAnnouncement={handleAnnouncement}
  />
{/if}

<div class="min-h-screen bg-background text-foreground">
  <!-- Loading state -->
  {#if data.loading}
    <div class="flex items-center justify-center min-h-screen">
      <div class="text-center space-y-4">
        <div
          class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"
        ></div>
        <p class="text-lg">{data.loadingMessage || "Loading Nightscout..."}</p>
      </div>
    </div>

    <!-- Error state -->
  {:else if data.error}
    <div class="flex items-center justify-center min-h-screen">
      <div class="text-center space-y-4 max-w-md">
        <div class="text-destructive text-6xl">⚠</div>
        <h1 class="text-2xl font-bold">Connection Error</h1>
        <p class="text-muted-foreground">{data.error}</p>
        <button
          onclick={() => window.location.reload()}
          class="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
        >
          Retry
        </button>
      </div>
    </div>

    <!-- Main application -->
  {:else}
    <div class="container mx-auto px-4 py-6 space-y-6">
      <!-- Header with current BG status -->
      <header class="space-y-4">
        <div class="flex items-center justify-between">
          <h1 class="text-3xl font-bold">
            {data.serverSettings?.name || "Nightscout"}
          </h1>

          <div class="flex items-center space-x-2">
            <!-- Quick action buttons -->
            <button
              onclick={() => (showBolusCalculator = true)}
              class="hidden sm:flex items-center gap-2 bg-secondary text-secondary-foreground px-3 py-2 rounded-lg text-sm hover:bg-secondary/80 transition-colors"
              title="Bolus Calculator (Ctrl+B)"
            >
              <span>💉</span>
              <span class="hidden md:inline">Bolus</span>
            </button>

            <button
              onclick={() => (showCarePortal = true)}
              class="hidden sm:flex items-center gap-2 bg-secondary text-secondary-foreground px-3 py-2 rounded-lg text-sm hover:bg-secondary/80 transition-colors"
              title="Care Portal (Ctrl+C)"
            >
              <span>📝</span>
              <span class="hidden md:inline">Care</span>
            </button>

            <button
              onclick={() => (showSettings = true)}
              class="hidden sm:flex items-center gap-2 bg-secondary text-secondary-foreground px-3 py-2 rounded-lg text-sm hover:bg-secondary/80 transition-colors"
              title="Settings (Ctrl+,)"
            >
              <span>⚙️</span>
              <span class="hidden md:inline">Settings</span>
            </button>

            <button
              onclick={() => (showHelpDialog = true)}
              class="hidden sm:flex items-center gap-2 bg-secondary text-secondary-foreground px-3 py-2 rounded-lg text-sm hover:bg-secondary/80 transition-colors"
              title="Help & Shortcuts (F1)"
            >
              <span>❓</span>
              <span class="hidden lg:inline">Help</span>
            </button>

            {#if clientState.inRetroMode}
              <button
                onclick={resetToLive}
                class="bg-primary text-primary-foreground px-3 py-1 rounded-lg text-sm hover:bg-primary/90 transition-colors"
                title="Return to Live View (Ctrl+R)"
              >
                Return to Live
              </button>
            {/if}

            <div class="flex items-center gap-2 text-sm text-muted-foreground">
              <!-- Connection status indicator -->
              <div class="flex items-center gap-1">
                <div
                  class="w-2 h-2 rounded-full {clientState.isConnected
                    ? 'bg-green-500'
                    : 'bg-red-500'}"
                ></div>
                <span class="hidden sm:inline">
                  {clientState.isConnected ? "Connected" : "Disconnected"}
                </span>
              </div>

              <span>•</span>
              <span>v{data.serverSettings?.version || ""}</span>
            </div>
          </div>
        </div>

        <!-- Current BG Status -->
        <BGStatus
          latestSGV={clientState.latestSGV}
          settings={clientState.settings}
          {delta}
          alarmInProgress={clientState.alarmInProgress}
        />

        <!-- Status notifications -->
        {#if lastSubmissionStatus}
          <div
            class="bg-{lastSubmissionStatus.success
              ? 'green'
              : 'red'}-100 border border-{lastSubmissionStatus.success
              ? 'green'
              : 'red'}-200 text-{lastSubmissionStatus.success
              ? 'green'
              : 'red'}-800 px-4 py-2 rounded-lg"
          >
            <div class="flex items-center justify-between">
              <span class="text-sm">{lastSubmissionStatus.message}</span>
              <button
                onclick={() => (lastSubmissionStatus = null)}
                class="text-{lastSubmissionStatus.success
                  ? 'green'
                  : 'red'}-600 hover:text-{lastSubmissionStatus.success
                  ? 'green'
                  : 'red'}-800"
              >
                ✕
              </button>
            </div>
          </div>
        {/if}
      </header>

      <!-- Main chart area -->
      <section class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-semibold">Blood Glucose Trend</h2>
          <div class="text-sm text-muted-foreground">
            {#if clientState.inRetroMode}
              Historical View
            {:else}
              Live View • Last {clientState.settings.focusHours || 3} hours
            {/if}
          </div>
        </div>

        <LiveChart
          entries={clientState.entries}
          treatments={clientState.treatments}
          settings={clientState.settings}
          brushExtent={clientState.brushExtent}
          onBrushChange={handleBrushChange}
          focusRangeMS={clientState.focusRangeMS}
          inRetroMode={clientState.inRetroMode}
        />
      </section>

      <!-- Treatment information -->
      <section>
        <TreatmentPills
          treatments={clientState.treatments}
          settings={clientState.settings}
          timeRange={clientState.brushExtent}
        />
      </section>

      <!-- Announcement banner -->
      {#if clientState.currentAnnouncement}
        <div
          class="bg-warning text-warning-foreground p-4 rounded-lg border border-warning"
        >
          <div class="flex items-start justify-between">
            <div>
              <h3 class="font-semibold">
                {clientState.currentAnnouncement.title}
              </h3>
              <p class="text-sm mt-1">
                {clientState.currentAnnouncement.message}
              </p>
            </div>
            <button
              onclick={() =>
                updateClientState({ currentAnnouncement: undefined })}
              class="text-warning-foreground hover:text-warning-foreground/80"
            >
              ✕
            </button>
          </div>
        </div>
      {/if}
    </div>

    <!-- Floating Action Menu -->
    <div class="fixed bottom-6 right-6 z-50">
      <!-- Action Menu -->
      {#if showActionMenu}
        <div
          class="absolute bottom-16 right-0 bg-background border border-border rounded-lg shadow-lg p-2 min-w-48 space-y-1 action-menu"
        >
          <button
            onclick={() => {
              showBolusCalculator = true;
              showActionMenu = false;
            }}
            class="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted rounded-md transition-colors"
          >
            <span class="text-xl">💉</span>
            <span>Bolus Calculator</span>
          </button>
          <button
            onclick={() => {
              showCarePortal = true;
              showActionMenu = false;
            }}
            class="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted rounded-md transition-colors"
          >
            <span class="text-xl">📝</span>
            <span>Care Portal</span>
          </button>
          <button
            onclick={() => {
              showSettings = true;
              showActionMenu = false;
            }}
            class="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted rounded-md transition-colors"
          >
            <span class="text-xl">⚙️</span>
            <span>Settings</span>
          </button>
          <button
            onclick={() => {
              showReportsMenu = true;
              showActionMenu = false;
            }}
            class="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted rounded-md transition-colors"
          >
            <span class="text-xl">📊</span>
            <span>Reports</span>
          </button>
          <hr class="border-border" />
          <button
            onclick={resetToLive}
            class="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted rounded-md transition-colors"
          >
            <span class="text-xl">🔄</span>
            <span>Reset to Live</span>
          </button>
          <button
            onclick={() => {
              showHelpDialog = true;
              showActionMenu = false;
            }}
            class="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted rounded-md transition-colors"
          >
            <span class="text-xl">❓</span>
            <span>Help & Shortcuts</span>
          </button>
        </div>
      {/if}

      <!-- Main FAB -->
      <button
        onclick={() => (showActionMenu = !showActionMenu)}
        class="w-14 h-14 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-all duration-200 flex items-center justify-center text-xl fab {showActionMenu
          ? 'rotate-45'
          : ''}"
        title="Open action menu"
      >
        {showActionMenu ? "✕" : "+"}
      </button>
    </div>
  {/if}
</div>

<!-- Component Modals/Drawers -->
{#if showBolusCalculator}
  <BolusCalculator
    entries={clientState.entries}
    treatments={clientState.treatments}
    settings={clientState.settings}
    onClose={() => (showBolusCalculator = false)}
    onTreatmentSubmit={async (treatment) => {
      await handleTreatmentSubmit(treatment);
      if (lastSubmissionStatus?.success) {
        showBolusCalculator = false;
      }
    }}
  />
{/if}

{#if showCarePortal}
  <CarePortal
    settings={clientState.settings}
    onClose={() => (showCarePortal = false)}
    onTreatmentSubmit={async (treatment) => {
      await handleTreatmentSubmit(treatment);
      if (lastSubmissionStatus?.success) {
        showCarePortal = false;
      }
    }}
  />
{/if}

{#if showSettings}
  <Settings
    settings={clientState.settings}
    onClose={() => (showSettings = false)}
    onSettingsUpdate={(newSettings) => {
      updateClientState({
        settings: { ...clientState.settings, ...newSettings },
      });
    }}
  />
{/if}

<!-- Reports Menu -->
{#if showReportsMenu}
  <div
    class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
  >
    <div
      class="bg-background border border-border rounded-lg max-w-md w-full max-h-[80vh] overflow-auto"
    >
      <div class="p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-semibold">Reports</h2>
          <button
            onclick={() => (showReportsMenu = false)}
            class="text-muted-foreground hover:text-foreground text-xl"
          >
            ✕
          </button>
        </div>
        <div class="space-y-3">
          <a
            href="/reports/hourly-stats"
            class="block w-full bg-primary text-primary-foreground py-3 px-4 rounded-lg hover:bg-primary/90 transition-colors text-center font-medium"
          >
            📊 Hourly Stats Report
          </a>

          <a
            href="/reports/treatments"
            class="block w-full bg-primary text-primary-foreground py-3 px-4 rounded-lg hover:bg-primary/90 transition-colors text-center font-medium"
          >
            💉 Treatments Report
          </a>

          <a
            href="/reports/daily-stats"
            class="block w-full bg-secondary text-secondary-foreground py-3 px-4 rounded-lg hover:bg-secondary/90 transition-colors text-center font-medium"
          >
            📈 Daily Stats Report
          </a>

          <a
            href="/reports/day-to-day"
            class="block w-full bg-secondary text-secondary-foreground py-3 px-4 rounded-lg hover:bg-secondary/90 transition-colors text-center font-medium"
          >
            📅 Day-to-Day Report
          </a>

          <a
            href="/reports/distribution"
            class="block w-full bg-secondary text-secondary-foreground py-3 px-4 rounded-lg hover:bg-secondary/90 transition-colors text-center font-medium"
          >
            📊 Distribution Report
          </a>

          <a
            href="/reports/calibrations"
            class="block w-full bg-secondary text-secondary-foreground py-3 px-4 rounded-lg hover:bg-secondary/90 transition-colors text-center font-medium"
          >
            🎯 Calibrations Report
          </a>
        </div>

        <div class="mt-6 pt-4 border-t border-border">
          <button
            onclick={() => (showReportsMenu = false)}
            class="w-full bg-muted text-muted-foreground py-2 rounded-lg hover:bg-muted/80 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Help Dialog -->
{#if showHelpDialog}
  <div
    class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
  >
    <div
      class="bg-background border border-border rounded-lg max-w-md w-full max-h-[80vh] overflow-auto help-dialog"
    >
      <div class="p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-semibold">Help & Keyboard Shortcuts</h2>
          <button
            onclick={() => (showHelpDialog = false)}
            class="text-muted-foreground hover:text-foreground text-xl"
          >
            ✕
          </button>
        </div>

        <div class="space-y-4 text-sm">
          <div>
            <h3 class="font-semibold mb-2">Navigation</h3>
            <ul class="space-y-1 text-muted-foreground">
              <li>
                <kbd class="bg-muted px-1 rounded">Ctrl+B</kbd>
                - Open Bolus Calculator
              </li>
              <li>
                <kbd class="bg-muted px-1 rounded">Ctrl+C</kbd>
                - Open Care Portal
              </li>
              <li>
                <kbd class="bg-muted px-1 rounded">Ctrl+,</kbd>
                - Open Settings
              </li>
              <li>
                <kbd class="bg-muted px-1 rounded">Ctrl+R</kbd>
                - Return to Live View
              </li>
              <li>
                <kbd class="bg-muted px-1 rounded">F1</kbd>
                - Show this help
              </li>
              <li>
                <kbd class="bg-muted px-1 rounded">Esc</kbd>
                - Close dialogs
              </li>
            </ul>
          </div>

          <div>
            <h3 class="font-semibold mb-2">Chart Interaction</h3>
            <ul class="space-y-1 text-muted-foreground">
              <li>• Drag to brush/zoom time range</li>
              <li>• Click outside brush to reset</li>
              <li>• Hover for detailed values</li>
              <li>• Treatments shown as overlays</li>
            </ul>
          </div>

          <div>
            <h3 class="font-semibold mb-2">Features</h3>
            <ul class="space-y-1 text-muted-foreground">
              <li>• Real-time glucose monitoring</li>
              <li>• Historical data navigation</li>
              <li>• Treatment logging & calculation</li>
              <li>• Customizable alarms & settings</li>
              <li>• Mobile responsive design</li>
            </ul>
          </div>

          <div>
            <h3 class="font-semibold mb-2">Connection Status</h3>
            <div class="flex items-center gap-2 text-muted-foreground">
              <div class="flex items-center gap-1">
                <div class="w-2 h-2 rounded-full bg-green-500"></div>
                <span>Connected - Real-time updates active</span>
              </div>
            </div>
            <div class="flex items-center gap-2 text-muted-foreground mt-1">
              <div class="flex items-center gap-1">
                <div class="w-2 h-2 rounded-full bg-red-500"></div>
                <span>Disconnected - Using cached data</span>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-6 pt-4 border-t border-border">
          <button
            onclick={() => (showHelpDialog = false)}
            class="w-full bg-primary text-primary-foreground py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  :global(body) {
    font-family:
      -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  .container {
    max-width: 1200px;
  }

  /* Improve touch targets on mobile */
  @media (max-width: 640px) {
    :global(button) {
      min-height: 44px;
    }
  }

  /* Smooth transitions for action menu */
  .action-menu {
    animation: slideUp 0.2s ease-out;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Improve floating action button */
  .fab {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transition: all 0.2s ease;
  }

  .fab:hover {
    transform: scale(1.05);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
  }

  .fab:active {
    transform: scale(0.95);
  }

  /* Custom scrollbar for help dialog */
  .help-dialog {
    scrollbar-width: thin;
    scrollbar-color: rgb(203 213 225) transparent;
  }

  .help-dialog::-webkit-scrollbar {
    width: 6px;
  }

  .help-dialog::-webkit-scrollbar-track {
    background: transparent;
  }

  .help-dialog::-webkit-scrollbar-thumb {
    background: rgb(203 213 225);
    border-radius: 3px;
  }

  /* Keyboard shortcut styling */
  kbd {
    font-family:
      ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono",
      Menlo, monospace;
    font-size: 0.75rem;
  }
</style>
