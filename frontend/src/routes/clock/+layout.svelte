<script lang="ts">
  // Props using Svelte 5 syntax
  let { children }: { children: any } = $props();

  // This layout is specifically for clock views and should be full screen
</script>

<svelte:head>
  <style>
    body {
      margin: 0;
      padding: 0;
      overflow: hidden;
    }
  </style>
</svelte:head>

<div class="w-screen h-screen m-0 p-0 overflow-hidden">
  {@render children()}
</div>
