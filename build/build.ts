// noinspection HtmlDeprecatedAttribute
import path from 'path';
import fse from 'fs-extra';
import {Layout, LoadLayout, MahFormat, Mapping} from 'mah/src/app/model/types';
import {cleanImportLayout, convertKmahjongg, convertKyodai} from 'mah/src/app/modules/editor/model/import';
import {generateSVG} from 'mah/src/app/model/layout-svg';
import {expandMapping, mappingToID} from 'mah/src/app/model/mapping';
import {generateExportKmahjongg, generateExportKyodai, generateExportMah} from 'mah/src/app/modules/editor/model/export';
import {statsSolveMapping} from 'mah/src/app/model/tasks';
import yauzl from 'yauzl';

const NEW_FORMAT_SITES = new Set(['gnome-mahjongg', 'xmahjongg', 'green-mahjong']);

type RawImportLayout = Parameters<typeof cleanImportLayout>[0];

function mdLink(href: string, content: string): string {
	return `[${content}](${href}) `;
}

function sortMapping(mapping: Mapping): Mapping {
	return [...mapping].sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]) || (a[2] - b[2]));
}

function convertGnomeMap(data: string): Array<RawImportLayout> {
	const attributes = (line: string): { [key: string]: string } =>
		Object.fromEntries([...line.matchAll(/(\w+)="([^"]*)"/g)].map(m => [m[1], m[2]]));
	const maps: Array<{ name: string; mapping: Array<[number, number, number]> }> = [];
	let current: { name: string; mapping: Array<[number, number, number]> } | undefined;
	let layerZ = 0;
	for (const raw of data.split('\n')) {
		const line = raw.trim();
		if (line.startsWith('<map')) {
			current = {name: attributes(line).name, mapping: []};
			layerZ = 0;
			maps.push(current);
			continue;
		}
		if (!current || line.startsWith('</map')) {
			continue;
		}
		if (line.startsWith('<layer')) {
			layerZ = Number(attributes(line).z ?? 0);
			continue;
		}
		const a = attributes(line);
		const z = a.z === undefined ? layerZ : Number(a.z);
		const push = (x: number, y: number) => current?.mapping.push([z, Math.round(x * 2), Math.round(y * 2)]);
		if (line.startsWith('<tile')) {
			push(Number(a.x), Number(a.y));
		} else if (line.startsWith('<row')) {
			for (let x = Number(a.left); x <= Number(a.right); x++) {
				push(x, Number(a.y));
			}
		} else if (line.startsWith('<column')) {
			for (let y = Number(a.top); y <= Number(a.bottom); y++) {
				push(Number(a.x), y);
			}
		} else if (line.startsWith('<block')) {
			for (let y = Number(a.top); y <= Number(a.bottom); y++) {
				for (let x = Number(a.left); x <= Number(a.right); x++) {
					push(x, y);
				}
			}
		}
	}
	return maps.map(m => ({name: m.name, by: '', cat: 'uncategorized', mapping: m.mapping} as RawImportLayout));
}

function convertXmahjonggPlain(data: string, name: string): RawImportLayout {
	const mapping = data.split('\n')
		.map(line => line.trim())
		.filter(line => line && !line.startsWith('#'))
		.map(line => line.split(/\s+/).map(Number))
		.filter(values => values.length >= 3 && values.every(v => Number.isFinite(v)))
		.map(([row, col, lev]): [number, number, number] => [lev, col, row]);
	return {name, by: '', cat: 'uncategorized', mapping} as RawImportLayout;
}

function humanizeKey(key: string): string {
	return key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, c => c.toUpperCase());
}

