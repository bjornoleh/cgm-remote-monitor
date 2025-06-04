<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import type { PageData } from "../../routes/clock/$types";

  interface ClockProps {
    data: PageData;
  }

  interface SGV {
    mgdl: number;
    scaled: number;
    direction: string;
    mills: number;
  }

  interface ClockData {
    bgnow?: {
      sgvs: SGV[];
    };
    delta?: {
      display: string;
    };
  }

  interface ClockSettings {
    thresholds: {
      bgHigh: number;
      bgLow: number;
      bgTargetBottom: number;
      bgTargetTop: number;
    };
    timeFormat: number;
  }

  interface ClockElement {
    type: string;
    size?: number;
  }

  let { data }: ClockProps = $props();

  let clockData: ClockData | null = $state(null);
  let errorMessage = $state("");
  let isStale = $state(false);
  let backgroundColor = $state("black");
  let textColor = $state("grey");
  let currentTime = $state("");
  let intervalId: number | null = null;
  let timeIntervalId: number | null = null;

  // Default settings - these should ideally come from the server
  const defaultSettings: ClockSettings = {
    thresholds: {
      bgHigh: 260,
      bgLow: 55,
      bgTargetBottom: 80,
      bgTargetTop: 180,
    },
    timeFormat: 12,
  };

  // Parse face parameters into structured elements
  function parseFaceParameters(face: string): ClockElement[] {
    const elements: ClockElement[] = [];
    const faceParams = face.split("-");

    for (let i = 0; i < faceParams.length; i++) {
      const param = faceParams[i];

      if (i === 0) {
        // First parameter contains background and time settings
        // Format: [b|c][y|n][threshold]
        continue; // This is handled separately
      }

      if (param.length >= 2) {
        const type = param.substring(0, 2);
        const sizeStr = param.substring(2);
        const size = sizeStr ? parseInt(sizeStr, 10) : undefined;

        elements.push({ type, size });
      }
    }

    return elements;
  }

  // Get background and display settings from first parameter
  function parseDisplaySettings(face: string) {
    const faceParams = face.split("-");
    const firstParam = faceParams[0] || "";

    const bgColor = firstParam.charAt(0) === "c"; // 'c' for color, 'b' for black
    const alwaysShowTime = firstParam.charAt(1) === "y"; // 'y' for yes, 'n' for no
    const thresholdStr = firstParam.substring(2);
    const staleMinutes = thresholdStr ? parseInt(thresholdStr, 10) : 13;

    return { bgColor, alwaysShowTime, staleMinutes };
  }

  // Fetch data from Nightscout API
  async function fetchClockData() {
    try {
      const params = new URLSearchParams();
      if (data.token) params.append("token", data.token);
      if (data.secret) params.append("secret", data.secret);

      const url = `/api/v2/properties${params.toString() ? "?" + params.toString() : ""}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`);
      }

      const apiData = await response.json();
      clockData = apiData;
      errorMessage = "";
    } catch (error) {
      console.error("Error fetching clock data:", error);
      errorMessage = "Failed to load data";
      clockData = null;
    }
  }

  // Update the current time display
  function updateTime() {
    const timeDivisor = defaultSettings.timeFormat;
    const today = new Date();
    let h = today.getHours() % timeDivisor;

    if (timeDivisor === 12) {
      h = h === 0 ? 12 : h; // Convert 00:xx to 12:xx for 12h time
    }
    if (timeDivisor === 24) {
      h = h < 10 ? parseInt(`0${h}`) : h; // Pad hours with 0 in 24h time
    }

    let m = today.getMinutes();
    const mStr = m < 10 ? `0${m}` : `${m}`;

    currentTime = `${h}:${mStr}`;
  }

  // Calculate colors based on glucose value
  function calculateColors(
    bgValue: number,
    bgColor: boolean,
    isStale: boolean
  ) {
    if (isStale) {
      backgroundColor = "grey";
      textColor = "black";
      return;
    }

    if (!bgColor) {
      backgroundColor = "black";
      textColor = "grey";
      return;
    }

    const { bgHigh, bgLow, bgTargetBottom, bgTargetTop } =
      defaultSettings.thresholds;

    if (bgValue < bgLow || bgValue >= bgHigh) {
      backgroundColor = "rgba(213,9,21,1)"; // Red
    } else if (bgValue < bgTargetBottom) {
      backgroundColor = "rgba(78,143,207,1)"; // Blue
    } else if (bgValue < bgTargetTop) {
      backgroundColor = "rgba(134,207,70,1)"; // Green
    } else {
      backgroundColor = "rgba(234,168,0,1)"; // Yellow
    }

    textColor = "white";
  }

  // Get formatted time since last reading
  function getTimeSinceReading(mills: number): string {
    const elapsedms = Date.now() - mills;
    const elapsedMins = Math.floor(elapsedms / 1000 / 60);

    if (elapsedMins === 0) {
      return "Just now";
    } else if (elapsedMins === 1) {
      return "1 minute ago";
    } else {
      return `${elapsedMins} minutes ago`;
    }
  }

  // Get direction arrow path
  function getDirectionArrow(direction: string): string {
    if (!direction || direction === "NOT COMPUTABLE") {
      return "/images/NONE.svg";
    }
    return `/images/${direction}.svg`;
  }

  onMount(() => {
    fetchClockData();
    updateTime();

    // Set up intervals
    intervalId = window.setInterval(fetchClockData, 20 * 1000); // Update every 20 seconds
    timeIntervalId = window.setInterval(updateTime, 1000); // Update time every second
  });

  onDestroy(() => {
    if (intervalId) clearInterval(intervalId);
    if (timeIntervalId) clearInterval(timeIntervalId);
  });

  // Reactive calculations
  $effect(() => {
    if (clockData?.bgnow?.sgvs?.[0] && data.face) {
      const rec = clockData.bgnow.sgvs[0];
      const { staleMinutes, bgColor } = parseDisplaySettings(data.face);

      // Check if data is stale
      const threshold = 1000 * 60 * staleMinutes;
      const elapsedms = Date.now() - rec.mills;
      isStale = elapsedms > threshold && threshold > 0;

      // Calculate colors
      calculateColors(rec.mgdl, bgColor, isStale);
    }
  });
