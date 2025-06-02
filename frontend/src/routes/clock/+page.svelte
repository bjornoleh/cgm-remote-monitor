<script lang="ts">
  import { goto } from "$app/navigation";
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import ClockRenderer from "$lib/components/ClockRenderer.svelte";
  import type { PageData } from "./$types";

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  // Predefined clock faces
  const clockFaces = [
    { id: "clock", name: "Simple Clock", description: "Basic clock display" },
    {
      id: "bgclock",
      name: "BG Clock",
      description: "Clock with blood glucose data",
    },
    {
      id: "clock-color",
      name: "Color Clock",
      description: "Colorful clock display",
    },
    {
      id: "bn0-sg40",
      name: "Large BG",
      description: "Large blood glucose display",
    },
    {
      id: "cy13-sg35-dt14-nl-ar25-nl-ag6",
      name: "Detailed View",
      description: "Detailed clock with all elements",
    },
    {
      id: "simple",
      name: "Simple Display",
      description: "Minimal blood glucose display",
    },
    {
      id: "large",
      name: "Extra Large",
      description: "Very large display with time",
    },
  ];

  // State using runes
  let customFace = $state("");

  function navigateToFace(faceId: string) {
    goto(`/clock?face=${encodeURIComponent(faceId)}`);
  }
</script>

<svelte:head>
  <title>Nightscout Clock{data.face ? ` - ${data.face}` : " Faces"}</title>
</svelte:head>

{#if data.face}
  <!-- Clock Display Mode -->
  <ClockRenderer {data} />
{:else}
  <!-- Clock Selection Mode -->

  <div class="max-w-6xl mx-auto p-8 min-h-screen bg-background text-foreground">
    <h1 class="text-4xl font-bold text-center text-primary mb-8">
      Nightscout Clock Faces
    </h1>
    <p class="text-center text-muted-foreground mb-8">
      Choose a clock face to display:
    </p>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
      {#each clockFaces as face}
        <Card.Root
          class="cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1"
        >
          <Card.Content class="p-6">
            <Card.Title class="text-lg font-semibold text-primary mb-2">
              {face.name}
            </Card.Title>
            <Card.Description class="mb-4">{face.description}</Card.Description>
            <div
              class="font-mono text-sm text-muted-foreground bg-muted px-2 py-1 rounded mb-4"
            >
              {face.id}
            </div>
            <Button onclick={() => navigateToFace(face.id)} class="w-full">
              Open Clock
            </Button>
          </Card.Content>
        </Card.Root>
      {/each}
    </div>
    <Card.Root>
      <Card.Content class="p-6 text-center">
        <Card.Title class="text-2xl font-semibold mb-4">
          Custom Configuration
        </Card.Title>
        <Card.Description class="mb-6">
          Create your own custom clock face:
        </Card.Description>

        <div class="mb-6">
          <Button href="/clock/config" class="inline-flex items-center gap-2">
            🛠️ Open Clock Configuration Tool
          </Button>
        </div>

        <Card.Title class="text-xl font-semibold mt-8 mb-4">
          Or Enter Custom Face Parameter
        </Card.Title>
        <Card.Description class="mb-4">
          Enter a custom face parameter string:
        </Card.Description>
        <div
          class="flex flex-col sm:flex-row gap-2 justify-center items-center"
        >
          <Input
            type="text"
            placeholder="e.g., bn0-sg40"
            bind:value={customFace}
            onkeydown={(e) => e.key === "Enter" && navigateToFace(customFace)}
            class="font-mono flex-1 max-w-xs"
          />
          <Button
            onclick={() => navigateToFace(customFace)}
            disabled={!customFace}
          >
            Go to Custom Face
          </Button>
        </div>
      </Card.Content>
    </Card.Root>
  </div>
{/if}
