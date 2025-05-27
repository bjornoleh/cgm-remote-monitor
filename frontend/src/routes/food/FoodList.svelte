<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card";
  import { Edit, Trash2 } from "lucide-svelte";
  import { createEventDispatcher } from "svelte";
  import FoodFilters from "./FoodFilters.svelte";
  import type { FoodRecord, FoodFilter } from "./types";

  interface Props {
    foodList: FoodRecord[];
    filter: FoodFilter;
    categories: Record<string, Record<string, boolean>>;
  }

  let { foodList, filter, categories }: Props = $props();

  const dispatch = createEventDispatcher<{
    editFood: { food: FoodRecord };
    deleteFood: { food: FoodRecord };
    filterChange: { filter: FoodFilter };
    foodDragStart: { event: DragEvent; food: FoodRecord };
    foodDragEnd: { event: DragEvent };
  }>();

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
    dispatch("editFood", { food });
  }

  function handleDeleteFood(food: FoodRecord) {
    dispatch("deleteFood", { food });
  }
  function handleFilterChange({ detail }: { detail: { filter: FoodFilter } }) {
    dispatch("filterChange", { filter: detail.filter });
  }

  function handleFoodDragStart(event: DragEvent, food: FoodRecord) {
    dispatch("foodDragStart", { event, food });
  }

  function handleFoodDragEnd(event: DragEvent) {
    dispatch("foodDragEnd", { event });
  }
</script>

<Card>
  <CardHeader>
    <CardTitle>Your database</CardTitle>
  </CardHeader>
  <CardContent class="space-y-4">
    <!-- Filters -->
    <FoodFilters {filter} {categories} on:filterChange={handleFilterChange} />

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
      {#each filteredFoodList as food, index}
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
