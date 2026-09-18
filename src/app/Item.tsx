import {Layout} from './type.ts';
import {svg_file_url} from './helper.ts';
import './Item.css';

export function Item(props: { layout: Layout, onOpen: () => void, showGroup: boolean, showAuthor: boolean }) {
	const {layout, onOpen, showGroup, showAuthor} = props;

	return (
		<div
			className="item" onClick={onOpen} tabIndex={0}
			onKeyDown={event => {
				if (event.key === 'Enter') {
					event.stopPropagation()
					event.preventDefault();
					onOpen();
				}
			}}
		>
			<div className={`head${showGroup ? '' : ' head-end'}`}>
				{showGroup && <span className="group">{layout.group}</span>}
				<span className="tiles">{layout.tiles}</span>
			</div>
			<div className="image"><img loading="lazy" src={svg_file_url(layout)} alt={layout.name}/></div>
			<h3 className="name">{layout.name}</h3>
			{showAuthor && (
				<p className="by">
					<svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
						<path fill="currentColor" d="M12 12a5 5 0 1 0-5-5a5 5 0 0 0 5 5m0 2c-4 0-8 2-8 5v2h16v-2c0-3-4-5-8-5"/>
					</svg>
					{layout.by}
				</p>
			)}
		</div>
	);
}
