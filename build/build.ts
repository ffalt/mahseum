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

function mdLink(href: string, content: string): string {
	return `[${content}](${href}) `;
}

const all: Array<ScanBoard> = [];

class ScanBoard {
	formats: Array<string> = [];
	filename: string;
	solvable: boolean = false;
	data: { [format: string]: string } = {}

	constructor(public parent: ScanFile, public layout: Layout) {
		this.filename = layout.name.toLowerCase().replace(/[ /\\!?*.,]/g, ' ').trim().replace(/ /g, '_').replace(/__/g, '_');
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
		if (ext === 'lay') {
			layouts = [cleanImportLayout(await convertKyodai(data, path.basename(this.source)))];
		} else if (ext === 'layout') {
			layouts = [cleanImportLayout(await convertKmahjongg(data, path.basename(this.source)))];
			layouts.forEach(l => l.by = 'Alexey Charkov')
		} else {
			const mah: MahFormat = JSON.parse(data);
			layouts = mah.boards;
		}
		for (const o of layouts) {
			const mapping: Mapping = expandMapping(o.map || []);
			const solvable = await this.solve(mapping);
			const layout: Layout = {
				id: o.id && o.id !== '' ? o.id : mappingToID(mapping),
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
			by: board.layout.by,
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

async function checkDups(): Promise<Array<ScanBoard>> {
	const o: { [id: string]: Array<ScanBoard> } = {};
	for (const board of all) {
		o[board.layout.id] = o[board.layout.id] || [];
		o[board.layout.id].push(board);
	}
	const result: Array<ScanBoard> = [];
	const keys = Object.keys(o);
	for (const key of keys) {
		result.push(o[key][0]);
		if (o[key].length > 1) {
			const names: Array<string> = [];
			const by: Array<string> = [];
			o[key].forEach(b => {
				if (!names.includes(b.layout.name)) {
					names.push(b.layout.name);
				}
				if (b.layout.by && !by.includes(b.layout.by)) {
					by.push(b.layout.by);
				}
			});
			if (names.length > 1 || by.length > 1) {
				console.log('---');
				console.log(o[key].map(b => ({id: b.layout.id, name: b.layout.name, by: b.layout.by, solvable: b.solvable, f: b.filename, p: b.parent.source})));
			}
		}
	}
	return result;
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
				if (['.lay', '.layout', '.mah'].includes(path.extname(entry.fileName).toLowerCase())) {
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
			resolve(root);
		})
	});
}

async function go() {
	const dest = '../public/boards';
	await fse.remove(dest);

	const root = await extract(dest);
	await root.recursiveSites('', '');
	await root.recursiveWriteREADME();
	await museum(await checkDups());
}

go()
	.then(() => console.log('done.'))
	.catch(e => {
		console.error(e)
	});