</script>

<main
  class="clock-main"
  style="background-color: {backgroundColor}; color: {textColor};"
>
  {#if errorMessage}
    <div class="error-message" title="Error loading data">
      {errorMessage}
    </div>
  {:else if !clockData?.bgnow?.sgvs?.[0]}
    <div class="error-message" title="No data found in DB">-?-</div>
  {:else}
    {@const rec = clockData.bgnow.sgvs[0]}
    {@const deltaDisplay = clockData.delta?.display || ""}
    {@const { alwaysShowTime, staleMinutes } = parseDisplaySettings(
      data.face || ""
    )}
    {@const elements = parseFaceParameters(data.face || "")}

    <div class="clock-inner">
      {#each elements as element}
        {#if element.type === "sg"}
          <!-- Sensor Glucose Value -->
          <div
            class="clock-element sg {isStale ? 'stale' : ''}"
            style="font-size: {element.size
              ? element.size + 'vmin'
              : 'inherit'};"
          >
            {rec.scaled}
          </div>
        {:else if element.type === "dt"}
          <!-- Delta -->
          <div
            class="clock-element dt"
            style="font-size: {element.size
              ? element.size + 'vmin'
              : 'inherit'};"
          >
            {deltaDisplay}
          </div>
        {:else if element.type === "ar"}
          <!-- Trend Arrow -->
          <div
            class="clock-element ar"
            style="height: {element.size ? element.size + 'vmin' : 'inherit'};"
          >
            <img
              src={getDirectionArrow(rec.direction)}
              alt="trend arrow"
              style="height: 100%; filter: {isStale
                ? 'brightness(0%)'
                : backgroundColor !== 'black'
                  ? 'brightness(100%)'
                  : 'brightness(50%)'};"
            />
          </div>
        {:else if element.type === "ag"}
          <!-- Age/Time since reading -->
          <div
            class="clock-element ag"
            style="font-size: {element.size
              ? element.size + 'vmin'
              : 'inherit'};"
          >
            {#if isStale || alwaysShowTime}
              {getTimeSinceReading(rec.mills)}
            {/if}
          </div>
        {:else if element.type === "tm"}
          <!-- Current Time -->
          <div
            class="clock-element tm"
            style="font-size: {element.size
              ? element.size + 'vmin'
              : 'inherit'};"
          >
            {currentTime}
          </div>
        {:else if element.type === "nl"}
          <!-- Line break -->
          <div class="clock-element nl"></div>
        {/if}
      {/each}
    </div>
  {/if}
</main>

<style>
  .clock-main {
    height: 100vh;
    width: 100vw;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    margin: 0;
    padding: 0;
    overflow: hidden;
    font-family: "Open Sans", Arial, Helvetica, sans-serif;
    transition:
      background-color 0.3s ease,
      color 0.3s ease;
  }

  .clock-inner {
    display: flex;
    align-items: center;
    justify-content: center;
    align-content: center;
    flex-flow: wrap;
    height: 100%;
    width: 100%;
  }

  .clock-element {
    margin-right: 2vmin;
    margin-left: 2vmin;
    line-height: 1em;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .clock-element.nl {
    width: 100%;
    margin: 0;
    height: 3vmin;
  }

  .clock-element img {
    height: 100%;
  }

  .error-message {
    font-size: 25vmin;
    color: grey;
  }

  .stale {
    text-decoration: line-through;
  }

  /* Default sizes when not specified */
  .sg {
    font-size: 40vmin;
  }

  .dt {
    font-size: 14vmin;
  }

  .ar {
    height: 25vmin;
  }

  .ag {
    font-size: 6vmin;
  }

  .tm {
    font-size: 10vmin;
  }
</style>