function convertGreenMahjong(data: string, key: string): RawImportLayout {
	const extractField = (field: string): Array<number> => {
		const match = data.match(new RegExp(`\\.${field}\\s*=\\s*\\[([\\s\\S]*?)\\];`));
		if (!match) {
			throw new Error(`Missing ${field} in green-mahjong/${key}.js`);
		}
		return match[1].replace(/\/\/[^\n]*/g, '').split(',').map(s => s.trim()).filter(Boolean).map(Number);
	};
	const positionX = extractField('positionX');
	const positionY = extractField('positionY');
	const shift = extractField('shift');
	const mapping: Array<[number, number, number]> = positionX.map((x, index) =>
		[shift[index], Math.round(x * 2), Math.round(positionY[index] * 2)]);
	return {name: humanizeKey(key), by: '', cat: 'uncategorized', mapping} as RawImportLayout;
}

function convertMahjonggBuilder(list: Buffer, data: Buffer): Array<RawImportLayout> {
	// Mahjongg Builder ships its boards as a bitmask blob (games_data) plus an id/offset index
	// (games_list, six bytes per entry: a 3-byte id followed by a 3-byte big-endian offset).
	const uint24 = (buffer: Buffer, offset: number): number => (buffer[offset] << 16) + (buffer[offset + 1] << 8) + buffer[offset + 2];
	// Mahjongg Builder's "The Ziggurat" is a near-duplicate of GNOME's version (one floating
	// tile placed a grid-step differently, so they don't dedupe as the same board) - dropped
	// here in favor of keeping just GNOME's.
	const SKIP = new Set(['The Ziggurat']);
	const layouts: Array<RawImportLayout> = [];
	for (let index = 0; index < list.length; index += 6) {
		let offset = uint24(list, index + 3);
		const nameLength = data[offset++];
		const name = data.subarray(offset, offset + nameLength).toString();
		offset += nameLength;
		const authorLength = data[offset++];
		const by = authorLength ? data.subarray(offset, offset + authorLength).toString() : '';
		offset += authorLength;
		offset++; // win chance
		const layerCount = data[offset++];
		const width = data[offset++];
		const height = data[offset++];
		const rowLength = (width + 7) >> 3;
		const mapping: Array<[number, number, number]> = [];
		for (let z = 0; z < layerCount; z++) {
			for (let y = 0; y < height; y++) {
				const row = data.subarray(offset, offset + rowLength);
				offset += rowLength;
				for (let x = 0; x < width; x++) {
					if (row[x >> 3] & (0x80 >> (x & 7))) {
						mapping.push([z, x, y]);
					}
				}
			}
		}
		if (!SKIP.has(name)) {
			layouts.push({name, by, cat: 'uncategorized', mapping} as RawImportLayout);
		}
	}
	return layouts;
}

const all: Array<ScanBoard> = [];

class ScanBoard {
	formats: Array<string> = [];
	filename: string;
	solvable: boolean = false;
	data: { [format: string]: string } = {}

	constructor(public parent: ScanFile, public layout: Layout) {
		this.filename = layout.name.toLowerCase().replace(/[ /\\!?*.,]/g, ' ').trim()
			.replace(/'/g, '')
			.replace(/ /g, '_')
			.replace(/__/g, '_');
	}

	async saveData(dest: string, format: string, data: string) {
		this.data[format] = data;
		await fse.writeFile(path.join(dest, `${this.filename}${format}`), data);
	}

	async save(dest: string) {
		await fse.ensureDir(dest);
		await this.saveData(dest, '.lay', generateExportKyodai(this.layout));
		await this.saveData(dest, '.layout', generateExportKmahjongg(this.layout));
		await this.saveData(dest, '.mah', generateExportMah(this.layout));
		await this.saveData(dest, '.svg', generateSVG(this.layout.mapping));
		this.formats = ['.lay', '.layout', '.mah'];
	}

	toSectionMarkdown(prefix: string): string {
		const s: Array<string> = [];
		s.push(`${this.layout.name}<br><img src="${prefix}${this.filename}.svg" height="180" width="175"><br>`);
		const sub = [];
		sub.push(this.layout.by || 'unknown');
		if (sub.length > 0) {
			s.push(` <sub>${sub.join(' ')}</sub> `);
		}
		s.push('<br>');
		s.push(this.formats.map(f => mdLink(prefix + this.filename + f, f)).join(' '));
		return s.join('');
	}
}

class ScanFile {
	boards: Array<ScanBoard> = [];

