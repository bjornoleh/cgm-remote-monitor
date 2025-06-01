<!-- SvelteKit Profile Editor Component -->
<script lang="ts">
  import { enhance } from "$app/forms";
  import { Button } from "$lib/components/ui/button";
  import { Save } from "lucide-svelte";
  import ProfileHeader from "./ProfileHeader.svelte";
  import DatabaseRecords from "./DatabaseRecords.svelte";
  import StoredProfiles from "./StoredProfiles.svelte";
  import ProfileSettings from "./ProfileSettings.svelte";
  import IntervalEditor from "./IntervalEditor.svelte";
  import TargetBGEditor from "./TargetBGEditor.svelte";

  let { data, form } = $props();

  let mongoRecords = $state(data.mongoRecords || []);
  let timezones = $state(data.timezones || []);
  let currentRecord = $state(0);
  let currentProfile = $state(null);
  let dirty = $state(false);
  let c_profile = $state({});
  let status = $state("Profile loaded");
  let showForm = $state(true);
  let isSubmitting = $state(false);

  // Form elements
  let timeInput = $state("");
  let dateInput = $state("");
  let profileNameInput = $state("");
  let selectedTimezone = $state("");
  let diaInput = $state("");
  let carbsHrInput = $state("");
  let perGIValues = $state(false);
  let carbsHrHigh = $state("");
  let carbsHrMedium = $state("");
  let carbsHrLow = $state("");
  let delayHigh = $state("");
  let delayMedium = $state("");
  let delayLow = $state("");
  // Default profile structure
  const defaultProfile = {
    dia: 3,
    carbs_hr: 30,
    delay: 20,
    perGIvalues: false,
    carbs_hr_high: 30,
    carbs_hr_medium: 30,
    carbs_hr_low: 30,
    delay_high: 20,
    delay_medium: 20,
    delay_low: 20,
    timezone: "",
    target_low: [{ time: "00:00", value: 80 }],
    target_high: [{ time: "00:00", value: 120 }],
    basal: [{ time: "00:00", value: 1.0 }],
    sens: [{ time: "00:00", value: 50 }],
    carbratio: [{ time: "00:00", value: 15 }],
  };

  // Initialize data
  $effect(() => {
    if (mongoRecords.length === 0) {
      mongoRecords = [
        {
          startDate: new Date().toISOString(),
          defaultProfile: "Default",
          store: {
            Default: { ...defaultProfile },
          },
        },
      ];
    }
    initEditor();
  });

  function initEditor() {
    if (mongoRecords.length > 0) {
      currentProfile = mongoRecords[currentRecord].defaultProfile;
      initRecord();
    }
  }

  function initRecord() {
    const record = mongoRecords[currentRecord];

    timeInput = new Date(record.startDate).toTimeString().slice(0, 5);
    dateInput = new Date(record.startDate).toISOString().slice(0, 10);

    initProfile();
  }

  function initProfile() {
    const record = mongoRecords[currentRecord];
    c_profile = record.store[currentProfile] || { ...defaultProfile };

    // Update form fields
    profileNameInput = currentProfile;
    selectedTimezone = c_profile.timezone || "";
    diaInput = c_profile.dia || "";
    carbsHrInput = c_profile.carbs_hr || "";
    perGIValues = c_profile.perGIvalues || false;
    carbsHrHigh = c_profile.carbs_hr_high || "";
    carbsHrMedium = c_profile.carbs_hr_medium || "";
    carbsHrLow = c_profile.carbs_hr_low || "";
    delayHigh = c_profile.delay_high || "";
    delayMedium = c_profile.delay_medium || "";
    delayLow = c_profile.delay_low || "";
  }

  function calculateTotalBasal() {
    if (!c_profile.basal || !Array.isArray(c_profile.basal)) return 0;

    let total = 0;
    for (let i = 0; i < c_profile.basal.length; i++) {
      const time1 = c_profile.basal[i].time;
      const time2 = c_profile.basal[(i + 1) % c_profile.basal.length].time;
      const value = c_profile.basal[i].value;
      total += (timeDiffMinutes(time1, time2) * value) / 60;
    }
    return Math.round(total * 1000) / 1000;
  }

  function timeDiffMinutes(time1, time2) {
    const minutes1 = toMinutesFromMidnight(time1);
    const minutes2 = toMinutesFromMidnight(time2);
    if (minutes2 <= minutes1) {
      return 24 * 60 - minutes1 + minutes2;
    }
    return minutes2 - minutes1;
  }

  function toMinutesFromMidnight(time) {
    const split = time.split(":");
    return parseInt(split[0]) * 60 + parseInt(split[1]);
  }

  function addInterval(arrayName, index) {
    if (!c_profile[arrayName]) c_profile[arrayName] = [];
    c_profile[arrayName].splice(index, 0, { time: "00:00", value: 0 });
    c_profile = { ...c_profile };
    dirty = true;
  }

  function removeInterval(arrayName, index) {
    if (c_profile[arrayName] && c_profile[arrayName].length > 1) {
      c_profile[arrayName].splice(index, 1);
      c_profile[arrayName][0].time = "00:00";
      c_profile = { ...c_profile };
      dirty = true;
    }
  }

  function addTargetInterval(index) {
    c_profile.target_low.splice(index, 0, { time: "00:00", value: 80 });
    c_profile.target_high.splice(index, 0, { time: "00:00", value: 120 });
    c_profile = { ...c_profile };
    dirty = true;
  }

  function removeTargetInterval(index) {
    if (c_profile.target_low.length > 1) {
      c_profile.target_low.splice(index, 1);
      c_profile.target_high.splice(index, 1);
      c_profile.target_low[0].time = "00:00";
      c_profile.target_high[0].time = "00:00";
      c_profile = { ...c_profile };
      dirty = true;
    }
  }

  function updateProfile() {
    // Update c_profile with form values
    c_profile.dia = parseFloat(diaInput) || 3;
    c_profile.carbs_hr = parseInt(carbsHrInput) || 30;
    c_profile.perGIvalues = perGIValues;
    c_profile.carbs_hr_high = parseInt(carbsHrHigh) || 30;
    c_profile.carbs_hr_medium = parseInt(carbsHrMedium) || 30;
    c_profile.carbs_hr_low = parseInt(carbsHrLow) || 30;
    c_profile.delay_high = parseInt(delayHigh) || 20;
    c_profile.delay_medium = parseInt(delayMedium) || 20;
    c_profile.delay_low = parseInt(delayLow) || 20;
    c_profile.timezone = selectedTimezone;

    dirty = true;
  }
  async function saveProfile() {
    if (!confirm("Save current record?")) return;

    updateProfile();

    const record = mongoRecords[currentRecord];
    record.startDate = new Date(`${dateInput}T${timeInput}`).toISOString();
    record.created_at = new Date().toISOString();
    record.srvModified = new Date().getTime();
    record.defaultProfile = currentProfile;

    const adjustedRecord = { ...record };

    // Clean up profile data
    for (const key in adjustedRecord.store) {
      const profile = adjustedRecord.store[key];
      if (!profile.perGIvalues) {
        delete profile.perGIvalues;
        delete profile.carbs_hr_high;
        delete profile.carbs_hr_medium;
        delete profile.carbs_hr_low;
        delete profile.delay_high;
        delete profile.delay_medium;
        delete profile.delay_low;
      }
    }

    try {
      status = "Saving profile...";
      showForm = false;
      isSubmitting = true;

      // Use form submission to leverage +page.server.ts
      const formData = new FormData();
      formData.append("profileData", JSON.stringify(adjustedRecord));

      const response = await fetch("?/save", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        if (result.type === "success") {
          status = "Profile saved successfully";
          dirty = false;
        } else {
          status = result.data?.error || "Error saving profile";
        }
      } else {
        status = "Error saving profile";
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      status = "Error saving profile";
    } finally {
      showForm = true;
      isSubmitting = false;
    }
  }

  function addRecord() {
    if (dirty && !confirm("Save current record before switching to new?"))
      return;

    mongoRecords.push({
      startDate: new Date().toISOString(),
      defaultProfile: "Default",
      store: {
        Default: { ...defaultProfile },
      },
    });

    currentRecord = mongoRecords.length - 1;
    currentProfile = "Default";
    initRecord();
    dirty = true;
  }

  function removeRecord() {
    if (mongoRecords.length > 1 && confirm("Delete record?")) {
      mongoRecords.splice(currentRecord, 1);
      currentRecord = Math.min(currentRecord, mongoRecords.length - 1);
      currentProfile = mongoRecords[currentRecord].defaultProfile;
      initRecord();
      dirty = false;
    }
  }

  function cloneRecord() {
    if (dirty && !confirm("Save current record before switching to new?"))
      return;

    const clonedRecord = { ...mongoRecords[currentRecord] };
    delete clonedRecord._id;
    delete clonedRecord.srvModified;
    delete clonedRecord.srvCreated;
    delete clonedRecord.identifier;
    delete clonedRecord.mills;

    clonedRecord.startDate = new Date().toISOString();
    mongoRecords.push(clonedRecord);

    currentRecord = mongoRecords.length - 1;
    currentProfile = mongoRecords[currentRecord].defaultProfile;
    initRecord();
    dirty = true;
  }

  function addProfile() {
    const record = mongoRecords[currentRecord];
    let newName = "New profile";
    while (record.store[newName]) {
      newName += "1";
    }

    record.store[newName] = { ...defaultProfile };
    currentProfile = newName;
    initProfile();
    dirty = true;
  }

  function removeProfile() {
    const record = mongoRecords[currentRecord];
    const availableProfiles = Object.keys(record.store).filter(
      (key) => key !== currentProfile
    );

    if (availableProfiles.length > 0) {
      delete record.store[currentProfile];
      currentProfile = availableProfiles[0];
      initProfile();
      dirty = true;
    }
  }

  function cloneProfile() {
    updateProfile();
    const record = mongoRecords[currentRecord];
    let newName = `${profileNameInput} (copy)`;
    while (record.store[newName]) {
      newName += "1";
    }

    record.store[newName] = { ...record.store[currentProfile] };
    currentProfile = newName;
    initProfile();
    dirty = true;
  }
  // Computed values
  let totalBasal = $derived(calculateTotalBasal());
</script>

<svelte:head>
  <title>Profile Editor - Nightscout</title>
</svelte:head>

<div class="min-h-screen bg-gray-100 py-8">
  <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="bg-white shadow-lg rounded-lg">
      <ProfileHeader {status} />

      {#if showForm}
        <form
          method="POST"
          action="?/save"
          use:enhance={() => {
            return async ({ update, result }) => {
              isSubmitting = true;
              status = "Saving profile...";
              showForm = false;

              await update();

              if (result.type === "success") {
                status = "Profile saved successfully";
                dirty = false;
              } else {
                status = result.data?.error || "Error saving profile";
              }

              isSubmitting = false;
              showForm = true;
            };
          }}
          class="p-6 space-y-8"
        >
          <!-- General Settings -->
          <div class="bg-gray-50 rounded-lg p-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">
              General Profile Settings
            </h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span class="font-medium">Title:</span>
                Nightscout
              </div>
              <div>
                <span class="font-medium">Units:</span>
                mg/dL
              </div>
              <div>
                <span class="font-medium">Date format:</span>
                24h
              </div>
            </div>
          </div>

          <DatabaseRecords
            bind:currentRecord
            bind:dateInput
            bind:timeInput
            {mongoRecords}
            onUpdate={updateProfile}
            onRecordChange={initRecord}
            onAddRecord={addRecord}
            onRemoveRecord={removeRecord}
            onCloneRecord={cloneRecord}
          />

          <StoredProfiles
            bind:currentProfile
            bind:profileNameInput
            {mongoRecords}
            {currentRecord}
            onProfileChange={initProfile}
            onUpdate={updateProfile}
            onAddProfile={addProfile}
            onRemoveProfile={removeProfile}
            onCloneProfile={cloneProfile}
          />

          <div class="mt-6 space-y-6">
            <ProfileSettings
              bind:selectedTimezone
              bind:diaInput
              bind:carbsHrInput
              bind:perGIValues
              bind:carbsHrHigh
              bind:carbsHrMedium
              bind:carbsHrLow
              bind:delayHigh
              bind:delayMedium
              bind:delayLow
              {timezones}
              onUpdate={updateProfile}
            />

            <IntervalEditor
              intervals={c_profile.basal || []}
              title="Basal Rates [U/hr]"
              unit="Value"
              step="0.01"
              {totalBasal}
              onAddInterval={(index) => addInterval("basal", index)}
              onRemoveInterval={(index) => removeInterval("basal", index)}
              onUpdate={updateProfile}
            />

            <IntervalEditor
              intervals={c_profile.carbratio || []}
              title="Insulin to Carb Ratio (I:C) [g]"
              unit="Value"
              step="0.1"
              onAddInterval={(index) => addInterval("carbratio", index)}
              onRemoveInterval={(index) => removeInterval("carbratio", index)}
              onUpdate={updateProfile}
            />

            <IntervalEditor
              intervals={c_profile.sens || []}
              title="Insulin Sensitivity Factor (ISF) [mg/dL/U]"
              unit="Value"
              step="1"
              onAddInterval={(index) => addInterval("sens", index)}
              onRemoveInterval={(index) => removeInterval("sens", index)}
              onUpdate={updateProfile}
            />

            <TargetBGEditor
              targetLow={c_profile.target_low || []}
              targetHigh={c_profile.target_high || []}
              onAddInterval={addTargetInterval}
              onRemoveInterval={removeTargetInterval}
              onUpdate={updateProfile}
            />
          </div>
          <!-- Save Button -->
          <div class="flex justify-end">
            <Button type="submit" disabled={isSubmitting} size="lg">
              <Save class="w-4 h-4" />
              Save Profile
            </Button>
          </div>
        </form>
      {:else}
        <div class="p-6 text-center">
          <div
            class="animate-spin inline-block w-6 h-6 border-[3px] border-current border-t-transparent text-blue-600 rounded-full"
          ></div>
          <p class="mt-2 text-gray-600">Saving profile...</p>
        </div>
      {/if}
    </div>
  </div>
</div>
