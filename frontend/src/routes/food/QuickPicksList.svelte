<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card";
  import { Label } from "$lib/components/ui/label";
  import { Checkbox } from "$lib/components/ui/checkbox";
  import { Plus } from "lucide-svelte";
  import { createEventDispatcher } from "svelte";
  import QuickPickItem from "./QuickPickItem.svelte";
  import type { QuickPickRecord, FoodRecord } from "./types";

  interface Props {
    quickPickList: QuickPickRecord[];
    showHidden: boolean;
  }

  let { quickPickList, showHidden }: Props = $props();

  const dispatch = createEventDispatcher<{
    createQuickPick: void;
    saveQuickPicks: void;
    updateShowHidden: { showHidden: boolean };
    quickPickDelete: { index: number };
    quickPickMoveUp: { index: number };
    quickPickUpdateName: { index: number; name: string };
    quickPickUpdateHidden: { index: number; hidden: boolean };
    quickPickUpdateHideAfterUse: { index: number; hideAfterUse: boolean };
    quickPickDeleteFood: { quickPickIndex: number; foodIndex: number };
    quickPickUpdatePortions: {
      quickPickIndex: number;
      foodIndex: number;
      portions: number;
    };
    quickPickDrop: { quickPickIndex: number; food: FoodRecord };
  }>();

  // Derived state
  let hiddenCount = $derived.by(() => {
    return quickPickList.filter((qp) => qp.hidden).length;
  });

  let visibleQuickPicks = $derived.by(() => {
    return showHidden
      ? quickPickList
      : quickPickList.filter((qp) => !qp.hidden);
  });

  function handleCreateQuickPick() {
    dispatch("createQuickPick");
  }

  function handleSaveQuickPicks() {
    dispatch("saveQuickPicks");
  }

  function handleShowHiddenChange(checked: boolean) {
    dispatch("updateShowHidden", { showHidden: checked });
  }

  function handleQuickPickDelete({ detail }: { detail: { index: number } }) {
    dispatch("quickPickDelete", { index: detail.index });
  }

  function handleQuickPickMoveUp({ detail }: { detail: { index: number } }) {
    dispatch("quickPickMoveUp", { index: detail.index });
  }

  function handleQuickPickUpdateName({
    detail,
  }: {
    detail: { index: number; name: string };
  }) {
    dispatch("quickPickUpdateName", { index: detail.index, name: detail.name });
  }

  function handleQuickPickUpdateHidden({
    detail,
  }: {
    detail: { index: number; hidden: boolean };
  }) {
    dispatch("quickPickUpdateHidden", {
      index: detail.index,
      hidden: detail.hidden,
    });
  }

  function handleQuickPickUpdateHideAfterUse({
    detail,
  }: {
    detail: { index: number; hideAfterUse: boolean };
  }) {
    dispatch("quickPickUpdateHideAfterUse", {
      index: detail.index,
      hideAfterUse: detail.hideAfterUse,
    });
  }

  function handleQuickPickDeleteFood({
    detail,
  }: {
    detail: { quickPickIndex: number; foodIndex: number };
  }) {
    dispatch("quickPickDeleteFood", {
      quickPickIndex: detail.quickPickIndex,
      foodIndex: detail.foodIndex,
    });
  }

  function handleQuickPickUpdatePortions({
    detail,
  }: {
    detail: { quickPickIndex: number; foodIndex: number; portions: number };
  }) {
    dispatch("quickPickUpdatePortions", {
      quickPickIndex: detail.quickPickIndex,
      foodIndex: detail.foodIndex,
      portions: detail.portions,
    });
  }

  function handleQuickPickDrop({
    detail,
  }: {
    detail: { quickPickIndex: number; food: FoodRecord };
  }) {
    dispatch("quickPickDrop", {
      quickPickIndex: detail.quickPickIndex,
      food: detail.food,
    });
  }
</script>

<Card>
  <CardHeader>
    <div class="flex items-center justify-between">
      <CardTitle>Quick picks</CardTitle>
      <div class="flex items-center gap-4">
        <Button variant="outline" size="sm" onclick={handleCreateQuickPick}>
          <Plus class="h-4 w-4 mr-1" />
          Add new
        </Button>
        <div class="flex items-center gap-2">
          <Checkbox
            id="show-hidden"
            checked={showHidden}
            onCheckedChange={handleShowHiddenChange}
          />
          <Label for="show-hidden">
            Show hidden {#if hiddenCount > 0}({hiddenCount}){/if}
          </Label>
        </div>
        <Button variant="outline" size="sm" onclick={handleSaveQuickPicks}>
          Save
        </Button>
      </div>
    </div>
  </CardHeader>
  <CardContent>
    <div class="space-y-4">
      {#each visibleQuickPicks as quickPick, index}
        <QuickPickItem
          {quickPick}
          {index}
          on:delete={handleQuickPickDelete}
          on:moveUp={handleQuickPickMoveUp}
          on:updateName={handleQuickPickUpdateName}
          on:updateHidden={handleQuickPickUpdateHidden}
          on:updateHideAfterUse={handleQuickPickUpdateHideAfterUse}
          on:deleteFood={handleQuickPickDeleteFood}
          on:updatePortions={handleQuickPickUpdatePortions}
          on:drop={handleQuickPickDrop}
        />
      {/each}
    </div>
  </CardContent>
</Card>
