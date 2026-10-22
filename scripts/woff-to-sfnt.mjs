// WOFF 1 → SFNT (TTF/OTF), usado por og.mjs: WOFF 1 es un contenedor con las mismas tablas,
// cada una comprimida con zlib. Basta con descomprimirlas y escribir la
// cabecera y el directorio de tablas del formato SFNT.
import { inflateSync } from 'node:zlib';

export function woffToSfnt(woff) {
  if (woff.toString('ascii', 0, 4) !== 'wOFF') throw new Error('Not a WOFF 1 file');
  const flavor = woff.readUInt32BE(4);
  const numTables = woff.readUInt16BE(12);

  const tables = [];
  for (let i = 0; i < numTables; i++) {
    const entry = 44 + i * 20;
    const offset = woff.readUInt32BE(entry + 4);
    const compLength = woff.readUInt32BE(entry + 8);
    const origLength = woff.readUInt32BE(entry + 12);
    const raw = woff.subarray(offset, offset + compLength);
    tables.push({
      tag: woff.toString('ascii', entry, entry + 4),
      checksum: woff.readUInt32BE(entry + 16),
      data: compLength < origLength ? inflateSync(raw) : raw,
    });
  }
  tables.sort((a, b) => (a.tag < b.tag ? -1 : 1));

  const pad4 = (n) => (n + 3) & ~3;
  const headerSize = 12 + numTables * 16;
  const total = tables.reduce((sum, t) => sum + pad4(t.data.length), headerSize);
  const sfnt = Buffer.alloc(total);

  const entrySelector = Math.floor(Math.log2(numTables));
  const searchRange = 2 ** entrySelector * 16;
  sfnt.writeUInt32BE(flavor, 0);
  sfnt.writeUInt16BE(numTables, 4);
  sfnt.writeUInt16BE(searchRange, 6);
  sfnt.writeUInt16BE(entrySelector, 8);
  sfnt.writeUInt16BE(numTables * 16 - searchRange, 10);

  let offset = headerSize;
  tables.forEach((table, i) => {
    const record = 12 + i * 16;
    sfnt.write(table.tag, record, 'ascii');
    sfnt.writeUInt32BE(table.checksum, record + 4);
    sfnt.writeUInt32BE(offset, record + 8);
    sfnt.writeUInt32BE(table.data.length, record + 12);
    table.data.copy(sfnt, offset);
    offset += pad4(table.data.length);
  });
  return sfnt;
}
