<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card";

  import { Plus } from "lucide-svelte";
  import QuickPickItem from "./QuickPickItem.svelte";
  import { getFoodState } from "./food-context";
  import { Label } from "$lib/components/ui/label";
  import { Checkbox } from "$lib/components/ui/checkbox";
  const foodStore = getFoodState();
  // Derived state
  let hiddenCount = $derived.by(() => {
    return foodStore.quickPickList.filter((qp) => qp.hidden).length;
  });

  let visibleQuickPicks = $derived.by(() => {
    return foodStore.showHidden
      ? foodStore.quickPickList
      : foodStore.quickPickList.filter((qp) => !qp.hidden);
  });
</script>

<Card>
  <CardHeader>
    <div class="flex items-center justify-between">
      <CardTitle>Quick picks</CardTitle>
      <div class="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onclick={() => foodStore.createQuickPick()}
        >
          <Plus class="h-4 w-4 mr-1" />
          Add new
        </Button>
        <div class="flex items-center gap-2">
          <Checkbox
            id="show-hidden"
            checked={foodStore.showHidden}
            onCheckedChange={foodStore.setShowHidden}
          />
          <Label for="show-hidden">
            Show hidden {#if hiddenCount > 0}({hiddenCount}){/if}
          </Label>
        </div>
        <Button
          variant="outline"
          size="sm"
          onclick={() => foodStore.saveQuickPicks()}
        >
          Save
        </Button>
      </div>
    </div>
  </CardHeader>
  <CardContent>
    <div class="space-y-4">
      {#each visibleQuickPicks as quickPick, index}
        <QuickPickItem {quickPick} {index} />
      {/each}
    </div>
  </CardContent>
</Card>
