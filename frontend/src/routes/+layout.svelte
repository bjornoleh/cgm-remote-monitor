<script>
	import { page } from '$app/stores';
</script>

<h1>Welcome to SvelteKit with Nightscout</h1>
<p>Visit <a href="https://kit.svelte.dev">kit.svelte.dev</a> to read the documentation</p>
<p>Current route: {$page.route.id}</p>

<slot />
