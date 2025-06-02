<script lang="ts">
  import { Label } from "$lib/components/ui/label";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import * as Command from "$lib/components/ui/command";
  import * as Popover from "$lib/components/ui/popover";
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card";
  import { Check, ChevronsUpDown } from "lucide-svelte";
  import { tick } from "svelte";
  import { cn } from "$lib/utils";
  import type { FoodFilter } from "./types";
  interface Props {
    filter: FoodFilter;
    categories: Record<string, Record<string, boolean>>;
    onFilterChange: (filter: FoodFilter) => void;
  }
  let { filter, categories, onFilterChange }: Props = $props();

  // Local values for form controls
  let nameFilter = $state(filter.name || "");
  let categoryValue = $state(filter.category || "");
  let subcategoryValue = $state(filter.subcategory || "");

  // Combobox state
  let categoryOpen = $state(false);
  let subcategoryOpen = $state(false);
  let categoryTriggerRef = $state<HTMLButtonElement>(null!);
  let subcategoryTriggerRef = $state<HTMLButtonElement>(null!);

  // Effect to notify parent when filters change
  $effect(() => {
    onFilterChange({
      category: categoryValue || undefined,
      subcategory: subcategoryValue || undefined,
      name: nameFilter || undefined,
    });
  });

  // Derived subcategories based on selected category
  let subcategories = $derived.by(() => {
    if (!categoryValue || !categories[categoryValue]) return [];
    return Object.keys(categories[categoryValue]);
  });

  // Get all categories as array for combobox
  let allCategories = $derived(Object.keys(categories));

  // Selected labels for display
  let selectedCategoryLabel = $derived(categoryValue || "Select category...");
  let selectedSubcategoryLabel = $derived(
    subcategoryValue || "Select subcategory..."
  );

  // Helper functions for combobox
  function closeCategoryAndFocus() {
    categoryOpen = false;
    tick().then(() => {
      categoryTriggerRef.focus();
    });
  }

  function closeSubcategoryAndFocus() {
    subcategoryOpen = false;
    tick().then(() => {
      subcategoryTriggerRef.focus();
    });
  }

  function selectCategory(category: string) {
    categoryValue = category;
    subcategoryValue = ""; // Reset subcategory when category changes
    closeCategoryAndFocus();
  }

  function selectSubcategory(subcategory: string) {
    subcategoryValue = subcategory;
    closeSubcategoryAndFocus();
  }
</script>

<Card>
  <CardHeader>
    <CardTitle class="text-lg">Filter</CardTitle>
  </CardHeader>
  <CardContent class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <!-- Category Combobox -->
    <div class="space-y-2">
      <Label for="filter-category">Category</Label>
      <Popover.Root bind:open={categoryOpen}>
        <Popover.Trigger bind:ref={categoryTriggerRef}>
          {#snippet child({ props })}
            <Button
              variant="outline"
              class="w-full justify-between"
              {...props}
              role="combobox"
              aria-expanded={categoryOpen}
            >
              {selectedCategoryLabel}
              <ChevronsUpDown class="ml-2 size-4 shrink-0 opacity-50" />
            </Button>
          {/snippet}
        </Popover.Trigger>
        <Popover.Content class="w-[--radix-popover-trigger-width] p-0">
          <Command.Root>
            <Command.Input placeholder="Search categories..." />
            <Command.List>
              <Command.Empty>No category found.</Command.Empty>
              <Command.Group>
                <Command.Item value="" onSelect={() => selectCategory("")}>
                  <Check
                    class={cn(
                      "mr-2 size-4",
                      categoryValue !== "" && "text-transparent"
                    )}
                  />
                  (none)
                </Command.Item>
                {#each allCategories as category}
                  <Command.Item
                    value={category}
                    onSelect={() => selectCategory(category)}
                  >
                    <Check
                      class={cn(
                        "mr-2 size-4",
                        categoryValue !== category && "text-transparent"
                      )}
                    />
                    {category}
                  </Command.Item>
                {/each}
              </Command.Group>
            </Command.List>
          </Command.Root>
        </Popover.Content>
      </Popover.Root>
    </div>

    <!-- Subcategory Combobox -->
    <div class="space-y-2">
      <Label for="filter-subcategory">Subcategory</Label>
      <Popover.Root bind:open={subcategoryOpen}>
        <Popover.Trigger bind:ref={subcategoryTriggerRef}>
          {#snippet child({ props })}
            <Button
              variant="outline"
              class="w-full justify-between"
              {...props}
              role="combobox"
              aria-expanded={subcategoryOpen}
              disabled={!categoryValue}
            >
              {selectedSubcategoryLabel}
              <ChevronsUpDown class="ml-2 size-4 shrink-0 opacity-50" />
            </Button>
          {/snippet}
        </Popover.Trigger>
        <Popover.Content class="w-[--radix-popover-trigger-width] p-0">
          <Command.Root>
            <Command.Input placeholder="Search subcategories..." />
            <Command.List>
              <Command.Empty>No subcategory found.</Command.Empty>
              <Command.Group>
                <Command.Item value="" onSelect={() => selectSubcategory("")}>
                  <Check
                    class={cn(
                      "mr-2 size-4",
                      subcategoryValue !== "" && "text-transparent"
                    )}
                  />
                  (none)
                </Command.Item>
                {#each subcategories as subcategory}
                  <Command.Item
                    value={subcategory}
                    onSelect={() => selectSubcategory(subcategory)}
                  >
                    <Check
                      class={cn(
                        "mr-2 size-4",
                        subcategoryValue !== subcategory && "text-transparent"
                      )}
                    />
                    {subcategory}
                  </Command.Item>
                {/each}
              </Command.Group>
            </Command.List>
          </Command.Root>
        </Popover.Content>
      </Popover.Root>
    </div>

    <!-- Name Filter Input -->
    <div class="space-y-2">
      <Label for="filter-name">Name</Label>
      <Input
        id="filter-name"
        value={nameFilter}
        oninput={(e) => {
          nameFilter = e.currentTarget.value;
        }}
        placeholder="Search by name..."
      />
    </div>
  </CardContent>
</Card>
