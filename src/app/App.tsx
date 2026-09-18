import {useEffect, useState} from 'react';
import {data} from './data.ts';
import {Layout} from './type.ts';
import {Overlay} from './Overlay.tsx';
import {Item} from './Item.tsx';
import './App.css';

const GROUPS: Array<[string, number]> = data
	.map(l => l.group)
	.filter((item, i, ar) => ar.indexOf(item) === i)
	.sort()
	.map(group => [group, data.filter(it => it.group === group).length]);

const AUTHORS: Array<[string, number]> = data
	.map(l => l.by || 'unknown')
	.filter((item, i, ar) => ar.indexOf(item) === i)
	.sort()
	.map(author => [author, data.filter(it => it.by === author).length]);

const TILES_COUNT: Array<[string, number]> = data
	.map(l => l.tiles)
	.filter((item, i, ar) => ar.indexOf(item) === i)
	.sort((a, b) => a - b)
	.map(nr => [nr.toString(), data.filter(it => it.tiles === nr).length]);

const layouts = data.map(l => ({...l, selected: false}))

function App() {
	const [opened, setOpened] = useState<Layout | undefined>();
	const [filtered, setFiltered] = useState<Array<Layout>>([]);
	const [filterText, setFilterText] = useState<string | undefined>();
	const [filterGroup, setFilterGroup] = useState<string | undefined>();
	const [filterCount, setFilterCount] = useState<string | undefined>();
	const [filterAuthor, setFilterAuthor] = useState<string | undefined>();
	const [dedupe, setDedupe] = useState<boolean>(true);
	const [geocitiesOn, setGeocitiesOn] = useState<boolean>(false);
	const [geocitiesHover, setGeocitiesHover] = useState<boolean>(false);
	const [visitorNumber] = useState<number>(() => {
		try {
			const next = Number(localStorage.getItem('geocitiesVisitor') || '13370') + 1;
			localStorage.setItem('geocitiesVisitor', String(next));
			return next;
		} catch {
			return 13371;
		}
	});
	const geocities = geocitiesOn || geocitiesHover;

	useEffect(() => {
		let list = layouts;
		if (filterText && filterText.length > 0) {
			list = list.filter(layout => layout.name.toLowerCase().includes(filterText));
		}
		if (filterGroup && filterGroup.length > 0) {
			list = list.filter(layout => layout.group === filterGroup);
		}
		if (filterCount && filterCount.length > 0) {
			list = list.filter(layout => layout.tiles.toString() === filterCount);
		}
		if (filterAuthor && filterAuthor.length > 0) {
			list = list.filter(layout => (layout.by || 'unknown') === filterAuthor);
		}
		if (dedupe) {
			const seen = new Set<string>();
			list = list.filter(layout => {
				if (seen.has(layout.id)) {
					return false;
				}
				seen.add(layout.id);
				return true;
			});
		}
		setFiltered(list);
	}, [filterText, filterGroup, filterAuthor, filterCount, dedupe])

	return (
		<div className={geocities ? 'geocities' : undefined}>
			<header>
				<div className="header-content">
					<div
						className="title"
						onClick={() => setGeocitiesOn(on => !on)}
						onMouseEnter={() => setGeocitiesHover(true)}
						onMouseLeave={() => setGeocitiesHover(false)}
					>
						<i className="waving"></i> <span>Mahjong Solitaire Layout Museum</span> <i className="waving"></i>
					</div>
					{geocities && (
						<div className="geocities-marquee">
							<span>🚧 UNDER CONSTRUCTION 🚧 BEST VIEWED IN NETSCAPE NAVIGATOR AT 800x600 🚧 YOU ARE VISITOR #{visitorNumber} 🚧 SIGN MY GUESTBOOK 🚧</span>
						</div>
					)}
					<div className="header-filters">
						<div className="filter-field filter-search">
							<svg className="filter-icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
								<path fill="currentColor" d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19zm-6 0A4.5 4.5 0 1 1 14 9.5A4.5 4.5 0 0 1 9.5 14"/>
							</svg>
							<input type="text" placeholder="Search for name…" onChange={e => setFilterText(e.target.value.toLowerCase())}/>
						</div>
						<div className="filter-field">
							<select defaultValue="" onChange={e => setFilterGroup(e.target.value)}>
								<option value="">All groups</option>
								{GROUPS.map((entry => (
									<option key={entry[0]} value={entry[0]}>{entry[0]} ({entry[1]})</option>
								)))}
							</select>
						</div>
						<div className="filter-field">
							<select defaultValue="" onChange={e => setFilterAuthor(e.target.value)}>
								<option value="">All authors</option>
								{AUTHORS.map((entry => (
									<option key={entry[0]} value={entry[0]}>{entry[0]} ({entry[1]})</option>
								)))}
							</select>
						</div>
						<div className="filter-field">
							<select defaultValue="" onChange={e => setFilterCount(e.target.value)}>
								<option value="">All Tiles Count</option>
								{TILES_COUNT.map(entry => (
									<option key={entry[0]} value={entry[0]}>{entry[0]} ({entry[1]})</option>
								))}
							</select>
						</div>
						<label className="filter-toggle">
							<input type="checkbox" checked={dedupe} onChange={e => setDedupe(e.target.checked)}/>
							<span className="filter-toggle-track"><span className="filter-toggle-thumb"></span></span>
							<span className="filter-toggle-label">Hide duplicates</span>
						</label>
						<div className="filter-count">
							{filtered.length} layouts
						</div>
					</div>
					{geocities && (
						<div className="geocities-badges">
							<span className="badge">🖥️ BEST VIEWED IN NETSCAPE</span>
							<span className="badge">🐹 HAMSTER-POWERED SERVER</span>
							<span className="badge">🔥 100% ORGANIC HTML</span>
						</div>
					)}
				</div>
			</header>
			<div className="main">
				<div className="layouts">
					{filtered.map((layout: Layout) => (
						<Item
							key={`${layout.path}/${layout.filename}`}
							layout={layout}
							onOpen={() => setOpened(layout)}
							showGroup={!filterGroup}
							showAuthor={!filterAuthor}
						></Item>
					))}
				</div>
			</div>
			{opened && <Overlay layout={opened} requestClose={() => setOpened(undefined)}/>}
		</div>
	);
}

export default App
