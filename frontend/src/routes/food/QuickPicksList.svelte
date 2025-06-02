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
  import QuickPickItem from "./QuickPickItem.svelte";
  import type { QuickPickRecord, FoodRecord } from "./types";

  interface Props {
    quickPickList: QuickPickRecord[];
    showHidden: boolean;
    onCreateQuickPick: () => void;
    onSaveQuickPicks: () => void;
    onUpdateShowHidden: (showHidden: boolean) => void;
    onQuickPickDelete: (index: number) => void;
    onQuickPickMoveUp: (index: number) => void;
    onQuickPickUpdateName: (index: number, name: string) => void;
    onQuickPickUpdateHidden: (index: number, hidden: boolean) => void;
    onQuickPickUpdateHideAfterUse: (
      index: number,
      hideAfterUse: boolean
    ) => void;
    onQuickPickDeleteFood: (quickPickIndex: number, foodIndex: number) => void;
    onQuickPickUpdatePortions: (
      quickPickIndex: number,
      foodIndex: number,
      portions: number
    ) => void;
    onQuickPickDrop: (quickPickIndex: number, food: FoodRecord) => void;
  }

  let {
    quickPickList,
    showHidden,
    onCreateQuickPick,
    onSaveQuickPicks,
    onUpdateShowHidden,
    onQuickPickDelete,
    onQuickPickMoveUp,
    onQuickPickUpdateName,
    onQuickPickUpdateHidden,
    onQuickPickUpdateHideAfterUse,
    onQuickPickDeleteFood,
    onQuickPickUpdatePortions,
    onQuickPickDrop,
  }: Props = $props();

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
    onCreateQuickPick();
  }

  function handleSaveQuickPicks() {
    onSaveQuickPicks();
  }

  function handleShowHiddenChange(checked: boolean) {
    onUpdateShowHidden(checked);
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
          onDelete={onQuickPickDelete}
          onMoveUp={onQuickPickMoveUp}
          onUpdateName={onQuickPickUpdateName}
          onUpdateHidden={onQuickPickUpdateHidden}
          onUpdateHideAfterUse={onQuickPickUpdateHideAfterUse}
          onDeleteFood={onQuickPickDeleteFood}
          onUpdatePortions={onQuickPickUpdatePortions}
          onDrop={onQuickPickDrop}
        />
      {/each}
    </div>
  </CardContent>
</Card>
