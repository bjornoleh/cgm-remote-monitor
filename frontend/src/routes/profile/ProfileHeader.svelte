<script lang="ts">
  import { Card, CardContent } from "$lib/components/ui/card";
  import { Badge } from "$lib/components/ui/badge";

  interface Props {
    status: string;
  }

  let { status }: Props = $props();
</script>

<Card>
  <CardContent class="p-6">
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-bold">Profile Editor</h1>
      <div class="flex items-center space-x-2">
        <span class="text-sm font-medium">Status:</span>
        <Badge variant="secondary">{status}</Badge>
      </div>
    </div>
  </CardContent>
</Card>
