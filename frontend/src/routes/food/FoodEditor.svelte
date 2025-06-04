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
  import * as Command from "$lib/components/ui/command";
  import * as Popover from "$lib/components/ui/popover";
  import { Check, ChevronsUpDown, Plus, SquarePlus } from "lucide-svelte";
  import { tick } from "svelte";
  import { cn } from "$lib/utils";
  import { getFoodState } from "./food-context";

  const foodStore = getFoodState(); // Combobox state
  let unitOpen = $state(false);
  let giOpen = $state(false);
  let categorySubcategoryOpen = $state(false);
  let categorySelectionOpen = $state(false);
  let unitTriggerRef = $state<HTMLButtonElement>(null!);
  let giTriggerRef = $state<HTMLButtonElement>(null!);
  let categorySubcategoryTriggerRef = $state<HTMLButtonElement>(null!);
  let categorySelectionTriggerRef = $state<HTMLButtonElement>(null!);

  // Search values for create new option (managed by Command component)
  let categorySubcategorySearchValue = $state("");

  // Category selection popup state
  let pendingSubcategoryName = $state("");

  // Get all categories as array for combobox
  let allCategories = $derived(Object.keys(foodStore.categories));

  const foodUnits = ["g", "ml", "pcs", "oz"];
  const giOptions = [
    { value: 1, label: "Low" },
    { value: 2, label: "Medium" },
    { value: 3, label: "High" },
  ]; // Selected labels for display
  let selectedUnitLabel = $derived(
    foodStore.currentFood.unit || "Select unit..."
  );
  let selectedGiLabel = $derived(
    giOptions.find((opt) => opt.value === foodStore.currentFood.gi)?.label ||
      "Select GI..."
  );
  let selectedCategorySubcategoryLabel = $derived.by(() => {
    if (foodStore.currentFood.category && foodStore.currentFood.subcategory) {
      return `${foodStore.currentFood.category} > ${foodStore.currentFood.subcategory}`;
    } else if (foodStore.currentFood.category) {
      return foodStore.currentFood.category;
    } else {
      return "Select category/subcategory...";
    }
  });

  // Helper functions for combobox
  function closeUnitAndFocus() {
    unitOpen = false;
    tick().then(() => unitTriggerRef.focus());
  }

  function closeGiAndFocus() {
    giOpen = false;
    tick().then(() => giTriggerRef.focus());
  }

  function closeCategorySubcategoryAndFocus() {
    categorySubcategoryOpen = false;
    tick().then(() => categorySubcategoryTriggerRef.focus());
  }
  function selectUnit(unit: string) {
    foodStore.currentFood.unit = unit;
    closeUnitAndFocus();
  }

  function selectGi(gi: number) {
    foodStore.currentFood.gi = gi;
    closeGiAndFocus();
  }

  function selectCategory(category: string) {
    foodStore.currentFood.category = category;
    foodStore.currentFood.subcategory = ""; // Reset subcategory when category changes
    categorySubcategorySearchValue = ""; // Clear search value
    closeCategorySubcategoryAndFocus();
  }

  function selectSubcategory(category: string, subcategory: string) {
    foodStore.currentFood.category = category;
    foodStore.currentFood.subcategory = subcategory;
    categorySubcategorySearchValue = ""; // Clear search value
    closeCategorySubcategoryAndFocus();
  }
  function selectCategorySubcategory(value: string) {
    if (value.includes(" > ")) {
      // It's a subcategory selection
      const [category, subcategory] = value.split(" > ");
      selectSubcategory(category, subcategory);
    } else {
      // It's a category selection
      selectCategory(value);
    }
  }

  const handleCreateNewCategory = () => {
    // If user typed "Something New Category", extract just "Something New"
    const categoryName = categorySubcategorySearchValue
      .replace(" Category", "")
      .replace(" > ", " ")
      .trim();
    if (categoryName && !allCategories.includes(categoryName)) {
      // Add to categories object
      foodStore.categories[categoryName] = {};
      foodStore.currentFood.category = categoryName;
      foodStore.currentFood.subcategory = "";
      categorySubcategoryOpen = false;
    }
  };

  const handleCreateNewSubcategory = () => {
    // Store the subcategory name and open category selection
    pendingSubcategoryName = categorySubcategorySearchValue.trim();
    categorySelectionOpen = true;
    categorySubcategoryOpen = false;
  };
  const handleCategorySelectionForSubcategory = (categoryName: string) => {
    if (pendingSubcategoryName && categoryName) {
      // Add new subcategory to the selected category
      if (!foodStore.categories[categoryName]) {
        foodStore.categories[categoryName] = {};
      }
      if (!foodStore.categories[categoryName][pendingSubcategoryName]) {
        foodStore.categories[categoryName][pendingSubcategoryName] = true;
        foodStore.currentFood.category = categoryName;
        foodStore.currentFood.subcategory = pendingSubcategoryName;
      }
    }

    // Reset state
    categorySelectionOpen = false;
    pendingSubcategoryName = "";
  };

  const handleCreateNewCategoryForSubcategory = () => {
    if (pendingSubcategoryName) {
      // Create new category using the pending subcategory name
      const newCategoryName = pendingSubcategoryName;
      foodStore.categories[newCategoryName] = {};
      foodStore.currentFood.category = newCategoryName;
      foodStore.currentFood.subcategory = "";
    }

    // Reset state
    categorySelectionOpen = false;
    pendingSubcategoryName = "";
  };
  function handleSaveFood() {
    foodStore.saveFood();
  }

  function handleClearForm() {
    foodStore.clearForm();
  }
