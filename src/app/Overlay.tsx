import {Layout} from './type.ts';
import {data_file_url, play, svg_file_url} from './helper.ts';
import {COLLECTIONS} from './collections.ts';
import './Overlay.css';
import {useCallback, useEffect, useRef, useState} from 'react';

export function Overlay(props: { layout: Layout, requestClose: () => void, onPrev?: () => void, onNext?: () => void }) {
	const btnRef = useRef<HTMLButtonElement>(null);
	const {layout, requestClose, onPrev, onNext} = props;
	const [formats, setFormats] = useState<Array<{ path: string, name: string }>>([]);
	const collection = COLLECTIONS.get(layout.collection);
	const contributors = collection && (collection.authors.length > 3
		? `${collection.authors.length} contributors`
		: collection.authors.join(', '));

	const keyFunction = useCallback((event: { key: string; }) => {
		if (event.key === 'Escape') {
			requestClose();
		} else if (event.key === 'ArrowLeft' && onPrev) {
			onPrev();
		} else if (event.key === 'ArrowRight' && onNext) {
			onNext();
		}
	}, [requestClose, onPrev, onNext]);

	useEffect(() => {
		setFormats([
			{path: data_file_url(layout, 'lay'), name: 'Kyodai'},
			{path: data_file_url(layout, 'layout'), name: 'Kmahjongg'},
			{path: data_file_url(layout, 'mah'), name: 'Mah'},
			{path: svg_file_url(layout), name: 'SVG'}
		]);
	}, [layout]);

	useEffect(() => {
		document.addEventListener('keydown', keyFunction, false);

		return () => {
			document.removeEventListener('keydown', keyFunction, false);
		};
	}, [keyFunction]);

	useEffect(() => {
		if (btnRef.current) {
			btnRef.current.focus();
		}
	}, []);

	return (
		<div className="overlay-content-wrapper" onClick={() => requestClose()}>
			{onPrev && (
				<button
					className="overlay-arrow overlay-arrow-prev"
					onClick={e => {
						e.stopPropagation();
						onPrev();
					}}
					aria-label="Previous layout"
				>
					<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
						<path fill="currentColor" d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z"/>
					</svg>
				</button>
			)}
			<div
				className="overlay-content"
				onMouseDown={e => e.stopPropagation()}
				onClick={e => e.stopPropagation()}>
				<button className="overlay-close" onClick={() => requestClose()}>X</button>
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
						{formats.map(format => (
							<a className="save" key={format.path} href={format.path} download>
								{format.name}
							</a>
						))}
						<div className="source">
							<small>Collection</small>
							<a href={layout.site} target="_blank" rel="noopener">{layout.collection}</a>
							{collection && (
								<p className="collection-blurb">
									{collection.count} layout{collection.count === 1 ? '' : 's'} in this collection, by {contributors}
								</p>
							)}
							<small>File source</small>
							<code>{layout.source}</code>
						</div>
					</div>
				</div>
			</div>
			{onNext && (
				<button
					className="overlay-arrow overlay-arrow-next"
					onClick={e => {
						e.stopPropagation();
						onNext();
					}}
					aria-label="Next layout"
				>
					<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
						<path fill="currentColor" d="M8.59 16.59L13.17 12L8.59 7.41L10 6l6 6-6 6z"/>
					</svg>
				</button>
			)}
		</div>
	);
}
