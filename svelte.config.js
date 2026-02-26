import adapter from '@sveltejs/adapter-static';
import { env } from 'process';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			fallback: '404.html'
		}),
		paths: {
			base: env.NODE_ENV === 'production' ? '/brad-myers-advisee-tree' : ''
		}
	}
};

export default config;
