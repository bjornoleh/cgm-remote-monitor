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
    intervals: Array<{ time: string; value: number }>;
    title: string;
    unit: string;
    step?: string;
    totalBasal?: number;
    onAddInterval: (index: number) => void;
    onRemoveInterval: (index: number) => void;
    onUpdate: () => void;
  }

  let {
    intervals,
    title,
    unit,
    step = "0.1",
    totalBasal,
    onAddInterval,
    onRemoveInterval,
    onUpdate,
  }: Props = $props();
</script>

<Card>
  <CardHeader>
    <CardTitle>
      {title}
      {#if totalBasal !== undefined}
        - Total: {totalBasal} U/day
      {/if}
    </CardTitle>
  </CardHeader>

  <CardContent>
    <div class="space-y-3">
      {#each intervals || [] as interval, index}
        <div class="flex items-center space-x-3">
          <div class="flex items-center space-x-2">
            <Label class="text-xs">Time:</Label>
            <Input
              type="time"
              bind:value={interval.time}
              oninput={onUpdate}
              class="w-32"
            />
          </div>
          <div class="flex items-center space-x-2">
            <Label class="text-xs">{unit}:</Label>
            <Input
              type="number"
              {step}
              bind:value={interval.value}
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
          {#if intervals.length > 1}
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