	constructor(public parent: ScanDir, public source: string) {

	}

	async solve(mapping: Mapping): Promise<boolean> {
		return new Promise((resolve) => {
			statsSolveMapping(mapping, 10, () => {
				//nop
			}, result => {
				resolve(result[1] === 0);
			});
		});
	}

	async load(dest: string, filenames: Array<string>): Promise<void> {
		console.log(this.source);
		const data = (await fse.readFile(this.source)).toString();
		return await this.loadData(data, dest, filenames);
	}

	async loadData(data: string, dest: string, filenames: Array<string>): Promise<void> {
		let layouts: Array<LoadLayout>;
		const ext = (this.source.split('.').pop() || '').toLowerCase();
		const site = this.parent.name;
		if (ext === 'lay') {
			layouts = [cleanImportLayout(await convertKyodai(data, path.basename(this.source)))];
		} else if (ext === 'layout') {
			layouts = [cleanImportLayout(await convertKmahjongg(data, path.basename(this.source)))];
			layouts.forEach(l => l.by = 'Alexey Charkov')
		} else if (site === 'gnome-mahjongg') {
			layouts = convertGnomeMap(data).map(l => cleanImportLayout(l));
		} else if (site === 'xmahjongg') {
			layouts = data.startsWith('Kyodai')
				? [cleanImportLayout(await convertKyodai(data, path.basename(this.source)))]
				: [cleanImportLayout(convertXmahjonggPlain(data, path.basename(this.source)))];
		} else if (site === 'green-mahjong') {
			layouts = [cleanImportLayout(convertGreenMahjong(data, path.basename(this.source, '.js')))];
		} else {
			const mah: MahFormat = JSON.parse(data);
			layouts = mah.boards;
		}
		await this.saveLayouts(layouts, dest, filenames);
	}

	async loadBuilderData(list: Buffer, data: Buffer, dest: string, filenames: Array<string>): Promise<void> {
		const layouts = convertMahjonggBuilder(list, data).map(l => cleanImportLayout(l));
		await this.saveLayouts(layouts, dest, filenames);
	}

	async saveLayouts(layouts: Array<LoadLayout>, dest: string, filenames: Array<string>): Promise<void> {
		for (const o of layouts) {
			const mapping: Mapping = expandMapping(o.map || []);
			const solvable = await this.solve(mapping);
			const layout: Layout = {
				id: mappingToID(sortMapping(mapping)),
				name: o.name,
				by: o.by,
				category: '', //o.cat || '',
				mapping,
				custom: true
			};
			const board = new ScanBoard(this, layout);
			board.solvable = solvable;
			let nr = '';
			let i = 1;
			while (filenames.find(b => b === (board.filename + nr))) {
				i++;
				nr = `_${i}`;
			}
			board.filename = board.filename + nr;
			filenames.push(board.filename);
			await board.save(dest);
			this.boards.push(board);
			all.push(board);
		}
	}
}

class ScanDir {
	children: Array<ScanDir> = [];
	files: Array<ScanFile> = [];
	link: string = '';
	groupName: string = '';
	site: string = '';

	constructor(public dest: string, public name: string, public level: number, public parent?: ScanDir) {
	}

	filesToMarkdownTable(prefix: string, header: string): Array<string> {
		const sl: Array<string> = [];
		sl.push(header);
		let sections: Array<{ name: string; content: string }> = [];
		for (const file of this.files) {
			for (const board of file.boards) {
				sections.push({name: board.layout.name, content: board.toSectionMarkdown(prefix)});
			}
		}
		sections = sections.sort((a, b) => a.name.localeCompare(b.name));
		for (let i = 0; i < sections.length; i += 3) {
			let line = '|';
			if (sections[i]) {
				line += sections[i].content;
			}
			if (sections.length > 1) {
				line += '|';
				if (sections[i + 1]) {
					line += sections[i + 1].content;
				}
			}
			if (sections.length > 2) {
				line += '|';
				if (sections[i + 2]) {
					line += sections[i + 2].content;
				}
			}
			line += '|';
			sl.push(line);
		}
		return sl;
	}

