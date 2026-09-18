import fs from 'fs';
import path from 'path';
import {ZipFile} from 'yazl';

const srcDir = path.join(__dirname, '_import');
const destFile = path.join(__dirname, 'import.xz');

const EXCLUDE = new Set(['.DS_Store', '.AppleDouble']);

function isExcluded(name: string): boolean {
	return EXCLUDE.has(name) || name.startsWith('._');
}

async function collectFiles(dir: string, base: string, out: Array<{ abs: string; rel: string }>): Promise<void> {
	const entries = await fs.promises.readdir(dir, {withFileTypes: true});
	for (const entry of entries) {
		if (isExcluded(entry.name)) {
			continue;
		}
		const abs = path.join(dir, entry.name);
		const rel = path.posix.join(base, entry.name);
		if (entry.isDirectory()) {
			await collectFiles(abs, rel, out);
		} else if (entry.isFile()) {
			out.push({abs, rel});
		}
	}
}

async function pack(): Promise<void> {
	const files: Array<{ abs: string; rel: string }> = [];
	await collectFiles(srcDir, '', files);
	const zipfile = new ZipFile();
	for (const file of files) {
		zipfile.addFile(file.abs, file.rel);
	}
	await new Promise<void>((resolve, reject) => {
		const output = fs.createWriteStream(destFile);
		output.on('close', resolve);
		output.on('error', reject);
		zipfile.outputStream.pipe(output);
		zipfile.end();
	});
	console.log(`Packed ${files.length} files from ${srcDir} into ${destFile}`);
}

pack().catch(err => {
	console.error(err);
	process.exit(1);
});
