import {Layout} from './type.ts';
import {svg_file_url} from './helper.ts';
import './Item.css';

export function Item(props: { layout: Layout, onOpen: () => void }) {
	const {layout,  onOpen} = props;

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
			<h3 className="name">{layout.name}</h3>
			<a className="image"><img loading="lazy" src={svg_file_url(layout)} alt={layout.name}/></a>
			<p className="count">{layout.tiles} stones</p>
			<p className="by">{layout.by}</p>
		</div>
	);
}
