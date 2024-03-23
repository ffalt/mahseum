export interface Layout {
	id: string;
	name: string;
	by?: string;
	tiles: number;
	data: string;
	site: string;
	solvable: boolean;
	source: string;
	filename: string;
	path: string;
	group: string;
	selected: boolean;
}

export type LayoutFormat = 'svg' | 'mah' | 'lay' | 'layout';
