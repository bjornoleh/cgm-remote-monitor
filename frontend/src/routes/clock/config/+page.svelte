<script lang="ts">
  import { goto } from "$app/navigation";
  import { browser } from "$app/environment";
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { Checkbox } from "$lib/components/ui/checkbox";
  import { Slider } from "$lib/components/ui/slider";
  import {
    _generateFaceString,
    _validateConfiguration,
    _defaultConfiguration,
  } from "./+page";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
  // Configuration state using runes
  let bgColor = $state(_defaultConfiguration.bgColor);
  let alwaysShowTime = $state(_defaultConfiguration.alwaysShowTime);
  let staleMinutes = $state(_defaultConfiguration.staleMinutes);
  let elements = $state({
    sg: {
      enabled: _defaultConfiguration.elements.sg.enabled,
      size: _defaultConfiguration.elements.sg.size,
    },
    dt: {
      enabled: _defaultConfiguration.elements.dt.enabled,
      size: _defaultConfiguration.elements.dt.size,
    },
    ar: {
      enabled: _defaultConfiguration.elements.ar.enabled,
      size: _defaultConfiguration.elements.ar.size,
    },
    ag: {
      enabled: _defaultConfiguration.elements.ag.enabled,
      size: _defaultConfiguration.elements.ag.size,
    },
    time: {
      enabled: _defaultConfiguration.elements.time.enabled,
      size: _defaultConfiguration.elements.time.size,
    },
  });

  // Preview configuration
  let previewFace = $state("");
  // Create current configuration object
  let currentConfig = $derived({
    bgColor,
    alwaysShowTime,
    staleMinutes,
    elements,
  });

  // Update preview when configuration changes
  function updatePreview() {
    previewFace = _generateFaceString(currentConfig);
  } // Save configuration to localStorage
  function saveConfiguration() {
    if (!browser) return;

    const validatedConfig = _validateConfiguration(currentConfig);
    localStorage.setItem("clockConfig", JSON.stringify(validatedConfig));
    alert("Configuration saved!");
  }
  // Load configuration from localStorage
  function loadConfiguration() {
    if (!browser) return;

    const saved = localStorage.getItem("clockConfig");
    if (saved) {
      try {
        const config = JSON.parse(saved);
        const validatedConfig = _validateConfiguration(config);

        bgColor = validatedConfig.bgColor;
        alwaysShowTime = validatedConfig.alwaysShowTime;
        staleMinutes = validatedConfig.staleMinutes;
        elements = { ...validatedConfig.elements };

        updatePreview();
      } catch (e) {
        console.error("Failed to load configuration:", e);
      }
    }
  }
  // Navigate to preview
  function previewClock() {
    const faceString = _generateFaceString(currentConfig);
    goto(`/clock/${faceString}`);
  }

  // Effect to update preview when configuration changes
  $effect(() => {
    if (browser) {
      updatePreview();
    }
  });

  // Load configuration on mount
  if (browser) {
    loadConfiguration();
    updatePreview();
  }
</script>

<svelte:head>
  <title>{data.meta?.title || "Clock Configuration - Nightscout"}</title>
  <meta
    name="description"
    content={data.meta?.description ||
      "Configure your Nightscout clock display settings"}
  />
</svelte:head>

