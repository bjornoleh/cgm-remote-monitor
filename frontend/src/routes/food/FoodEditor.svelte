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
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    // SelectValue,
  } from "$lib/components/ui/select";
  // import { createEventDispatcher } from "svelte";
  import type { FoodRecord } from "./types";

  interface Props {
    currentFood: FoodRecord;
    categories: Record<string, Record<string, boolean>>;
    onSaveFood: () => void;
    onClearForm: () => void;
  }

  let { currentFood, categories, onSaveFood, onClearForm }: Props = $props();

  // Derived state for subcategories based on selected category
  let editSubcategories = $derived.by(() => {
    if (!currentFood.category || !categories[currentFood.category]) return [];
    return Object.keys(categories[currentFood.category]);
  });

  const foodUnits = ["g", "ml", "pcs", "oz"];
  const giOptions = [
    { value: 1, label: "Low" },
    { value: 2, label: "Medium" },
    { value: 3, label: "High" },
  ];

  function handleSaveFood() {
    onSaveFood();
  }

  function handleClearForm() {
    onClearForm();
  }

  function onFoodCategoryChange(category: string) {
    currentFood.category = category;
    currentFood.subcategory = "";
  }
</script>

<Card>
  <CardHeader>
    <CardTitle>
      Record {#if currentFood._id}(ID: {currentFood._id}){/if}
    </CardTitle>
  </CardHeader>
  <CardContent class="space-y-4">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <div class="space-y-2">
        <Label for="food-name">Name</Label>
        <Input id="food-name" bind:value={currentFood.name} />
      </div>
      <div class="space-y-2">
        <Label for="food-portion">Portion</Label>
        <Input
          id="food-portion"
          type="number"
          bind:value={currentFood.portion}
        />
      </div>
      <div class="space-y-2">
        <Label for="food-unit">Unit</Label>
        <Select bind:value={currentFood.unit}>
          <SelectTrigger id="food-unit">
            <!-- <SelectValue /> -->
          </SelectTrigger>
          <SelectContent>
            {#each foodUnits as unit}
              <SelectItem value={unit}>{unit}</SelectItem>
            {/each}
          </SelectContent>
        </Select>
      </div>
      <div class="space-y-2">
        <Label for="food-carbs">Carbs (g)</Label>
        <Input id="food-carbs" type="number" bind:value={currentFood.carbs} />
      </div>
      <div class="space-y-2">
        <Label for="food-gi">GI</Label>
        <Select bind:value={currentFood.gi}>
          <SelectTrigger id="food-gi">
            <!-- <SelectValue /> -->
          </SelectTrigger>
          <SelectContent>
            {#each giOptions as option}
              <SelectItem value={option.value}>{option.label}</SelectItem>
            {/each}
          </SelectContent>
        </Select>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <div class="space-y-2">
        <Label for="food-category">Category</Label>
        <div class="space-y-2">
          <Select
            bind:value={currentFood.category}
            onValueChange={(value) => onFoodCategoryChange(value)}
          >
            <SelectTrigger>
              <!-- <SelectValue placeholder="(none)" /> -->
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">(none)</SelectItem>
              {#each Object.keys(categories) as category}
                <SelectItem value={category}>{category}</SelectItem>
              {/each}
            </SelectContent>
          </Select>
          <Input
            bind:value={currentFood.category}
            placeholder="Or type new category"
          />
        </div>
      </div>
      <div class="space-y-2">
        <Label for="food-subcategory">Subcategory</Label>
        <div class="space-y-2">
          <Select bind:value={currentFood.subcategory}>
            <SelectTrigger>
              <!-- <SelectValue placeholder="(none)" /> -->
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">(none)</SelectItem>
              {#each editSubcategories as subcategory}
                <SelectItem value={subcategory}>{subcategory}</SelectItem>
              {/each}
            </SelectContent>
          </Select>
          <Input
            bind:value={currentFood.subcategory}
            placeholder="Or type new subcategory"
          />
        </div>
      </div>
      <div class="space-y-2">
        <Label for="food-fat">Fat (g)</Label>
        <Input id="food-fat" type="number" bind:value={currentFood.fat} />
      </div>
      <div class="space-y-2">
        <Label for="food-protein">Protein (g)</Label>
        <Input
          id="food-protein"
          type="number"
          bind:value={currentFood.protein}
        />
      </div>
      <div class="space-y-2">
        <Label for="food-energy">Energy (kJ)</Label>
        <Input id="food-energy" type="number" bind:value={currentFood.energy} />
      </div>
    </div>

    <div class="flex gap-2">
      <Button onclick={handleSaveFood}>
        {currentFood._id ? "Save record" : "Create new record"}
      </Button>
      <Button variant="outline" onclick={handleClearForm}>Clear</Button>
    </div>
  </CardContent>
</Card>
