import {Layout, LayoutFormat} from './type.ts';

export function svg_file_url(layout: Layout): string {
	return data_file_url(layout, 'svg');
}

export function data_file_url(layout: Layout, format: LayoutFormat): string {
	return `./boards/${layout.path}/${layout.filename}.${format}`;
}

export function play(layout: Layout) {
	const data = {
		mah: '1.0',
		boards: [
			{
				id: layout.id,
				name: layout.name,
				by: layout.by ? layout.by : undefined,
				cat: 'Mahseum',
				map: JSON.parse(layout.data)
			}
		]
	};
	const url = 'https://ffalt.github.io/mah/?mah=' + encodeURIComponent(btoa(JSON.stringify(data)));
	window.open(url, '_blank', 'noopener');
}
