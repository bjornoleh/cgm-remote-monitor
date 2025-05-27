<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { FoodRecord } from "../types";

  interface Props {
    foods: FoodRecord[];
    onDrop?: (food: FoodRecord, targetIndex: number) => void;
  }

  let { foods, onDrop }: Props = $props();

  const dispatch = createEventDispatcher<{
    drop: { food: FoodRecord; targetIndex: number };
  }>();

  let draggedItem: FoodRecord | null = $state(null);
  let dragOverIndex: number | null = $state(null);

  function handleDragStart(event: DragEvent, food: FoodRecord) {
    if (!event.dataTransfer) return;

    draggedItem = food;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/json", JSON.stringify(food));

    // Add a slight delay to allow the drag to start properly
    setTimeout(() => {
      const target = event.target as HTMLElement;
      target.classList.add("dragging");
    }, 0);
  }

  function handleDragEnd(event: DragEvent) {
    const target = event.target as HTMLElement;
    target.classList.remove("dragging");
    draggedItem = null;
    dragOverIndex = null;
  }

  function handleDragOver(event: DragEvent, index: number) {
    event.preventDefault();
    if (!event.dataTransfer) return;

    event.dataTransfer.dropEffect = "move";
    dragOverIndex = index;
  }

  function handleDragLeave() {
    dragOverIndex = null;
  }

  function handleDrop(event: DragEvent, targetIndex: number) {
    event.preventDefault();

    try {
      const foodData = event.dataTransfer?.getData("application/json");
      if (!foodData) return;

      const food: FoodRecord = JSON.parse(foodData);

      if (onDrop) {
        onDrop(food, targetIndex);
      } else {
        dispatch("drop", { food, targetIndex });
      }
    } catch (error) {
      console.error("Error handling drop:", error);
    } finally {
      dragOverIndex = null;
    }
  }
</script>

<div class="space-y-2">
  {#each foods as food, index}
    <div
      class="draggable-item"
      class:drag-over={dragOverIndex === index}
      draggable="true"
      ondragstart={(e) => handleDragStart(e, food)}
      ondragend={handleDragEnd}
      ondragover={(e) => handleDragOver(e, index)}
      ondragleave={handleDragLeave}
      ondrop={(e) => handleDrop(e, index)}
      role="button"
      tabindex="0"
    >
      <slot {food} {index} />
    </div>
  {/each}
</div>

<style>
  .draggable-item {
    cursor: move;
    transition: all 0.2s ease;
  }

  .draggable-item:global(.dragging) {
    opacity: 0.5;
    transform: rotate(2deg);
  }

  .draggable-item.drag-over {
    background-color: hsl(var(--muted));
    border: 2px dashed hsl(var(--border));
    border-radius: 6px;
  }

  .draggable-item:hover {
    background-color: hsl(var(--muted) / 0.5);
    border-radius: 6px;
  }
</style>
