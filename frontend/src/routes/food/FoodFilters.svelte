<script lang="ts">
  import { Label } from "$lib/components/ui/label";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import * as Command from "$lib/components/ui/command";
  import * as Popover from "$lib/components/ui/popover";
  import { Badge } from "$lib/components/ui/badge";
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card";
  import { Check, ChevronsUpDown, X } from "lucide-svelte";
  import { getFoodState } from "./food-context";
  import { cn } from "$lib/utils";

  const foodState = getFoodState(); // Local values for form controls
  let nameFilter = $state(foodState.filter.name || "");
  let selectedCategories = $state<string[]>(foodState.filter.categories || []);
  let selectedSubcategories = $state<string[]>(
    foodState.filter.subcategories || []
  );

  // Combobox state
  let categorySubcategoryOpen = $state(false);
  let categorySubcategoryTriggerRef = $state<HTMLButtonElement>(null!);
  let categorySubcategorySearchValue = $state("");
  // Effect to notify parent when filters change
  $effect(() => {
    foodState.updateFilter({
      categories:
        selectedCategories.length > 0 ? selectedCategories : undefined,
      subcategories:
        selectedSubcategories.length > 0 ? selectedSubcategories : undefined,
      name: nameFilter || undefined,
    });
  });

  // Get all categories as array for combobox
  let allCategories = $derived(Object.keys(foodState.categories));

  // Selected label for display
  let selectedCategorySubcategoryLabel = $derived.by(() => {
    const totalSelected =
      selectedCategories.length + selectedSubcategories.length;
    if (totalSelected === 0) {
      return "Select categories/subcategories...";
    } else if (totalSelected === 1) {
      if (selectedCategories.length === 1) {
        return selectedCategories[0];
      } else {
        return selectedSubcategories[0];
      }
    } else {
      return `${totalSelected} items selected`;
    }
  }); // Helper functions for multi-selection
  function toggleCategory(category: string) {
    if (selectedCategories.includes(category)) {
      selectedCategories = selectedCategories.filter((c) => c !== category);
      // Remove subcategories that no longer have their parent category selected
      selectedSubcategories = selectedSubcategories.filter((sub) => {
        return selectedCategories.some(
          (cat) => foodState.categories[cat] && foodState.categories[cat][sub]
        );
      });
    } else {
      selectedCategories = [...selectedCategories, category];
    }
  }

  function toggleSubcategory(category: string, subcategory: string) {
    if (selectedSubcategories.includes(subcategory)) {
      selectedSubcategories = selectedSubcategories.filter(
        (s) => s !== subcategory
      );
    } else {
      selectedSubcategories = [...selectedSubcategories, subcategory];
      // Also ensure the parent category is selected
      if (!selectedCategories.includes(category)) {
        selectedCategories = [...selectedCategories, category];
      }
    }
  }

  function clearAllCategories() {
    selectedCategories = [];
    selectedSubcategories = [];
  }

  function clearAllSubcategories() {
    selectedSubcategories = [];
  }
</script>

