<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { Plus, Trash2 } from "lucide-svelte";

  interface Props {
    targetLow: Array<{ time: string; value: number }>;
    targetHigh: Array<{ time: string; value: number }>;
    onAddInterval: (index: number) => void;
    onRemoveInterval: (index: number) => void;
    onUpdate: () => void;
  }

  let {
    targetLow,
    targetHigh,
    onAddInterval,
    onRemoveInterval,
    onUpdate,
  }: Props = $props();
</script>

<Card>
  <CardHeader>
    <CardTitle>Target BG Ranges [mg/dL]</CardTitle>
  </CardHeader>

  <CardContent>
    <div class="space-y-3">
      {#each targetLow || [] as lowInterval, index}
        {@const highInterval = targetHigh?.[index]}
        <div class="flex items-center space-x-3">
          <div class="flex items-center space-x-2">
            <Label class="text-xs">Time:</Label>
            <Input
              type="time"
              bind:value={lowInterval.time}
              oninput={() => {
                if (highInterval) highInterval.time = lowInterval.time;
                onUpdate();
              }}
              class="w-32"
            />
          </div>
          <div class="flex items-center space-x-2">
            <Label class="text-xs">Low:</Label>
            <Input
              type="number"
              step="1"
              bind:value={lowInterval.value}
              oninput={onUpdate}
              class="w-24"
            />
          </div>
          <div class="flex items-center space-x-2">
            <Label class="text-xs">High:</Label>
            <Input
              type="number"
              step="1"
              bind:value={highInterval.value}
              oninput={onUpdate}
              class="w-24"
            />
          </div>
          <Button
            type="button"
            variant="default"
            size="icon"
            onclick={() => onAddInterval(index + 1)}
          >
            <Plus class="w-4 h-4" />
          </Button>
          {#if targetLow.length > 1}
            <Button
              type="button"
              variant="destructive"
              size="icon"
              onclick={() => onRemoveInterval(index)}
            >
              <Trash2 class="w-4 h-4" />
            </Button>
          {/if}
        </div>
      {/each}
    </div>
  </CardContent>
</Card>
