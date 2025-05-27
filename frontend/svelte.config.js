import adapter from '@sveltejs/adapter-node';

export default {
	kit: {
		adapter: adapter({
			// Output directory for the built server
			out: 'build',
			// Enable precompression
			precompress: true
		})
	}
};
