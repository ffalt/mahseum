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
	.map(group => {
		return [group, data.filter(it => it.group === group).length]
	});

const AUTHORS: Array<[string, number]> = data
	.map(l => l.by || 'unknown')
	.filter((item, i, ar) => ar.indexOf(item) === i)
	.sort()
	.map(author => {
		return [author, data.filter(it => it.by === author).length]
	});

const TILES_COUNT: Array<[string, number]> = data
	.map(l => l.tiles)
	.filter((item, i, ar) => ar.indexOf(item) === i)
	.sort((a, b) => a - b)
	.map(nr => {
		return [nr.toString(), data.filter(it => it.tiles === nr).length]
	});

const layouts = data.map(l => {
	return {...l, selected: false};
})

function App() {
	const [opened, setOpened] = useState<Layout | undefined>();
	const [filtered, setFiltered] = useState<Array<Layout>>([]);
	const [filterText, setFilterText] = useState<string | undefined>();
	const [filterGroup, setFilterGroup] = useState<string | undefined>();
	const [filterCount, setFilterCount] = useState<string | undefined>();
	const [filterAuthor, setFilterAuthor] = useState<string | undefined>();

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
		setFiltered(list);
	}, [filterText, filterGroup, filterAuthor, filterCount])

	return (
		<>
			<header>
				<div className="header-content">
					<div className="title"><i className="waving"></i> <span>Mahjong Solitaire Layout Museum</span> <i className="waving"></i></div>
					<div className="header-filters">
						<input type="text" placeholder="Search for name…" onChange={e => setFilterText(e.target.value.toLowerCase())}/>
						<select defaultValue="" onChange={e => setFilterGroup(e.target.value)}>
							<option value="">All groups</option>
							{GROUPS.map((entry => (
								<option key={entry[0]} value={entry[0]}>{entry[0]} ({entry[1]})</option>
							)))}
						</select>
						<select defaultValue="" onChange={e => setFilterAuthor(e.target.value)}>
							<option value="">All authors</option>
							{AUTHORS.map((entry => (
								<option key={entry[0]} value={entry[0]}>{entry[0]} ({entry[1]})</option>
							)))}
						</select>
						<select  defaultValue="" onChange={e => setFilterCount(e.target.value)}>
							<option value="">All Tiles Count</option>
							{TILES_COUNT.map(entry => (
								<option key={entry[0]} value={entry[0]}>{entry[0]} ({entry[1]})</option>
							))}
						</select>
						<div>
							Layouts: {filtered.length}
						</div>
					</div>
				</div>
			</header>
			<div className="main">
				<div className="layouts">
					{filtered.map((layout: Layout) => (
						<Item key={layout.id} layout={layout} onOpen={() => setOpened(layout)}></Item>
					))}
				</div>
			</div>
			{opened && <Overlay layout={opened} requestClose={() => setOpened(undefined)}/>}
		</>
	);
}

export default App
