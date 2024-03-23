import {Layout} from './type.ts';
import {data_file_url, play, svg_file_url} from './helper.ts';
import './Overlay.css';
import {useCallback, useEffect, useRef, useState} from 'react';

export function Overlay(props: { layout: Layout, requestClose: () => void }) {
	const btnRef = useRef<HTMLButtonElement>(null);
	const {layout, requestClose} = props;
	const [formats, setFormats] = useState<Array<{ path: string, name: string }>>([]);

	const escFunction = useCallback((event: { key: string; }) => {
		if (event.key === 'Escape') {
			requestClose();
		}
	}, [requestClose]);

	useEffect(() => {
		setFormats([
			{path: data_file_url(layout, 'lay'), name: 'Kyodai'},
			{path: data_file_url(layout, 'layout'), name: 'Kmahjongg'},
			{path: data_file_url(layout, 'mah'), name: 'Mah'},
			{path: svg_file_url(layout), name: 'SVG'}
		]);
	}, [layout]);

	useEffect(() => {
		document.addEventListener('keydown', escFunction, false);

		return () => {
			document.removeEventListener('keydown', escFunction, false);
		};
	}, [escFunction]);


	useEffect(() => {
		if (btnRef.current) {
			btnRef.current.focus();
		}
	}, []);

	return (
		<div className="overlay-content-wrapper" onClick={() => requestClose()}>
			<div
				className="overlay-content"
				onMouseDown={e => e.stopPropagation()}
				onClick={e => e.stopPropagation()}>
				<img src={svg_file_url(layout)} loading="lazy" alt={layout.name}/>
				<div className="flex">
					<div className="flex-1">
						<small>Name</small>{layout.name}<br/>
						<small>By</small>{layout.by || 'unknown'}<br/>
						<small>Tiles</small>{layout.tiles}
						<small>Solvable</small>{layout.solvable ? 'yes' : 'impossible'}
					</div>
					<div className="flex-2">
						<button ref={btnRef} className="play" onClick={() => play(layout)}>
							Play with Mah
						</button>
						<small>Download Format</small>
						{formats.map((format) => (
							<a className="save" key={format.path} href={format.path} download>

								{format.name}
							</a>
						))}
						<div className="source">
							<small>Source</small>
							<a href={layout.site} target="_blank" rel="noopener">{layout.group}</a><br/>
							<code>{layout.source}</code>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
