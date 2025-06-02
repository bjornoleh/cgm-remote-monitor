<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Card, CardContent, CardHeader } from "$lib/components/ui/card";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { Checkbox } from "$lib/components/ui/checkbox";
  import { Separator } from "$lib/components/ui/separator";
  import { Trash2, MoveUp } from "lucide-svelte";
  import type { QuickPickRecord, FoodRecord } from "./types";

  interface Props {
    quickPick: QuickPickRecord;
    index: number;
    onDelete: (index: number) => void;
    onMoveUp: (index: number) => void;
    onUpdateName: (index: number, name: string) => void;
    onUpdateHidden: (index: number, hidden: boolean) => void;
    onUpdateHideAfterUse: (index: number, hideAfterUse: boolean) => void;
    onDeleteFood: (quickPickIndex: number, foodIndex: number) => void;
    onUpdatePortions: (
      quickPickIndex: number,
      foodIndex: number,
      portions: number
    ) => void;
    onDrop: (quickPickIndex: number, food: FoodRecord) => void;
  }

  let {
    quickPick,
    index,
    onDelete,
    onMoveUp,
    onUpdateName,
    onUpdateHidden,
    onUpdateHideAfterUse,
    onDeleteFood,
    onUpdatePortions,
    onDrop,
  }: Props = $props();

  let isDragOver = $state(false);

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    isDragOver = false;

    try {
      const foodData = event.dataTransfer?.getData("application/json");
      if (!foodData) return;
      const food: FoodRecord = JSON.parse(foodData);
      onDrop(index, food);
    } catch (error) {
      console.error("Error handling drop:", error);
    }
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    isDragOver = true;
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "copy";
    }
  }

  function handleDragLeave(event: DragEvent) {
    // Only set isDragOver to false if we're actually leaving the drop zone
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      isDragOver = false;
    }
  }
  function deleteQuickPick() {
    onDelete(index);
  }

  function moveToTop() {
    onMoveUp(index);
  }

  function updateName(event: Event) {
    const target = event.target as HTMLInputElement;
    onUpdateName(index, target.value);
  }

  function updateHidden(checked: boolean) {
    onUpdateHidden(index, checked);
  }

  function updateHideAfterUse(checked: boolean) {
    onUpdateHideAfterUse(index, checked);
  }

  function deleteFood(foodIndex: number) {
    onDeleteFood(index, foodIndex);
  }

  function updatePortions(foodIndex: number, event: Event) {
    const target = event.target as HTMLInputElement;
    const portions = parseFloat(target.value) || 0;
    onUpdatePortions(index, foodIndex, portions);
  }
</script>

<Card
  class="border-2 border-dashed transition-all duration-200 {isDragOver
    ? 'border-primary bg-primary/5'
    : 'border-muted-foreground/25 hover:border-muted-foreground/50'}"
  ondrop={handleDrop}
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
>
  <CardHeader class="pb-2">
    <div class="flex items-center gap-2 flex-wrap">
      <Button
        variant="ghost"
        size="sm"
        onclick={moveToTop}
        title="Move to the top"
      >
        <MoveUp class="h-4 w-4" />
      </Button>
      <Separator orientation="vertical" class="h-4" />
      <Button
        variant="ghost"
        size="sm"
        onclick={deleteQuickPick}
        title="Delete quick pick"
      >
        <Trash2 class="h-4 w-4" />
      </Button>
      <Separator orientation="vertical" class="h-4" />
      <div class="flex items-center gap-2">
        <Label for="name-{index}" class="whitespace-nowrap">Name:</Label>
        <Input
          id="name-{index}"
          value={quickPick.name}
          oninput={updateName}
          class="w-32"
          placeholder="Quick pick name"
        />
      </div>
      <div class="flex items-center gap-2">
        <Checkbox
          id="hidden-{index}"
          checked={quickPick.hidden}
          onCheckedChange={updateHidden}
        />
        <Label for="hidden-{index}">Hidden</Label>
      </div>
      <div class="flex items-center gap-2">
        <Checkbox
          id="hideafteruse-{index}"
          checked={quickPick.hideafteruse}
          onCheckedChange={updateHideAfterUse}
        />
        <Label for="hideafteruse-{index}">Hide after use</Label>
      </div>
      <Separator orientation="vertical" class="h-4" />
      <span class="text-sm text-muted-foreground whitespace-nowrap">
        Carbs: {quickPick.carbs.toFixed(0)} g
      </span>
    </div>
  </CardHeader>
  <CardContent>
    {#if quickPick.foods.length > 0}
      <div class="space-y-2">
        <div
          class="grid grid-cols-6 gap-2 text-sm font-medium text-muted-foreground border-b pb-1"
        >
          <div>Actions</div>
          <div>Name</div>
          <div class="text-center">Portion</div>
          <div class="text-center">Carbs</div>
          <div class="text-center">Portions</div>
          <div class="text-center">Total Carbs</div>
        </div>
        {#each quickPick.foods as food, foodIndex}
          <div
            class="grid grid-cols-6 gap-2 text-sm items-center py-1 hover:bg-muted/25 rounded"
          >
            <div>
              <Button
                variant="ghost"
                size="sm"
                onclick={() => deleteFood(foodIndex)}
                title="Remove food from quick pick"
              >
                <Trash2 class="h-3 w-3" />
              </Button>
            </div>
            <div class="truncate" title={food.name}>{food.name}</div>
            <div class="text-center">{food.portion} {food.unit}</div>
            <div class="text-center">{food.carbs}g</div>
            <div class="text-center">
              <Input
                type="number"
                value={food.portions}
                oninput={(e) => updatePortions(foodIndex, e)}
                class="w-16 h-6 text-xs text-center"
                min="0"
                step="0.1"
              />
            </div>
            <div class="text-center font-medium">
              {(food.carbs * food.portions).toFixed(1)}g
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <div
        class="text-center text-muted-foreground italic py-8 border-2 border-dashed border-muted-foreground/25 rounded-lg"
      >
        {#if isDragOver}
          <div class="text-primary font-medium">Drop food here!</div>
        {:else}
          → Drag & drop food here
        {/if}
      </div>
    {/if}
  </CardContent>
</Card>
