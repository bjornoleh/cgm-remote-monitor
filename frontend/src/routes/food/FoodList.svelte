<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card";
  import { Edit, Trash2 } from "lucide-svelte";
  import FoodFilters from "./FoodFilters.svelte";
  import type { FoodRecord, FoodFilter } from "./types";

  interface Props {
    foodList: FoodRecord[];
    filter: FoodFilter;
    categories: Record<string, Record<string, boolean>>;
    onEditFood: (food: FoodRecord) => void;
    onDeleteFood: (food: FoodRecord) => void;
    onFilterChange: (filter: FoodFilter) => void;
    onFoodDragStart: (event: DragEvent, food: FoodRecord) => void;
    onFoodDragEnd: (event: DragEvent) => void;
  }

  let {
    foodList,
    filter,
    categories,
    onEditFood,
    onDeleteFood,
    onFilterChange,
    onFoodDragStart,
    onFoodDragEnd,
  }: Props = $props();

  // Derived state for filtered food list
  let filteredFoodList = $derived(
    foodList.filter((food) => {
      if (filter.category && food.category !== filter.category) return false;
      if (filter.subcategory && food.subcategory !== filter.subcategory)
        return false;
      if (
        filter.name &&
        !food.name.toLowerCase().includes(filter.name.toLowerCase())
      )
        return false;
      return true;
    })
  );
  function handleEditFood(food: FoodRecord) {
    onEditFood(food);
  }

  function handleDeleteFood(food: FoodRecord) {
    onDeleteFood(food);
  }

  function handleFoodDragStart(event: DragEvent, food: FoodRecord) {
    onFoodDragStart(event, food);
  }

  function handleFoodDragEnd(event: DragEvent) {
    onFoodDragEnd(event);
  }
</script>

<Card>
  <CardHeader>
    <CardTitle>Your database</CardTitle>
  </CardHeader>
  <CardContent class="space-y-4">
    <!-- Filters -->
    <FoodFilters {filter} {categories} {onFilterChange} />

    <!-- Food List -->
    <div class="border rounded-lg max-h-64 overflow-auto">
      <div
        class="grid grid-cols-8 gap-2 p-2 border-b bg-muted/50 text-sm font-medium"
      >
        <div>Actions</div>
        <div>Name</div>
        <div class="text-center">Portion</div>
        <div class="text-center">Unit</div>
        <div class="text-center">Carbs</div>
        <div class="text-center">GI</div>
        <div>Category</div>
        <div>Subcategory</div>
      </div>
      {#each filteredFoodList as food}
        <div
          class="grid grid-cols-8 gap-2 p-2 border-b hover:bg-muted/50 text-sm draggable-food cursor-grab"
          role="button"
          tabindex="0"
          draggable="true"
          ondragstart={(e) => handleFoodDragStart(e, food)}
          ondragend={handleFoodDragEnd}
        >
          <div class="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onclick={() => handleEditFood(food)}
            >
              <Edit class="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onclick={() => handleDeleteFood(food)}
            >
              <Trash2 class="h-3 w-3" />
            </Button>
          </div>
          <div class="truncate">{food.name}</div>
          <div class="text-center">{food.portion}</div>
          <div class="text-center">{food.unit}</div>
          <div class="text-center">{food.carbs}</div>
          <div class="text-center">{food.gi}</div>
          <div class="truncate">{food.category}</div>
          <div class="truncate">{food.subcategory}</div>
        </div>
      {/each}
    </div>
  </CardContent>
</Card>
