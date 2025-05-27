<script lang="ts">
  interface Props {
    status: string;
  }

  let { status }: Props = $props();
</script>

<div class="px-6 py-4 border-b border-gray-200">
  <h1 class="text-2xl font-bold text-gray-900">Profile Editor</h1>
  <div class="mt-2 text-sm text-gray-600">
    <span class="font-medium">Status:</span>
    <span class="text-blue-600">{status}</span>
  </div>
</div>
