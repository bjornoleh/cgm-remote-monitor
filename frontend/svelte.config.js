import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
	preprocess: vitePreprocess(),
	kit: {
		alias: {
			"$lib": './src/lib',
		},
		adapter: adapter({
			// Output directory for the built server
			out: 'build',
			// Enable precompression
			precompress: true,
		}),
	},
};
