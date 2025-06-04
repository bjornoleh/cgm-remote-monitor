<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card";
  import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from "$lib/components/ui/table";
  import { Edit, Trash2 } from "lucide-svelte";
  import { getFoodState } from "./food-context.js";
  import FoodFilters from "./FoodFilters.svelte";
  import type { FoodRecord } from "./types";

  interface Props {
    handleFoodDragStart: (event: DragEvent, food: FoodRecord) => void;
    handleFoodDragEnd: (event: DragEvent) => void;
  }

  let { handleFoodDragStart, handleFoodDragEnd }: Props = $props();

  const foodStore = getFoodState();
</script>

<Card>
  <CardHeader>
    <CardTitle>Your database</CardTitle>
  </CardHeader>
  <CardContent class="space-y-4">
    <!-- Filters -->
    <FoodFilters />
    <!-- Food List -->
    <div class="border rounded-lg max-h-64 overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Actions</TableHead>
            <TableHead>Name</TableHead>
            <TableHead class="text-center">Portion</TableHead>
            <TableHead class="text-center">Unit</TableHead>
            <TableHead class="text-center">Carbs</TableHead>
            <TableHead class="text-center">GI</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Subcategory</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {#each foodStore.filteredFoodList as food}
            <TableRow
              class="draggable-food cursor-grab"
              role="button"
              tabindex={0}
              draggable="true"
              ondragstart={(e) => handleFoodDragStart(e, food)}
              ondragend={handleFoodDragEnd}
            >
              <TableCell>
                <div class="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onclick={() => foodStore.editFood(food)}
                  >
                    <Edit class="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onclick={() => foodStore.deleteFood(food)}
                  >
                    <Trash2 class="h-3 w-3" />
                  </Button>
                </div>
              </TableCell>
              <TableCell class="truncate">{food.name}</TableCell>
              <TableCell class="text-center">{food.portion}</TableCell>
              <TableCell class="text-center">{food.unit}</TableCell>
              <TableCell class="text-center">{food.carbs}</TableCell>
              <TableCell class="text-center">{food.gi}</TableCell>
              <TableCell class="truncate">{food.category}</TableCell>
              <TableCell class="truncate">{food.subcategory}</TableCell>
            </TableRow>
          {/each}
        </TableBody>
      </Table>
    </div>
  </CardContent>
</Card>