{#snippet selectedItemsBadges(config: {
  items: string[];
  label: string;
  variant: "secondary" | "outline";
  onRemove: (item: string) => void;
  onClearAll: () => void;
})}
  {#if config.items.length > 0}
    <div class="space-y-2">
      <Label class="text-sm font-medium">{config.label}:</Label>
      <div class="flex flex-wrap gap-2">
        {#each config.items as item}
          <Badge variant={config.variant} class="flex items-center gap-1">
            {item}
            <button
              type="button"
              onclick={() => config.onRemove(item)}
              class="ml-1 rounded-sm opacity-70 hover:opacity-100"
            >
              <X class="size-3" />
            </button>
          </Badge>
        {/each}
        <Button
          variant="ghost"
          size="sm"
          onclick={config.onClearAll}
          class="h-6 px-2 text-xs"
        >
          Clear all
        </Button>
      </div>
    </div>
  {/if}
{/snippet}

{#snippet commandItem(config: {
  value: string;
  isSelected: boolean;
  onclick: () => void;
  class?: string;
  displayText: string;
  isBold?: boolean;
})}
  <Command.Item
    value={config.value}
    onclick={(e) => {
      e.stopPropagation();
      config.onclick();
    }}
    class={config.class}
  >
    <Check
      class={cn("mr-2 size-4", !config.isSelected && "text-transparent")}
    />
    {#if config.isBold}
      <strong>{config.displayText}</strong>
    {:else}
      {config.displayText}
    {/if}
  </Command.Item>
{/snippet}

<Card>
  <CardHeader>
    <CardTitle class="text-lg">Filter</CardTitle>
  </CardHeader>
  <CardContent class="space-y-4">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Combined Category & Subcategory Combobox -->
      <div class="space-y-2">
        <Label for="filter-category-subcategory">
          Categories & Subcategories
        </Label>
        <Popover.Root bind:open={categorySubcategoryOpen}>
          <Popover.Trigger bind:ref={categorySubcategoryTriggerRef}>
            {#snippet child({ props })}
              <Button
                variant="outline"
                class="w-full justify-between"
                {...props}
                role="combobox"
                aria-expanded={categorySubcategoryOpen}
              >
                {selectedCategorySubcategoryLabel}
                <ChevronsUpDown class="ml-2 size-4 shrink-0 opacity-50" />
              </Button>
            {/snippet}
          </Popover.Trigger>
          <Popover.Content class="w-[--radix-popover-trigger-width] p-0">
            <Command.Root shouldFilter={false}>
              <Command.Input
                placeholder="Search categories and subcategories..."
                oninput={(e) => {
                  categorySubcategorySearchValue = e.currentTarget.value;
                }}
              />
              <Command.List>
                <Command.Empty>No items found.</Command.Empty>

                <!-- Categories and their subcategories -->
                {#each allCategories.filter((cat) => !categorySubcategorySearchValue || cat
                      .toLowerCase()
                      .includes(categorySubcategorySearchValue.toLowerCase())) as category}
                  <Command.Group>
                    {@render commandItem({
                      value: category,
                      isSelected: selectedCategories.includes(category),
                      onclick: () => toggleCategory(category),
                      class: "",
                      displayText: category,
                      isBold: true,
                    })}
                    <!-- Subcategories for this category -->
                    {#if foodState.categories[category]}
                      {#each Object.keys(foodState.categories[category]).filter((sub) => !categorySubcategorySearchValue || sub
                            .toLowerCase()
                            .includes(categorySubcategorySearchValue.toLowerCase())) as subcategory}
                        {@render commandItem({
                          value: `${category} > ${subcategory}`,
                          isSelected:
                            selectedSubcategories.includes(subcategory),
                          onclick: () =>
                            toggleSubcategory(category, subcategory),
                          class: "pl-6",
                          displayText: subcategory,
                          isBold: false,
                        })}
                      {/each}
                    {/if}
                  </Command.Group>

                  <!-- Separator between categories -->
                  {#if category !== allCategories[allCategories.length - 1]}
                    <Command.Separator />
                  {/if}
                {/each}
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
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="grid md:grid-cols-2 gap-4">
        <!-- Selected Categories Display -->
        {@render selectedItemsBadges({
          items: selectedCategories,
          label: "Selected Categories",
          variant: "secondary",
          onRemove: (category) => {
            selectedCategories = selectedCategories.filter(
              (c) => c !== category
            );
            // Remove subcategories that no longer have their parent category selected
            selectedSubcategories = selectedSubcategories.filter((sub) => {
              return selectedCategories.some(
                (cat) =>
                  foodState.categories[cat] && foodState.categories[cat][sub]
              );
            });
          },
          onClearAll: clearAllCategories,
        })}

        <!-- Selected Subcategories Display -->
        {@render selectedItemsBadges({
          items: selectedSubcategories,
          label: "Selected Subcategories",
          variant: "outline",
          onRemove: (subcategory) => {
            selectedSubcategories = selectedSubcategories.filter(
              (s) => s !== subcategory
            );
          },
          onClearAll: clearAllSubcategories,
        })}
      </div>
    </div>
  </CardContent>
</Card>