<div class="max-w-6xl mx-auto p-8 bg-background text-foreground min-h-screen">
  <h1 class="text-center text-primary text-4xl font-bold mb-8">
    Clock Configuration
  </h1>
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
    <!-- General Settings -->
    <Card.Root>
      <Card.Header>
        <Card.Title class="text-primary">General Settings</Card.Title>
      </Card.Header>
      <Card.Content class="space-y-4">
        <div class="flex items-center space-x-2">
          <Checkbox id="bgColor" bind:checked={bgColor} />
          <Label
            for="bgColor"
            class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Colorful Background
          </Label>
        </div>
        <p class="text-sm text-muted-foreground">
          Use colored background instead of black
        </p>

        <div class="flex items-center space-x-2">
          <Checkbox id="alwaysShowTime" bind:checked={alwaysShowTime} />
          <Label
            for="alwaysShowTime"
            class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Always Show Last Reading Time
          </Label>
        </div>
        <p class="text-sm text-muted-foreground">
          Always display when the last reading was taken
        </p>

        <div class="space-y-2">
          <Label for="staleMinutes">Stale Threshold (minutes)</Label>
          <Input
            id="staleMinutes"
            type="number"
            min="0"
            max="60"
            bind:value={staleMinutes}
            class="w-20"
          />
          <p class="text-sm text-muted-foreground">
            After this many minutes, readings are considered stale (0 = never)
          </p>
        </div>
      </Card.Content>
    </Card.Root>
    <!-- Element Settings -->
    <Card.Root>
      <Card.Header>
        <Card.Title class="text-primary">Display Elements</Card.Title>
      </Card.Header>
      <Card.Content class="space-y-6">
        <!-- Blood Glucose Value -->
        <Card.Root class="bg-muted/50">
          <Card.Content class="pt-4">
            <Card.Title class="text-base mb-3">
              Blood Glucose Value (sg)
            </Card.Title>
            <div class="space-y-3">
              <div class="flex items-center space-x-2">
                <Checkbox id="sg-enabled" bind:checked={elements.sg.enabled} />
                <Label for="sg-enabled">Show BG Value</Label>
              </div>
              <div class="space-y-2">
                <Label for="sg-size">Size: {elements.sg.size}px</Label>
                <Slider
                  type="single"
                  bind:value={elements.sg.size}
                  min={20}
                  max={80}
                  step={1}
                  disabled={!elements.sg.enabled}
                  class="w-full"
                />
              </div>
            </div>
          </Card.Content>
        </Card.Root>

        <!-- Delta/Change -->
        <Card.Root class="bg-muted/50">
          <Card.Content class="pt-4">
            <Card.Title class="text-base mb-3">Delta/Change (dt)</Card.Title>
            <div class="space-y-3">
              <div class="flex items-center space-x-2">
                <Checkbox id="dt-enabled" bind:checked={elements.dt.enabled} />
                <Label for="dt-enabled">Show Delta</Label>
              </div>
              <div class="space-y-2">
                <Label for="dt-size">Size: {elements.dt.size}px</Label>
                <Slider
                  type="single"
                  bind:value={elements.dt.size}
                  min={10}
                  max={40}
                  step={1}
                  disabled={!elements.dt.enabled}
                  class="w-full"
                />
              </div>
            </div>
          </Card.Content>
        </Card.Root>

        <!-- Direction Arrow -->
        <Card.Root class="bg-muted/50">
          <Card.Content class="pt-4">
            <Card.Title class="text-base mb-3">Direction Arrow (ar)</Card.Title>
            <div class="space-y-3">
              <div class="flex items-center space-x-2">
                <Checkbox id="ar-enabled" bind:checked={elements.ar.enabled} />
                <Label for="ar-enabled">Show Arrow</Label>
              </div>
              <div class="space-y-2">
                <Label for="ar-size">Size: {elements.ar.size}px</Label>
                <Slider
                  type="single"
                  bind:value={elements.ar.size}
                  min={15}
                  max={50}
                  step={1}
                  disabled={!elements.ar.enabled}
                  class="w-full"
                />
              </div>
            </div>
          </Card.Content>
        </Card.Root>

        <!-- Reading Age -->
        <Card.Root class="bg-muted/50">
          <Card.Content class="pt-4">
            <Card.Title class="text-base mb-3">Reading Age (ag)</Card.Title>
            <div class="space-y-3">
              <div class="flex items-center space-x-2">
                <Checkbox id="ag-enabled" bind:checked={elements.ag.enabled} />
                <Label for="ag-enabled">Show Reading Age</Label>
              </div>
              <div class="space-y-2">
                <Label for="ag-size">Size: {elements.ag.size}px</Label>
                <Slider
                  type="single"
                  bind:value={elements.ag.size}
                  min={8}
                  max={24}
                  step={1}
                  disabled={!elements.ag.enabled}
                  class="w-full"
                />
              </div>
            </div>
          </Card.Content>
        </Card.Root>

        <!-- Current Time -->
        <Card.Root class="bg-muted/50">
          <Card.Content class="pt-4">
            <Card.Title class="text-base mb-3">Current Time</Card.Title>
            <div class="space-y-3">
              <div class="flex items-center space-x-2">
                <Checkbox
                  id="time-enabled"
                  bind:checked={elements.time.enabled}
                />
                <Label for="time-enabled">Show Current Time</Label>
              </div>
              <div class="space-y-2">
                <Label for="time-size">Size: {elements.time.size}px</Label>
                <Slider
                  type="single"
                  bind:value={elements.time.size}
                  min={16}
                  max={48}
                  step={1}
                  disabled={!elements.time.enabled}
                  class="w-full"
                />
              </div>
            </div>
          </Card.Content>
        </Card.Root>
      </Card.Content>
    </Card.Root>
  </div>
  <!-- Preview Section -->
  <Card.Root>
    <Card.Header>
      <Card.Title class="text-center text-2xl">Preview</Card.Title>
    </Card.Header>
    <Card.Content class="text-center space-y-4">
      <div class="bg-muted rounded-md p-4">
        <strong class="text-sm font-medium">Generated Face String:</strong>
        <code
          class="font-mono text-lg bg-background px-2 py-1 rounded ml-2 text-primary"
        >
          {previewFace}
        </code>
      </div>

      <div class="flex gap-4 justify-center flex-wrap">
        <Button onclick={previewClock} class="px-6 py-3">Preview Clock</Button>
        <Button
          variant="secondary"
          onclick={saveConfiguration}
          class="px-6 py-3"
        >
          Save Configuration
        </Button>
        <Button
          variant="secondary"
          onclick={loadConfiguration}
          class="px-6 py-3"
        >
          Load Saved Configuration
        </Button>
      </div>
    </Card.Content>
  </Card.Root>
</div>