	recursiveFilesMarkdown(level: number, parent: string): Array<string> {
		let sl: Array<string> = [];
		for (const sub of this.children) {
			const base = path.basename(sub.dest);
			const base_path = `${parent}${base}/`;
			if (sub.files.length > 0) {
				sl.push(`\n## ${sub.groupName}`);
				if (sub.link) {
					if (sub.site) {
						sl.push(`* Source: \n[${sub.site}](${sub.site})\n`);
					}
					sl.push(`* File Source:  \n<sub>\`\`\`${sub.link}\`\`\`</sub>\n`);
				}
				const header = `\n|${mdLink(path.join(base_path, 'README.md'), base)}||Layouts: ${sub.files.length}|\n|:--:|:--:|:--:|`;
				sl = sl.concat(sub.filesToMarkdownTable(base_path, header));
			}
			sl = sl.concat(sub.recursiveFilesMarkdown(level + 1, base_path));
		}
		return sl;
	}

	async recursiveSites(site: string, groupName: string): Promise<void> {
		this.site = this.site.length ? this.site : site;
		this.groupName = this.groupName.length ? this.groupName : groupName;
		this.children.sort((a, b) => a.name.localeCompare(b.name));
		for (const sub of this.children) {
			await sub.recursiveSites(this.site, this.groupName);
		}
	}

	async recursiveWriteREADME(): Promise<void> {
		let sl: Array<string> = [`# Mahjong Solitaire Layout Museum: ${this.groupName}`];
		if (this.link) {
			if (this.site) {
				sl.push(`* Source: [${this.site}](${this.site})\n`);
			}
			sl.push(`* File Source:  \n<sub>\`\`\`${this.link}\`\`\`</sub>\n`);
		}
		if (this.files.length > 0) {
			const header = `\n|${this.groupName}||Layouts: ${this.files.length}|\n|:--:|:--:|:--:|`;
			sl = sl.concat(this.filesToMarkdownTable('./', header));
		}
		sl = sl.concat(this.recursiveFilesMarkdown(0, './'));
		await fse.writeFile(path.join(this.dest, 'README.md'), sl.join('\n'));
		for (const sub of this.children) {
			await sub.recursiveWriteREADME();
		}
	}

