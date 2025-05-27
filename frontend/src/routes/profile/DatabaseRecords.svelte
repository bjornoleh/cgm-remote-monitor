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
  import * as Select from "$lib/components/ui/select/index.js";
  import { Plus, Trash2, Copy } from "lucide-svelte";

  interface Props {
    currentRecord: number;
    mongoRecords: any[];
    dateInput: string;
    timeInput: string;
    onUpdate: () => void;
    onRecordChange: () => void;
    onAddRecord: () => void;
    onRemoveRecord: () => void;
    onCloneRecord: () => void;
  }

  let {
    currentRecord = $bindable(),
    mongoRecords,
    dateInput = $bindable(),
    timeInput = $bindable(),
    onUpdate,
    onRecordChange,
    onAddRecord,
    onRemoveRecord,
    onCloneRecord,
  }: Props = $props();
</script>

<Card>
  <CardHeader>
    <div class="flex items-center justify-between">
      <CardTitle>Database Records</CardTitle>
      <div class="flex space-x-2">
        <Button variant="default" size="sm" onclick={onAddRecord}>
          <Plus class="w-4 h-4" />
          Add
        </Button>
        <Button variant="destructive" size="sm" onclick={onRemoveRecord}>
          <Trash2 class="w-4 h-4" />
          Remove
        </Button>
        <Button variant="outline" size="sm" onclick={onCloneRecord}>
          <Copy class="w-4 h-4" />
          Clone
        </Button>
      </div>
    </div>
  </CardHeader>

  <CardContent>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="space-y-2">
        <Label>Record valid from:</Label>
        <div class="flex space-x-2">
          <Input type="date" bind:value={dateInput} oninput={onUpdate} />
          <Input type="time" bind:value={timeInput} oninput={onUpdate} />
        </div>
      </div>

      <div class="space-y-2">
        <Label>Current Record:</Label>
        <Select.Root
          onValueChange={(value) => {
            currentRecord = parseInt(value);
            onRecordChange();
          }}
        >
          <Select.Trigger>Select a record</Select.Trigger>
          <Select.Content>
            {#each mongoRecords as record, index}
              <Select.Item value={index.toString()}>
                {new Date(record.startDate).toLocaleString()} - {record.defaultProfile}
              </Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>
    </div>
  </CardContent>
</Card>
