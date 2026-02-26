<script>
	import { onMount } from 'svelte';
	import * as d3 from 'd3';
	import { base } from '$app/paths';

	const margin = { top: 20, right: 120, bottom: 20, left: 140 };
	const width = 1400 - margin.right - margin.left;
	const duration = 500;
	const pause = 200;

	const purple = '#845fb4';
	const darkPurple = '#542988';

	let blend = $state(0);
	let siblingGap = $state(1);
	let groupGap = $state(3);
	let colSpacing = $state(200);
	let treeHeight = $state(3600);
	let nodeRadius = $state(4.25);
	let edgeThickness = $state(2.5);
	let showNodes = $state(true);
	let showLabels = $state(true);
	let activeGen = $state(1);
	let playing = $state(false);

	let blendPct = $derived(Math.round(blend * 100));

	let svgEl;
	let svg;
	let root;
	let idCounter = 0;
	let numStudents = $state(0);
	let numGenerations = $state(0);

	const treeLayout = d3.tree();

	const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

	function collapse(d) {
		if (d.children) {
			d._children = d.children;
			d._children.forEach(collapse);
			d.children = null;
		}
	}

	function expand(d) {
		if (d._children) {
			d.children = d._children;
			d._children = null;
		}
	}

	function reverseData(node) {
		if (node.children) {
			node.children.reverse();
			node.children.forEach(reverseData);
		}
		if (node._children) {
			node._children.reverse();
			node._children.forEach(reverseData);
		}
	}

	function showDepthN(node, n) {
		if (node.children) {
			if (node.depth < n) {
				node.children.forEach((d) => showDepthN(d, n));
			} else {
				collapse(node);
			}
			update(node);
		} else {
			if (node.depth < n) {
				expand(node);
				if (node.children) {
					update(node);
					node.children.forEach((d) => showDepthN(d, n));
				}
			}
		}
	}

	function connector(d) {
		const mx = (d.y + d.parent.y) / 2;
		return `M${d.y},${d.x}C${mx},${d.x} ${mx},${d.parent.x} ${d.parent.y},${d.parent.x}`;
	}

	function getFontSize(depth, maxDepth) {
		if (depth === 0) return '20px';
		if (maxDepth <= 2 && depth === 1) return '18px';
		if (maxDepth <= 2 && depth === 2) return '16px';
		return '12px';
	}

	function update(source, dur = duration) {
		d3.selectAll('.node').interrupt().selectAll('*').interrupt();

		const h = treeHeight - margin.top - margin.bottom;
		treeLayout.size([h, width]);

		const nodes = treeLayout(root).descendants();
		const links = nodes.slice(1);

		nodes.forEach((d) => {
			d.y = d.depth * colSpacing;
		});

		// Re-pack each depth column with group-aware spacing.
		// Siblings stay close together; nodes from different parents get extra gap.
		d3.group(nodes, (d) => d.depth).forEach((col) => {
			const sorted = col.slice().sort((a, b) => a.x - b.x);
			const n = sorted.length;
			if (n === 1) return;

			// Assign slot indices, inserting extra slots between groups
			const slots = [0];
			for (let i = 1; i < n; i++) {
				const gap = sorted[i].parent === sorted[i - 1].parent ? siblingGap : groupGap;
				slots.push(slots[i - 1] + gap);
			}
			const totalSlots = slots[n - 1];
			const padding = groupGap;

			sorted.forEach((d, i) => {
				const repacked = (slots[i] + padding) * (h / (totalSlots + padding * 2));
				d.x = d.x * (1 - blend) + repacked * blend;
			});
		});

		const maxDepth = d3.max(nodes, (d) => d.depth);

		// Nodes
		const node = svg.selectAll('g.node').data(nodes, (d) => d.id || (d.id = ++idCounter));

		const nodeEnter = node
			.enter()
			.append('g')
			.attr('class', 'node')
			.attr('transform', () => `translate(${source.y0},${source.x0})`)
			.on('click', (event, d) => {
				if (d.children) {
					d._children = d.children;
					d.children = null;
				} else {
					d.children = d._children;
					d._children = null;
				}
				update(d);
			});

		nodeEnter.append('circle').attr('r', 1e-6).style('fill', purple);

		nodeEnter
			.append('text')
			.attr('x', (d) => (d.children || d._children ? -10 : 10))
			.attr('dy', '.35em')
			.attr('text-anchor', (d) => (d.children || d._children ? 'end' : 'start'))
			.text((d) => d.data.name)
			.style('fill-opacity', 1e-6)
			.style('font-size', (d) => getFontSize(d.depth, maxDepth));

		const nodeUpdate = node
			.merge(nodeEnter)
			.transition()
			.duration(dur)
			.attr('transform', (d) => `translate(${d.y},${d.x})`)
			.on('end', (d) => {
				d.x0 = d.x;
				d.y0 = d.y;
			});

		nodeUpdate
			.select('circle')
			.attr('r', nodeRadius)
			.style('fill', purple)
			.style('stroke', (d) => (d._children ? darkPurple : '#ffffff'))
			.style('stroke-width', (d) => (d._children ? '4' : '0'));

		nodeUpdate
			.select('text')
			.style('fill-opacity', 1)
			.style('font-size', (d) => getFontSize(d.depth, maxDepth));

		node
			.exit()
			.interrupt()
			.transition()
			.duration(dur)
			.attr('transform', () => `translate(${source.y},${source.x})`)
			.remove()
			.select('circle')
			.attr('r', 1e-6);

		node.exit().select('text').style('fill-opacity', 1e-6);

		// Links
		const link = svg.selectAll('path.link').data(links, (d) => `${d.id}->${d.parent.id}`);

		const linkEnter = link
			.enter()
			.insert('path', 'g')
			.attr('class', 'link')
			.style('stroke-width', edgeThickness + 'px')
			.attr('d', () => {
				const o = { x: source.x0, y: source.y0, parent: { x: source.x0, y: source.y0 } };
				return connector(o);
			});

		link.merge(linkEnter).interrupt().transition().duration(dur).attr('d', connector).style('stroke-width', edgeThickness + 'px');

		link
			.exit()
			.interrupt()
			.transition()
			.duration(dur)
			.attr('d', () => {
				const o = { x: source.x, y: source.y, parent: { x: source.x, y: source.y } };
				return connector(o);
			})
			.remove();
	}

	function setGen(n) {
		activeGen = n;
		showDepthN(root, n - 1);
	}

	async function play() {
		if (playing) return;
		playing = true;
		for (let g = 1; g <= numGenerations; g++) {
			setGen(g);
			if (g < numGenerations) await sleep(duration + pause);
		}
		playing = false;
	}

	onMount(async () => {
		svg = d3
			.select(svgEl)
			.append('g')
			.attr('transform', `translate(${margin.left},${margin.top})`);

		const data = await d3.csv(`${base}/data.csv`);

		root = d3.stratify().id((d) => d.id).parentId((d) => d.parent_id)(data);

		numStudents = root.descendants().length - 1; // exclude Brad Myers
		numGenerations = d3.max(root.descendants(), (d) => d.depth) + 1;

		root.each((d) => {
			d.name = d.id;
			d.id = idCounter++;
		});

		root.x0 = (treeHeight - margin.top - margin.bottom) / 2;
		root.y0 = 0;

		reverseData(root);
		setGen(1);
		update(root);
		play();
	});

	$effect(() => {
		const b = blend;
		const sg = siblingGap;
		const gg = groupGap;
		const cs = colSpacing;
		const th = treeHeight;
		const nr = nodeRadius;
		const et = edgeThickness;
		if (!root) return;
		update(root, 0);
	});
