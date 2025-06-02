<script lang="ts">
  import { toast } from "svelte-sonner";
  import FoodList from "./FoodList.svelte";
  import FoodEditor from "./FoodEditor.svelte";
  import QuickPicksList from "./QuickPicksList.svelte";
  import type {
    FoodRecord,
    QuickPickRecord,
    QuickPickFood,
    FoodFilter,
  } from "./types";

  interface Props {
    data: {
      foodList: FoodRecord[];
      quickPickList: QuickPickRecord[];
      categories: Record<string, Record<string, boolean>>;
      nightscoutUrl: string;
      error?: string;
    };
  }

  let { data }: Props = $props();

  // Initialize state with server data
  let foodList: FoodRecord[] = $state(data.foodList);
  let quickPickList: QuickPickRecord[] = $state(data.quickPickList);
  let categories: Record<string, Record<string, boolean>> = $state(
    data.categories
  );
  let loading = $state(false);
  let status = $state(data.error || "Database loaded");
  let nightscoutUrl = data.nightscoutUrl;

  // Current food record
  let currentFood: FoodRecord = $state({
    type: "food",
    category: "",
    subcategory: "",
    name: "",
    portion: 0,
    carbs: 0,
    fat: 0,
    protein: 0,
    energy: 0,
    gi: 2,
    unit: "g",
  });

  // Filter state
  let filter: FoodFilter = $state({
    category: "",
    subcategory: "",
    name: "",
  });

  // Quick picks to delete (for batch operations)
  let quickPicksToDelete: string[] = $state([]);

  // UI state
  let showHidden = $state(false);

  // API functions
  function calculateQuickPickCarbs(quickPick: QuickPickRecord) {
    quickPick.carbs = 0;
    if (quickPick.foods) {
      quickPick.foods.forEach((food) => {
        quickPick.carbs += food.carbs * (food.portions || 1);
      });
    } else {
      quickPick.foods = [];
    }
  }

  async function saveFood() {
    try {
      const isNew = !currentFood._id;
      const url = `${nightscoutUrl}/api/v1/food/`;
      const method = isNew ? "POST" : "PUT";

      const foodToSave = { ...currentFood };
      if (isNew) {
        delete foodToSave._id;
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(foodToSave),
      });

      if (response.ok) {
        if (isNew) {
          const result = await response.json();
          currentFood._id = result[0]._id;
          foodList.push({ ...currentFood });

          // Update categories
          if (currentFood.category && !categories[currentFood.category]) {
            categories[currentFood.category] = {};
          }
          if (currentFood.category && currentFood.subcategory) {
            categories[currentFood.category][currentFood.subcategory] = true;
          }
        } else {
          // Update existing record in list
          const index = foodList.findIndex((f) => f._id === currentFood._id);
          if (index !== -1) {
            foodList[index] = { ...currentFood };
          }
        }

        clearForm();
        toast.success(
          isNew ? "Food created successfully" : "Food updated successfully"
        );
        status = "OK";
      } else {
        throw new Error("Failed to save food");
      }
    } catch (error) {
      toast.error("Failed to save food");
      status = "Error";
    }
  }

  async function deleteFood(food: FoodRecord) {
    try {
      const response = await fetch(`${nightscoutUrl}/api/v1/food/${food._id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        foodList = foodList.filter((f) => f._id !== food._id);
        toast.success("Food deleted successfully");
        status = "OK";
      } else {
        throw new Error("Failed to delete food");
      }
    } catch (error) {
      toast.error("Failed to delete food");
      status = "Error";
    }
  }

  function editFood(food: FoodRecord) {
    currentFood = { ...food };
  }

  function clearForm() {
    currentFood = {
      type: "food",
      category: "",
      subcategory: "",
      name: "",
      portion: 0,
      carbs: 0,
      fat: 0,
      protein: 0,
      energy: 0,
      gi: 2,
      unit: "g",
    };
  }

  async function createQuickPick() {
    try {
      const newQuickPick: QuickPickRecord = {
        type: "quickpick",
        name: "",
        foods: [],
        carbs: 0,
        hideafteruse: true,
        hidden: false,
        position: 99999,
      };

      const response = await fetch(`${nightscoutUrl}/api/v1/food/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newQuickPick),
      });

      if (response.ok) {
        const result = await response.json();
        newQuickPick._id = result[0]._id;
        quickPickList.unshift(newQuickPick);
        toast.success("Quick pick created");
        status = "OK";
      } else {
        throw new Error("Failed to create quick pick");
      }
    } catch (error) {
      toast.error("Failed to create quick pick");
      status = "Error";
    }
  }

  async function saveQuickPicks() {
    try {
      // Delete marked quick picks
      for (const id of quickPicksToDelete) {
        await fetch(`${nightscoutUrl}/api/v1/food/${id}`, { method: "DELETE" });
      }
      quickPicksToDelete = [];

      // Update positions and save all quick picks
      for (let i = 0; i < quickPickList.length; i++) {
        const qp = quickPickList[i];
        qp.position = qp.hidden ? 99999 : i;

        await fetch(`${nightscoutUrl}/api/v1/food/`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(qp),
        });
      }

      toast.success("Quick picks saved successfully");
      status = "OK";
    } catch (error) {
      toast.error("Failed to save quick picks");
      status = "Error";
    }
  }
  // Event handlers for FoodList component
  function handleEditFood(food: FoodRecord) {
    editFood(food);
  }

  function handleDeleteFood(food: FoodRecord) {
    deleteFood(food);
  }

  function handleFilterChange(newFilter: FoodFilter) {
    filter = newFilter;
  }

  function handleFoodDragStart(event: DragEvent, food: FoodRecord) {
    if (!event.dataTransfer) return;

    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("application/json", JSON.stringify(food));

    // Visual feedback
    setTimeout(() => {
      const target = event.target as HTMLElement;
      target.classList.add("opacity-50");
    }, 0);
  }

  function handleFoodDragEnd(event: DragEvent) {
    const target = event.target as HTMLElement;
    target.classList.remove("opacity-50");
  }

  // Event handlers for FoodEditor component
  function handleSaveFood() {
    saveFood();
  }

  function handleClearForm() {
    clearForm();
  }
  // Event handlers for QuickPicksList component
  function handleCreateQuickPick() {
    createQuickPick();
  }

  function handleSaveQuickPicks() {
    saveQuickPicks();
  }

  function handleUpdateShowHidden(newShowHidden: boolean) {
    showHidden = newShowHidden;
  }

  function handleQuickPickDelete(index: number) {
    const quickPick = quickPickList[index];
    if (quickPick._id) {
      quickPicksToDelete.push(quickPick._id);
    }
    quickPickList.splice(index, 1);
    quickPickList = [...quickPickList]; // Trigger reactivity
  }

  function handleQuickPickMoveUp(index: number) {
    const quickPick = quickPickList.splice(index, 1)[0];
    quickPickList.unshift(quickPick);
    quickPickList = [...quickPickList]; // Trigger reactivity
  }

  function handleQuickPickUpdateName(index: number, name: string) {
    quickPickList[index].name = name;
  }

  function handleQuickPickUpdateHidden(index: number, hidden: boolean) {
    const quickPick = quickPickList[index];
    quickPick.hidden = hidden;

    // Move to top if unhidden
    if (!hidden) {
      quickPickList.splice(index, 1);
      quickPickList.unshift(quickPick);
      quickPickList = [...quickPickList]; // Trigger reactivity
    }
  }

  function handleQuickPickUpdateHideAfterUse(
    index: number,
    hideAfterUse: boolean
  ) {
    quickPickList[index].hideafteruse = hideAfterUse;
  }

  function handleQuickPickDeleteFood(
    quickPickIndex: number,
    foodIndex: number
  ) {
    const quickPick = quickPickList[quickPickIndex];
    quickPick.foods.splice(foodIndex, 1);
    calculateQuickPickCarbs(quickPick);
    quickPickList = [...quickPickList]; // Trigger reactivity
  }

  function handleQuickPickUpdatePortions(
    quickPickIndex: number,
    foodIndex: number,
    portions: number
  ) {
    const quickPick = quickPickList[quickPickIndex];
    quickPick.foods[foodIndex].portions = portions;
    calculateQuickPickCarbs(quickPick);
    quickPickList = [...quickPickList]; // Trigger reactivity
  }

  function handleQuickPickDrop(quickPickIndex: number, food: FoodRecord) {
    const quickPick = quickPickList[quickPickIndex];
    const quickPickFood: QuickPickFood = { ...food, portions: 1 };
    quickPick.foods.push(quickPickFood);
    calculateQuickPickCarbs(quickPick);
    quickPickList = [...quickPickList]; // Trigger reactivity
  }