</script>

<Card>
  <CardHeader>
    <CardTitle>
      Record {#if foodStore.currentFood._id}(ID: {foodStore.currentFood
          ._id}){/if}
    </CardTitle>
  </CardHeader>
  <CardContent class="space-y-4">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <div class="space-y-2">
        <Label for="food-name">Name</Label>
        <Input id="food-name" bind:value={foodStore.currentFood.name} />
      </div>
      <div class="space-y-2">
        <Label for="food-portion">Portion</Label>
        <Input
          id="food-portion"
          type="number"
          bind:value={foodStore.currentFood.portion}
        />
      </div>
      <div class="space-y-2">
        <Label for="food-unit">Unit</Label>
        <Popover.Root bind:open={unitOpen}>
          <Popover.Trigger bind:ref={unitTriggerRef}>
            {#snippet child({ props })}
              <Button
                variant="outline"
                class="w-full justify-between"
                {...props}
                role="combobox"
                aria-expanded={unitOpen}
              >
                {selectedUnitLabel}
                <ChevronsUpDown class="ml-2 size-4 shrink-0 opacity-50" />
              </Button>
            {/snippet}
          </Popover.Trigger>
          <Popover.Content class="w-[var(--bits-popover-anchor-width)] p-0">
            <Command.Root>
              <Command.Input placeholder="Search units..." />
              <Command.List>
                <Command.Empty>No unit found.</Command.Empty>
                <Command.Group>
                  {#each foodUnits as unit}
                    <Command.Item
                      value={unit}
                      onSelect={() => selectUnit(unit)}
                    >
                      <Check
                        class={cn(
                          "mr-2 size-4",
                          foodStore.currentFood.unit !== unit &&
                            "text-transparent"
                        )}
                      />
                      {unit}
                    </Command.Item>
                  {/each}
                </Command.Group>
              </Command.List>
            </Command.Root>
          </Popover.Content>
        </Popover.Root>
      </div>
      <div class="space-y-2">
        <Label for="food-carbs">Carbs (g)</Label>
        <Input
          id="food-carbs"
          type="number"
          bind:value={foodStore.currentFood.carbs}
        />
      </div>
      <div class="space-y-2">
        <Label for="food-gi">GI</Label>
        <Popover.Root bind:open={giOpen}>
          <Popover.Trigger bind:ref={giTriggerRef}>
            {#snippet child({ props })}
              <Button
                variant="outline"
                class="w-full justify-between"
                {...props}
                role="combobox"
                aria-expanded={giOpen}
              >
                {selectedGiLabel}
                <ChevronsUpDown class="ml-2 size-4 shrink-0 opacity-50" />
              </Button>
            {/snippet}
          </Popover.Trigger>
          <Popover.Content class="w-[var(--bits-popover-anchor-width)] p-0">
            <Command.Root>
              <Command.Input placeholder="Search GI levels..." />
              <Command.List>
                <Command.Empty>No GI level found.</Command.Empty>
                <Command.Group>
                  {#each giOptions as option}
                    <Command.Item
                      value={option.label}
                      onSelect={() => selectGi(option.value)}
                    >
                      <Check
                        class={cn(
                          "mr-2 size-4",
                          foodStore.currentFood.gi !== option.value &&
                            "text-transparent"
                        )}
                      />
                      {option.label}
                    </Command.Item>
                  {/each}
                </Command.Group>
              </Command.List>
            </Command.Root>
          </Popover.Content>
        </Popover.Root>
      </div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="space-y-2 col-span-2">
        <Label for="food-category-subcategory">Category & Subcategory</Label>
        <Popover.Root bind:open={categorySubcategoryOpen}>
          <Popover.Trigger
            class="w-64"
            bind:ref={categorySubcategoryTriggerRef}
          >
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
          <Popover.Content class="w-[var(--bits-popover-anchor-width)] p-0">
            <Command.Root shouldFilter={false}>
              <Command.Input
                placeholder="Search categories and subcategories..."
                bind:value={categorySubcategorySearchValue}
              />
              <Command.List>
                <Command.Empty>No category found.</Command.Empty>

                <!-- Clear selection option -->
                <Command.Group>
                  <Command.Item
                    value=""
                    onSelect={() => selectCategorySubcategory("")}
                  >
                    <Check
                      class={cn(
                        "mr-2 size-4",
                        (foodStore.currentFood.category !== "" ||
                          foodStore.currentFood.subcategory !== "") &&
                          "text-transparent"
                      )}
                    />
                    (none)
                  </Command.Item>
                </Command.Group>

                <!-- Categories and their subcategories -->
                {#each allCategories.filter((cat) => !categorySubcategorySearchValue || cat
                      .toLowerCase()
                      .includes(categorySubcategorySearchValue.toLowerCase())) as category}
                  <Command.Group>
                    <Command.Item
                      value={category}
                      onSelect={() => selectCategorySubcategory(category)}
                    >
                      <Check
                        class={cn(
                          "mr-2 size-4",
                          (foodStore.currentFood.category !== category ||
                            foodStore.currentFood.subcategory !== "") &&
                            "text-transparent"
                        )}
                      />
                      <strong>{category}</strong>
                    </Command.Item>
                    <!-- Subcategories for this category -->
                    {#if foodStore.categories[category]}
                      {#each Object.keys(foodStore.categories[category]).filter((sub) => !categorySubcategorySearchValue || sub
                            .toLowerCase()
                            .includes(categorySubcategorySearchValue.toLowerCase())) as subcategory}
                        <Command.Item
                          value={`${category} > ${subcategory}`}
                          onSelect={() =>
                            selectCategorySubcategory(
                              `${category} > ${subcategory}`
                            )}
                          class="pl-6"
                        >
                          <Check
                            class={cn(
                              "mr-2 size-4",
                              (foodStore.currentFood.category !== category ||
                                foodStore.currentFood.subcategory !==
                                  subcategory) &&
                                "text-transparent"
                            )}
                          />
                          {subcategory}
                        </Command.Item>
                      {/each}
                    {/if}
                  </Command.Group>

                  <!-- Separator between categories -->
                  {#if category !== allCategories[allCategories.length - 1]}
                    <Command.Separator />
                  {/if}
                {/each}
                <!-- Create new category or subcategory options -->
                {#if categorySubcategorySearchValue && categorySubcategorySearchValue.trim()}
                  {@const searchTerm = categorySubcategorySearchValue.trim()}
                  {@const hasMatchingCategory = allCategories.some((cat) =>
                    cat.toLowerCase().includes(searchTerm.toLowerCase())
                  )}
                  {@const hasMatchingSubcategory = allCategories.some(
                    (cat) =>
                      foodStore.categories[cat] &&
                      Object.keys(foodStore.categories[cat]).some((sub) =>
                        sub.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                  )}
                  {#if !hasMatchingCategory && !hasMatchingSubcategory}
                    <Command.Separator />
                    <Command.Group>
                      <Command.Item
                        value={`create-category-${searchTerm}`}
                        onSelect={handleCreateNewCategory}
                      >
                        <Plus class="mr-2 size-4" />
                        Create category "{searchTerm}"
                      </Command.Item>

                      <Command.Item
                        value={`create-subcategory-${searchTerm}`}
                        onSelect={handleCreateNewSubcategory}
                        class="pl-0"
                      >
                        <SquarePlus class="mr-2 size-4" />
                        Create subcategory "{searchTerm}"
                      </Command.Item>
                    </Command.Group>
                  {/if}
                {/if}
              </Command.List>
            </Command.Root>
          </Popover.Content>
        </Popover.Root>

        <!-- Category Selection Popup for new subcategories -->
        <Popover.Root bind:open={categorySelectionOpen}>
          <Popover.Trigger
            bind:ref={categorySelectionTriggerRef}
            class="hidden"
          >
            {#snippet child({ props })}
              <Button {...props}>Hidden trigger</Button>
            {/snippet}
          </Popover.Trigger>
          <Popover.Content class="w-80 p-0">
            <Command.Root>
              <Command.Input placeholder="Search categories..." />
              <Command.List>
                <Command.Empty>No category found.</Command.Empty>
                <Command.Separator />
                <Command.Group>
                  <Command.Item
                    value="Create new category"
                    onSelect={handleCreateNewCategoryForSubcategory}
                  >
                    <Plus class="mr-2 size-4" />
                    Create "{pendingSubcategoryName}" as new category
                  </Command.Item>
                </Command.Group>
                <Command.Separator />
                <Command.Group>
                  {#each allCategories as category}
                    <Command.Item
                      value={category}
                      onSelect={() =>
                        handleCategorySelectionForSubcategory(category)}
                    >
                      <Check class={cn("mr-2 size-4", "text-transparent")} />
                      Add to {category}
                    </Command.Item>
                  {/each}
                </Command.Group>
              </Command.List>
            </Command.Root>
          </Popover.Content>
        </Popover.Root>
      </div>
      <div class="space-y-2">
        <Label for="food-fat">Fat (g)</Label>
        <Input
          id="food-fat"
          type="number"
          bind:value={foodStore.currentFood.fat}
        />
      </div>
      <div class="space-y-2">
        <Label for="food-protein">Protein (g)</Label>
        <Input
          id="food-protein"
          type="number"
          bind:value={foodStore.currentFood.protein}
        />
      </div>
      <div class="space-y-2">
        <Label for="food-energy">Energy (kJ)</Label>
        <Input
          id="food-energy"
          type="number"
          bind:value={foodStore.currentFood.energy}
        />
      </div>
    </div>
    <div class="flex gap-2">
      <Button onclick={handleSaveFood}>
        {foodStore.currentFood._id ? "Save record" : "Create new record"}
      </Button>
      <Button variant="outline" onclick={handleClearForm}>Clear</Button>
    </div>
  </CardContent>
</Card>
