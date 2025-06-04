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
  import { Plus, Trash2, Copy, Check, ChevronsUpDown } from "lucide-svelte";
  import { tick } from "svelte";
  import { cn } from "$lib/utils";

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

  // Combobox state
  let profileOpen = $state(false);
  let profileTriggerRef = $state<HTMLButtonElement>(null!);
  // Get available profiles
  let availableProfiles = $derived(
    Object.keys(mongoRecords[currentRecord]?.store || {}).filter(
      (key): key is string => typeof key === "string"
    )
  );
  let selectedProfileLabel = $derived(currentProfile || "Select a profile...");

  function closeProfileAndFocus() {
    profileOpen = false;
    tick().then(() => profileTriggerRef.focus());
  }

  function selectProfile(profileName: string) {
    currentProfile = profileName;
    onProfileChange();
    closeProfileAndFocus();
  }
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
        <Popover.Root bind:open={profileOpen}>
          <Popover.Trigger bind:ref={profileTriggerRef}>
            {#snippet child({ props })}
              <Button
                variant="outline"
                class="w-full justify-between"
                {...props}
                role="combobox"
                aria-expanded={profileOpen}
              >
                {selectedProfileLabel}
                <ChevronsUpDown class="ml-2 size-4 shrink-0 opacity-50" />
              </Button>
            {/snippet}
          </Popover.Trigger>
          <Popover.Content class="w-[var(--bits-popover-anchor-width)] p-0">
            <Command.Root>
              <Command.Input placeholder="Search profiles..." />
              <Command.List>
                <Command.Empty>No profile found.</Command.Empty>
                <Command.Group>
                  {#each availableProfiles as profileName}
                    <Command.Item
                      value={profileName}
                      onSelect={() => selectProfile(profileName)}
                    >
                      <Check
                        class={cn(
                          "mr-2 size-4",
                          currentProfile !== profileName && "text-transparent"
                        )}
                      />
                      {profileName}
                    </Command.Item>
                  {/each}
                </Command.Group>
              </Command.List>
            </Command.Root>
          </Popover.Content>
        </Popover.Root>
      </div>
    </div>
  </CardContent>
</Card>
