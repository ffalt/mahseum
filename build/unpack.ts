import fs from 'fs';
import path from 'path';
import fse from 'fs-extra';
import yauzl from 'yauzl';

const srcFile = path.join(__dirname, 'import.xz');
const destDir = path.join(__dirname, '_import');

async function openZip(): Promise<yauzl.ZipFile> {
	return new Promise((resolve, reject) => {
		yauzl.open(srcFile, {lazyEntries: true}, (err, zipfile) => {
			if (err) {
				reject(err);
			} else {
				resolve(zipfile);
			}
		});
	});
}

async function extractEntry(zipfile: yauzl.ZipFile, entry: yauzl.Entry): Promise<void> {
	const dest = path.join(destDir, entry.fileName);
	if (/\/$/.test(entry.fileName)) {
		await fse.ensureDir(dest);
		return;
	}
	await fse.ensureDir(path.dirname(dest));
	await new Promise<void>((resolve, reject) => {
		zipfile.openReadStream(entry, (err, readStream) => {
			if (err) {
				reject(err);
				return;
			}
			const writeStream = fs.createWriteStream(dest);
			readStream.on('error', reject);
			writeStream.on('error', reject);
			writeStream.on('close', resolve);
			readStream.pipe(writeStream);
		});
	});
}

async function unpack(): Promise<void> {
	await fse.ensureDir(destDir);
	const zipfile = await openZip();
	let count = 0;
	await new Promise<void>((resolve, reject) => {
		zipfile.readEntry();
		zipfile.on('entry', (entry: yauzl.Entry) => {
			extractEntry(zipfile, entry).then(() => {
				count++;
				zipfile.readEntry();
			}).catch(reject);
		});
		zipfile.on('error', reject);
		zipfile.on('end', () => resolve());
	});
	console.log(`Unpacked ${count} entries from ${srcFile} into ${destDir}`);
}

unpack().catch(err => {
	console.error(err);
	process.exit(1);
});