</script>

<svelte:head>
	<title>Brad Myers's Advisee Tree</title>
</svelte:head>

<div class="mx-auto max-w-[1600px] px-4 py-4">
	<h1 class="mb-2 text-2xl font-bold">Brad Myers's Advisee Tree</h1>

	<p class="mb-2">
		At the <a class="text-purple-700" href="https://chi2017.acm.org/">ACM CHI 2017</a>
		conference,
		<a class="text-purple-700" href="http://www.cs.cmu.edu/~bam/">Brad Myers</a> was awarded
		the
		<a
			class="text-purple-700"
			href="https://sigchi.org/awards/sigchi-award-recipients/2017-sigchi-awards/#brad-a-myers"
			>CHI Lifetime Research Award</a
		>.
		<br />
		In his keynote talk, he presented his advisee tree &mdash; all <b>{numGenerations}</b> generations, totaling
		<b>{numStudents}</b> students! (updated Spring 2026)
	</p>

	<p class="mb-2">
		The <a
			class="text-purple-700"
			href="https://docs.google.com/document/d/1NKheBhylXdkY_lmcV1QEP7CCLiwpMjE2L-KnWWh0Nvo/edit#heading=h.h4g51lbmhlnj"
			>original hierarchical document</a
		> with affiliations, and the
		<a
			class="text-purple-700"
			href="https://github.com/fredhohman/brad-myers-advisee-tree/"
			>visualized data</a
		>, are available.
	</p>

	<p class="mb-4 italic text-gray-400">
		Designed by <a class="text-purple-700" href="http://fredhohman.com">Fred Hohman</a> (gen.
		5), <a class="text-purple-700" href="http://www.cc.gatech.edu/~rpienta3/">Robert Pienta</a
		> (gen. 5), and
		<a class="text-purple-700" href="http://www.cc.gatech.edu/~dchau/">Polo Chau</a> (gen. 4).
	</p>

	<div class="mb-3 flex flex-wrap items-center gap-4">
		<div class="flex items-center gap-1">
			<span class="font-bold">Generation:</span>
			{#each Array.from({ length: numGenerations }, (_, i) => i + 1) as g}
				<button
					onclick={() => setGen(g)}
					style="background-color: {activeGen === g ? purple : '#fff'}; color: {activeGen === g ? '#fff' : purple}; border: 1px solid {purple};"
					class="cursor-pointer rounded px-2 py-0.5 transition-colors"
				>
					{g}
				</button>
			{/each}
			<span class="font-bold">&nbsp;or&nbsp;</span>
			<button
				onclick={play}
				style="background-color: #fff; color: {purple}; border: 1px solid {purple};"
				class="cursor-pointer rounded px-2 py-0.5"
			>
				Play ▶
			</button>
		</div>

		<details>
			<summary class="cursor-pointer font-bold text-gray-400">Options</summary>
			<div class="mt-2 flex flex-wrap items-center gap-4">
				<div class="flex items-center gap-2">
					<span class="font-bold">Spread:</span>
					<input
						type="range"
						min="0"
						max="100"
						value={blendPct}
						oninput={(e) => (blend = +e.target.value / 100)}
						class="w-40 align-middle"
					/>
					<span>{blendPct}%</span>
				</div>

				<div class="flex items-center gap-2">
					<span class="font-bold">Sibling gap:</span>
					<input
						type="range"
						min="1"
						max="10"
						step="0.5"
						value={siblingGap}
						oninput={(e) => (siblingGap = +e.target.value)}
						class="w-40 align-middle"
					/>
					<span>{siblingGap}x</span>
				</div>

				<div class="flex items-center gap-2">
					<span class="font-bold">Group gap:</span>
					<input
						type="range"
						min="1"
						max="10"
						step="0.5"
						value={groupGap}
						oninput={(e) => (groupGap = +e.target.value)}
						class="w-40 align-middle"
					/>
					<span>{groupGap}x</span>
				</div>

				<div class="flex items-center gap-2">
					<span class="font-bold">Column spacing:</span>
					<input
						type="range"
						min="100"
						max="400"
						step="10"
						value={colSpacing}
						oninput={(e) => (colSpacing = +e.target.value)}
						class="w-40 align-middle"
					/>
					<span>{colSpacing}px</span>
				</div>

				<div class="flex items-center gap-2">
					<span class="font-bold">Height:</span>
					<input
						type="range"
						min="1000"
						max="8000"
						step="100"
						value={treeHeight}
						oninput={(e) => (treeHeight = +e.target.value)}
						class="w-40 align-middle"
					/>
					<span>{treeHeight}px</span>
				</div>

				<div class="flex items-center gap-2">
					<span class="font-bold">Node size:</span>
					<input
						type="range"
						min="1"
						max="12"
						step="0.25"
						value={nodeRadius}
						oninput={(e) => (nodeRadius = +e.target.value)}
						class="w-40 align-middle"
					/>
					<span>{nodeRadius}</span>
				</div>

				<div class="flex items-center gap-2">
					<span class="font-bold">Edge thickness:</span>
					<input
						type="range"
						min="0.5"
						max="8"
						step="0.25"
						value={edgeThickness}
						oninput={(e) => (edgeThickness = +e.target.value)}
						class="w-40 align-middle"
					/>
					<span>{edgeThickness}</span>
				</div>

				<div class="flex items-center gap-3">
					<span class="font-bold">Show:</span>
					<label class="flex items-center gap-1">
						<input type="checkbox" bind:checked={showNodes} />
						nodes
					</label>
					<label class="flex items-center gap-1">
						<input type="checkbox" bind:checked={showLabels} />
						labels
					</label>
				</div>
			</div>
		</details>
	</div>
</div>

<div class="flex justify-center">
<svg
	bind:this={svgEl}
	class:hide-nodes={!showNodes}
	class:hide-labels={!showLabels}
	width={width + margin.right + margin.left}
	height={treeHeight}
></svg>
</div>

<style>
	:global(.node circle) {
		fill: #542988;
	}

	:global(.node text) {
		font: 12px sans-serif;
		text-shadow:
			0 1px 0 #fff,
			0 -1px 0 #fff,
			1px 0 0 #fff,
			-1px 0 0 #fff;
	}

	:global(.node:hover) {
		cursor: pointer;
	}

	:global(.link) {
		fill: none;
		stroke: #ccc;
		stroke-width: 2.5px;
	}

	:global(.hide-nodes .node circle) {
		display: none;
	}

	:global(.hide-labels .node text) {
		display: none;
	}
</style>
