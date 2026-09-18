import {data} from './data.ts';

export interface CollectionInfo {
	name: string;
	count: number;
	authors: Array<string>;
	site: string;
}

const map = new Map<string, CollectionInfo>();

for (const layout of data) {
	const info = map.get(layout.collection) ?? {name: layout.collection, count: 0, authors: [], site: layout.site};
	info.count++;
	const author = layout.by || 'unknown';
	if (!info.authors.includes(author)) {
		info.authors.push(author);
	}
	map.set(layout.collection, info);
}

export const COLLECTIONS = map;
