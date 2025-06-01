<script lang="ts">
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
  } from "$lib/components/ui/select";
  import { Switch } from "$lib/components/ui/switch";

  interface Props {
    selectedTimezone: string;
    diaInput: string;
    carbsHrInput: string;
    perGIValues: boolean;
    carbsHrHigh: string;
    carbsHrMedium: string;
    carbsHrLow: string;
    delayHigh: string;
    delayMedium: string;
    delayLow: string;
    onUpdate: () => void;
  }

  let {
    selectedTimezone = $bindable(),
    diaInput = $bindable(),
    carbsHrInput = $bindable(),
    perGIValues = $bindable(),
    carbsHrHigh = $bindable(),
    carbsHrMedium = $bindable(),
    carbsHrLow = $bindable(),
    delayHigh = $bindable(),
    delayMedium = $bindable(),
    delayLow = $bindable(),
    onUpdate,
  }: Props = $props();
</script>

<Card>
  <CardHeader>
    <CardTitle>Profile Settings</CardTitle>
  </CardHeader>

  <CardContent class="space-y-6">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="space-y-2">
        <Label>Timezone:</Label>
        <Select
          onValueChange={(value) => {
            selectedTimezone = value;
            onUpdate();
          }}
        >
          <SelectTrigger>Select timezone</SelectTrigger>
          <SelectContent>
            {#each Intl.supportedValuesOf("timeZone") as tz}
              <SelectItem value={tz}>{tz}</SelectItem>
            {/each}
          </SelectContent>
        </Select>
      </div>

      <div class="space-y-2">
        <Label>Duration of Insulin Activity (DIA) [hours]:</Label>
        <Input
          type="number"
          step="0.1"
          bind:value={diaInput}
          oninput={onUpdate}
        />
      </div>
    </div>

    <!-- Carb Settings -->
    <div class="space-y-4">
      <div class="flex items-center space-x-2">
        <Switch bind:checked={perGIValues} onCheckedChange={onUpdate} />
        <Label>Use per-GI carb absorption values</Label>
      </div>

      {#if !perGIValues}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label>Carb absorption rate [g/hr]:</Label>
            <Input type="number" bind:value={carbsHrInput} oninput={onUpdate} />
          </div>
        </div>
      {:else}
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="space-y-2">
            <Label>High GI carbs [g/hr]:</Label>
            <Input type="number" bind:value={carbsHrHigh} oninput={onUpdate} />
          </div>
          <div class="space-y-2">
            <Label>Medium GI carbs [g/hr]:</Label>
            <Input
              type="number"
              bind:value={carbsHrMedium}
              oninput={onUpdate}
            />
          </div>
          <div class="space-y-2">
            <Label>Low GI carbs [g/hr]:</Label>
            <Input type="number" bind:value={carbsHrLow} oninput={onUpdate} />
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="space-y-2">
            <Label>High GI delay [min]:</Label>
            <Input type="number" bind:value={delayHigh} oninput={onUpdate} />
          </div>
          <div class="space-y-2">
            <Label>Medium GI delay [min]:</Label>
            <Input type="number" bind:value={delayMedium} oninput={onUpdate} />
          </div>
          <div class="space-y-2">
            <Label>Low GI delay [min]:</Label>
            <Input type="number" bind:value={delayLow} oninput={onUpdate} />
          </div>
        </div>
      {/if}
    </div>
  </CardContent>
</Card>