	public getGroupName() {
		let result = '';
		if (this.parent) {
			result = this.parent.getGroupName();
		}
		if (this.groupName.length && this.groupName !== result) {
			if (result.length) {
				result += ' - ';
			}
			result += this.groupName;
		}
		return result;
	}
}

async function museum(boards: Array<ScanBoard>) {
	const result = boards.map(board => {
		return ({
			id: board.layout.id,
			name: board.layout.name,
			by: board.layout.by || 'Unknown',
			tiles: board.layout.mapping.length,
			data: JSON.stringify(JSON.parse(board.data['.mah']).boards[0].map),
			source: `${board.parent.parent.link}${board.parent.parent.link.endsWith('.zip') ? '#' : ''}${path.basename(board.parent.source)}`,
			site: board.parent.parent.site,
			solvable: board.solvable,
			filename: board.filename,
			path: board.parent.parent.dest.replace('../public/boards/', ''),
			group: board.parent.parent.getGroupName()
		});
	}).sort((a, b) => a.name.localeCompare(b.name));

	await fse.writeFile(path.join('..', 'src', 'app', 'data.ts'), `export const data = ${JSON.stringify(result, undefined, '\t')};`);
}

async function openZip(): Promise<yauzl.ZipFile> {
	return new Promise((resolve, reject) => {
		yauzl.open('import.xz', {lazyEntries: true}, function(err, zipfile) {
			if (err) {
				reject(err);
			} else {
				resolve(zipfile);
			}
		});
	});
}

const getDir = (parents: Array<string>, parent: ScanDir): ScanDir => {
	let result = parent.children.find(d => d.name === parents[0]);
	if (!result) {
		result = new ScanDir(path.join(parent.dest, parents[0]), parents[0], parent.level + 1, parent);
		parent.children.push(result);
	}
	if (parents.length > 1) {
		return getDir(parents.slice(1), result);
	}
	return result;
};

async function extract(dest: string): Promise<ScanDir> {
	const root = new ScanDir(dest, 'All Layouts', 0);
	const filenames: Array<string> = [];
	const zipfile = await openZip();
	const builderRaw: { list?: Buffer; data?: Buffer } = {};
	return new Promise((resolve, reject) => {
		zipfile.readEntry();
		zipfile.on('entry', function(entry) {
			if (/\/$/.test(entry.fileName)) {
				// Directory file names end with '/'.
				// Note that entries for directories themselves are optional.
				// An entry's fileName implicitly requires its parent directories to exist.
				zipfile.readEntry();
			} else {
				// file entry
				console.log(entry.fileName);
				const topDir = entry.fileName.split('/')[0];
				const ext = path.extname(entry.fileName).toLowerCase();
				if (topDir === 'mahjongg-builder' && !entry.fileName.endsWith('.md')) {
					// games_list/games_data need each other to be read, so they are buffered
					// here and only converted once both have come in, see the 'end' handler.
					zipfile.openReadStream(entry, function(err, readStream) {
						if (err) throw err;
						const chunks: Buffer[] = [];
						readStream.on('end', function() {
							const buffer = Buffer.concat(chunks);
							const filename = path.basename(entry.fileName);
							if (filename === 'games_list') {
								builderRaw.list = buffer;
							} else if (filename === 'games_data') {
								builderRaw.data = buffer;
							}
							zipfile.readEntry();
						});
						readStream.on('data', buf => chunks.push(buf));
					});
				} else if (['.lay', '.layout', '.mah'].includes(ext) || (NEW_FORMAT_SITES.has(topDir) && ext !== '.md')) {
					zipfile.openReadStream(entry, function(err, readStream) {
						if (err) throw err;
						const chunks: Buffer[] = [];
						readStream.on('end', function() {
							const parents = path.dirname(entry.fileName).split('/');
							const dir = getDir(parents, root);
							const filename = path.basename(entry.fileName);
							const file = new ScanFile(dir, filename);
							dir.files.push(file);
							file.loadData(Buffer.concat(chunks).toString(), dir.dest, filenames).then(() => {
								zipfile.readEntry();
							}).catch(e => {
								reject(e);
							})
						});
						readStream.on('data', buf => chunks.push(buf));
					});
				} else if (entry.fileName.endsWith('.md')) {
					zipfile.openReadStream(entry, function(err, readStream) {
						if (err) throw err;
						const chunks: Buffer[] = [];
						readStream.on('end', function() {
							const parents = path.dirname(entry.fileName).split('/');
							const dir = getDir(parents, root);
							const content = Buffer.concat(chunks).toString().trim();
							if (entry.fileName.endsWith('_LINK.md')) {
								dir.link = content;
							} else if (entry.fileName.endsWith('_SITE.md')) {
								dir.site = content;
							} else if (entry.fileName.endsWith('_NAME.md')) {
								dir.groupName = content;
							}
							zipfile.readEntry();
						});
						readStream.on('data', buf => chunks.push(buf));
					});
				} else {
					zipfile.readEntry();
				}
			}
		});
		zipfile.on('end', () => {
			if (builderRaw.list && builderRaw.data) {
				const dir = getDir(['mahjongg-builder'], root);
				const file = new ScanFile(dir, 'games_data');
				dir.files.push(file);
				file.loadBuilderData(builderRaw.list, builderRaw.data, dir.dest, filenames).then(() => {
					resolve(root);
				}).catch(e => reject(e));
			} else {
				resolve(root);
			}
		})
	});
}

async function go() {
	const dest = '../public/boards';
	await fse.remove(dest);

	const root = await extract(dest);
	await root.recursiveSites('', '');
	await root.recursiveWriteREADME();
	await museum(all);
}

go()
	.then(() => console.log('done.'))
	.catch(e => {
		console.error(e)
	});
