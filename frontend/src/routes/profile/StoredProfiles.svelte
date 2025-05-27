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
    SelectValue,
  } from "$lib/components/ui/select";
  import { Plus, Trash2, Copy } from "lucide-svelte";

  interface Props {
    currentProfile: string;
    mongoRecords: any[];
    currentRecord: number;
    profileNameInput: string;
    onProfileChange: () => void;
    onUpdate: () => void;
    onAddProfile: () => void;
    onRemoveProfile: () => void;
    onCloneProfile: () => void;
  }

  let {
    currentProfile = $bindable(),
    mongoRecords,
    currentRecord,
    profileNameInput = $bindable(),
    onProfileChange,
    onUpdate,
    onAddProfile,
    onRemoveProfile,
    onCloneProfile,
  }: Props = $props();
</script>

<Card>
  <CardHeader>
    <div class="flex items-center justify-between">
      <CardTitle>Stored Profiles</CardTitle>
      <div class="flex space-x-2">
        <Button variant="default" size="sm" onclick={onAddProfile}>
          <Plus class="w-4 h-4" />
          Add
        </Button>
        <Button variant="destructive" size="sm" onclick={onRemoveProfile}>
          <Trash2 class="w-4 h-4" />
          Remove
        </Button>
        <Button variant="outline" size="sm" onclick={onCloneProfile}>
          <Copy class="w-4 h-4" />
          Clone
        </Button>
      </div>
    </div>
  </CardHeader>

  <CardContent>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="space-y-2">
        <Label>Profile Name:</Label>
        <Input type="text" bind:value={profileNameInput} oninput={onUpdate} />
      </div>

      <div class="space-y-2">
        <Label>Current Profile:</Label>
        <Select
          onValueChange={(value) => {
            currentProfile = value;
            onProfileChange();
          }}
        >
          <SelectTrigger>Select a profile</SelectTrigger>
          <SelectContent>
            {#each Object.keys(mongoRecords[currentRecord]?.store || {}) as profileName}
              <SelectItem value={profileName}>{profileName}</SelectItem>
            {/each}
          </SelectContent>
        </Select>
      </div>
    </div>
  </CardContent>
</Card>
