// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	site: 'https://airhunter.github.io',

	integrations: [
		starlight({
			title: 'Under Southern Skies',
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/airhunter/' }],
			sidebar: [
				{
					label: 'Guides',
					items: [
						// Each item here is one entry in the navigation menu.
						{ label: 'Example Guide', slug: 'guides/example' },
					],
				},
				{
					label: 'Reference',
					autogenerate: { directory: 'reference' },
				},
				{
					label: 'Archive',
					collapsed: true,
					items: [
						{ label: '2025', collapsed: true, autogenerate: { directory: 'archive/2025' } },
						{ label: '2024', collapsed: true, autogenerate: { directory: 'archive/2024' } },
						{ label: '2023', collapsed: true, autogenerate: { directory: 'archive/2023' } },
						{ label: '2022', collapsed: true, autogenerate: { directory: 'archive/2022' } },
						{ label: '2021', collapsed: true, autogenerate: { directory: 'archive/2021' } },
						{ label: '2010', collapsed: true, autogenerate: { directory: 'archive/2010' } },
						{ label: '2009', collapsed: true, autogenerate: { directory: 'archive/2009' } },
						{ label: '2008', collapsed: true, autogenerate: { directory: 'archive/2008' } },
						{ label: '2007', collapsed: true, autogenerate: { directory: 'archive/2007' } },
						{ label: '2006', collapsed: true, autogenerate: { directory: 'archive/2006' } },
						{ label: '2005', collapsed: true, autogenerate: { directory: 'archive/2005' } },
						{ label: '2004', collapsed: true, autogenerate: { directory: 'archive/2004' } },
					],
				},
			],
		}),
	],
});