</script>

<svelte:head>
  <title>Food Editor - Nightscout</title>
</svelte:head>

<div class="container mx-auto p-4 space-y-6">
  <div class="flex items-center justify-between">
    <h1 class="text-3xl font-bold">Food Editor</h1>
    {#if status}
      <div class="text-sm text-muted-foreground">{status}</div>
    {/if}
  </div>

  {#if loading}
    <div class="text-center py-8">Loading food database...</div>
  {:else}
    <!-- Food Database Section -->
    <FoodList
      {foodList}
      {filter}
      {categories}
      onEditFood={handleEditFood}
      onDeleteFood={handleDeleteFood}
      onFilterChange={handleFilterChange}
      onFoodDragStart={handleFoodDragStart}
      onFoodDragEnd={handleFoodDragEnd}
    />

    <!-- Food Record Editor -->
    <FoodEditor
      {currentFood}
      {categories}
      onSaveFood={handleSaveFood}
      onClearForm={handleClearForm}
    />

    <!-- Quick Picks Section -->
    <QuickPicksList
      {quickPickList}
      {showHidden}
      onCreateQuickPick={handleCreateQuickPick}
      onSaveQuickPicks={handleSaveQuickPicks}
      onUpdateShowHidden={handleUpdateShowHidden}
      onQuickPickDelete={handleQuickPickDelete}
      onQuickPickMoveUp={handleQuickPickMoveUp}
      onQuickPickUpdateName={handleQuickPickUpdateName}
      onQuickPickUpdateHidden={handleQuickPickUpdateHidden}
      onQuickPickUpdateHideAfterUse={handleQuickPickUpdateHideAfterUse}
      onQuickPickDeleteFood={handleQuickPickDeleteFood}
      onQuickPickUpdatePortions={handleQuickPickUpdatePortions}
      onQuickPickDrop={handleQuickPickDrop}
    />
  {/if}
</div>
