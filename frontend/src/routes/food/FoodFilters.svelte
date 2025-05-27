<script lang="ts">
  import { Label } from "$lib/components/ui/label";
  import { Input } from "$lib/components/ui/input";
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    // SelectValue,
  } from "$lib/components/ui/select";
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card";
  import { createEventDispatcher } from "svelte";
  import type { FoodFilter } from "./types";

  interface Props {
    filter: FoodFilter;
    categories: Record<string, Record<string, boolean>>;
  }

  let { filter, categories }: Props = $props();

  const dispatch = createEventDispatcher<{
    filterChange: { filter: FoodFilter };
  }>();

  // Derived subcategories based on selected category
  let subcategories = $derived.by(() => {
    if (!filter.category || !categories[filter.category]) return [];
    return Object.keys(categories[filter.category]);
  });
  function onCategoryChange(category: string) {
    const newFilter = { ...filter, category, subcategory: "" };
    dispatch("filterChange", { filter: newFilter });
  }

  function onSubcategoryChange(subcategory: string) {
    const newFilter = { ...filter, subcategory };
    dispatch("filterChange", { filter: newFilter });
  }

  function onNameChange(name: string) {
    const newFilter = { ...filter, name };
    dispatch("filterChange", { filter: newFilter });
  }
</script>

<Card>
  <CardHeader>
    <CardTitle class="text-lg">Filter</CardTitle>
  </CardHeader>
  <CardContent class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <div class="space-y-2">
      <Label for="filter-category">Category</Label>
      <Select value={filter.category} onValueChange={onCategoryChange}>
        <SelectTrigger id="filter-category">
          <!-- <SelectValue placeholder="(none)" /> -->
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">(none)</SelectItem>
          {#each Object.keys(categories) as category}
            <SelectItem value={category}>{category}</SelectItem>
          {/each}
        </SelectContent>
      </Select>
    </div>
    <div class="space-y-2">
      <Label for="filter-subcategory">Subcategory</Label>
      <Select value={filter.subcategory} onValueChange={onSubcategoryChange}>
        <SelectTrigger id="filter-subcategory">
          <!-- <SelectValue placeholder="(none)" /> -->
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">(none)</SelectItem>
          {#each subcategories as subcategory}
            <SelectItem value={subcategory}>{subcategory}</SelectItem>
          {/each}
        </SelectContent>
      </Select>
    </div>
    <div class="space-y-2">
      <Label for="filter-name">Name</Label>
      <Input
        id="filter-name"
        value={filter.name}
        oninput={(e) => onNameChange(e.currentTarget.value)}
        placeholder="Search by name..."
      />
    </div>
  </CardContent>
</Card>
