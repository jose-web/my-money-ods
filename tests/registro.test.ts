// tests/registro.test.ts — node --experimental-strip-types tests/registro.test.ts
import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
Object.assign(globalThis, { DOMParser, XMLSerializer });
const { abrir, guardar, cifras, nuevoId, pendiente } = await import('../src/lib/registro.ts');
const { OdsDocument } = await import('../src/lib/ods.ts');
const i18n = await import('../src/lib/i18n.ts');
const { setIdioma } = i18n;
const { parseNum, numeroEditable } = await import('../src/lib/format.ts');
import type { Deuda, Lado, Movimiento } from '../src/lib/registro.ts';
// el test va en español (en Node el idioma del sistema podría ser otro)
setIdioma('es');

const out = process.argv[2] ?? 'tests/salida.ods';
const t0 = performance.now();
const mov = (fecha: string, tipo: 'prestamo' | 'pago', importe: number, concepto = ''): Movimiento => ({ fecha, concepto, tipo, importe, notas: '' });
const deuda = (lado: Lado, quien: string, motivo: string, movimientos: Movimiento[]): Deuda => ({ id: nuevoId(), lado, quien, motivo, movimientos });
const reabrir = async (bytes: Uint8Array) => { writeFileSync(out, bytes); return abrir(readFileSync(out)); };

// la plantilla solo trae Ajustes
const { registro, datos } = await abrir(readFileSync('public/plantilla.ods'));
assert.equal(datos.deudas.length, 0);
assert.equal(datos.ajustes.copiaEmail, '');
assert.equal(datos.ajustes.idioma, '');

// varias deudas en cada lado: cada una, su hoja
datos.ajustes.copiaEmail = 'yo@correo.es';
datos.ajustes.idioma = 'en';
datos.deudas.push(
  deuda('debo', 'Banco', 'Hipoteca de la casa', [mov('2026-01-01', 'prestamo', 120000), mov('2026-02-01', 'pago', 650.5, 'Cuota de febrero'), mov('2026-03-01', 'pago', 650.5)]),
  deuda('debo', 'Mi hermana', 'Préstamo del coche', [mov('2026-05-10', 'prestamo', 3000), mov('2026-06-10', 'pago', 500)]),
  deuda('meDeben', 'Mi prima', 'Vacaciones en Lisboa', [mov('2026-08-01', 'prestamo', 420), mov('2026-09-01', 'pago', 420)]),
  // con caracteres que no valen en el nombre de una pestaña
  deuda('meDeben', 'Luis', 'Cena 10/10: [cumple]', [mov('2026-10-10', 'prestamo', 35.5)]),
);
const again = await reabrir(await guardar(registro, datos));
const doc = await OdsDocument.open(readFileSync(out));
assert.deepEqual(doc.sheetNames(), ['Ajustes', 'Debo · Banco · Hipoteca de la casa', 'Debo · Mi hermana · Préstamo del coche',
  'Me deben · Mi prima · Vacaciones en Lisboa', 'Me deben · Luis · Cena 10 10 cumple']);
// la ficha de arriba y los movimientos debajo, con la fórmula del pendiente y su resultado
const banco = doc.sheet('Debo · Banco · Hipoteca de la casa');
assert.deepEqual(banco.readRows(1, 1, 2, 4), [['QUIÉN', 'Banco'], ['MOTIVO', 'Hipoteca de la casa'], ['LADO', 'DEBO'], ['PENDIENTE', 118699]]);
assert.deepEqual(banco.readRows(6, 1, 5, 1)[0], ['FECHA', 'CONCEPTO', 'TIPO', 'IMPORTE', 'NOTAS']);
assert.equal(banco.read(8, 3), 'PAGO');
assert.equal(banco.read(8, 2), 'Cuota de febrero');
const xml = await (await JSZip.loadAsync(readFileSync(out))).file('content.xml')!.async('string');
assert.equal((xml.match(/table:formula="of:=SUMIF/g) ?? []).length, 4);
assert.ok(xml.includes('style:name="md-N-eur"'), 'las hojas nuevas llevan su formato');

// se lee igual que se escribió
assert.deepEqual(again.datos.deudas.map(d => [d.lado, d.quien, d.motivo, cifras(d).pendiente]), [
  ['debo', 'Banco', 'Hipoteca de la casa', 118699], ['debo', 'Mi hermana', 'Préstamo del coche', 2500],
  ['meDeben', 'Mi prima', 'Vacaciones en Lisboa', 0], ['meDeben', 'Luis', 'Cena 10/10: [cumple]', 35.5]]);
assert.deepEqual(again.datos.deudas[0].movimientos[1], mov('2026-02-01', 'pago', 650.5, 'Cuota de febrero'));
const c = cifras(again.datos.deudas[0]);
assert.deepEqual([c.prestado, c.pagado, c.desde, c.ultimo], [120000, 1301, '2026-01-01', '2026-03-01']);
assert.equal(again.datos.ajustes.copiaEmail, 'yo@correo.es');
assert.equal(again.datos.ajustes.idioma, 'en');

// renombrar una deuda renombra su pestaña; borrar otras borra sus hojas; quitar movimientos no deja restos;
// una hoja que no es de deudas no se toca
const ajena = await OdsDocument.open(readFileSync(out));
ajena.addSheet('Mis notas', 2).write(1, 1, 'no tocar');
const conAjena = await abrir(await ajena.toBytes());
const [b, , , l] = conAjena.datos.deudas;
b.motivo = 'Hipoteca del piso';
b.movimientos = b.movimientos.slice(0, 1);
conAjena.datos.deudas = [b, l];
const third = await reabrir(await guardar(conAjena.registro, conAjena.datos));
const doc3 = await OdsDocument.open(readFileSync(out));
assert.deepEqual(doc3.sheetNames(), ['Ajustes', 'Debo · Banco · Hipoteca del piso', 'Me deben · Luis · Cena 10 10 cumple', 'Mis notas']);
assert.equal(doc3.sheet('Mis notas').read(1, 1), 'no tocar');
assert.equal(third.datos.deudas[0].movimientos.length, 1);
assert.equal(doc3.sheet('Debo · Banco · Hipoteca del piso').read(8, 1), null);

// guardar dos veces seguidas con el mismo registro (el guardado automático) no duplica hojas; y si el nombre
// de la pestaña ya está cogido, lleva «(2)»
third.datos.deudas.push(deuda('debo', 'Banco', 'Hipoteca del piso', [mov('2026-10-01', 'prestamo', 1)]));
await guardar(third.registro, third.datos);
const doble = await OdsDocument.open(await guardar(third.registro, third.datos));
assert.deepEqual(doble.sheetNames(), ['Ajustes', 'Debo · Banco · Hipoteca del piso', 'Me deben · Luis · Cena 10 10 cumple', 'Mis notas', 'Debo · Banco · Hipoteca del piso (2)']);

// lo escrito a mano en Hojas de cálculo: fechas como texto, importes con coma, tipos en minúscula, pestaña renombrada
const mano = await OdsDocument.open(readFileSync(out));
mano.renameSheet('Debo · Banco · Hipoteca del piso', 'Hipoteca');
mano.sheet('Hipoteca').writeRows(8, 1, [['7/10/26', 'A mano', 'pagado', '12,50 €', null]]);
mano.sheet('Ajustes').writeRows(2, 1, [['Idioma', 'Inglés']]);
const leido = await abrir(await mano.toBytes());
assert.equal(leido.datos.deudas[0].quien, 'Banco');
assert.deepEqual(leido.datos.deudas[0].movimientos[1], mov('2026-10-07', 'pago', 12.5, 'A mano'));
assert.equal(pendiente(leido.datos.deudas[0].movimientos), 120000 - 12.5);
assert.equal(leido.datos.ajustes.idioma, 'en');
// y al guardar sin cambiar la deuda, la pestaña renombrada a mano se queda como está
const sinCambios = await OdsDocument.open(await guardar(leido.registro, leido.datos));
assert.ok(sinCambios.sheetNames().includes('Hipoteca'));

// formato antiguo (hojas Debo y Me deben con QUIÉN y MOTIVO en cada fila): se lee y al guardar pasa a una hoja por deuda
const viejo = await OdsDocument.open(readFileSync('public/plantilla.ods'));
viejo.addSheet('Debo', 7).writeRows(1, 1, [
  ['QUIÉN', 'MOTIVO', 'FECHA', 'CONCEPTO', 'TIPO', 'IMPORTE', 'NOTAS'],
  ['Banco', 'Casa', '2026-01-01', null, 'PRÉSTAMO', 1000, null],
  ['Hermana', 'Coche', '2026-02-01', null, 'PRÉSTAMO', 300, null],
  ['banco', 'CASA', '2026-03-01', 'Cuota', 'PAGO', 100, null],
]);
viejo.addSheet('Me deben', 7).writeRows(1, 1, [['QUIÉN', 'MOTIVO', 'FECHA', 'CONCEPTO', 'TIPO', 'IMPORTE', 'NOTAS'], ['Prima', 'Viaje', '2026-04-01', null, 'PRÉSTAMO', 50, null]]);
const migrado = await abrir(await viejo.toBytes());
assert.deepEqual(migrado.datos.deudas.map(d => [d.lado, d.quien, d.movimientos.length, cifras(d).pendiente]),
  [['debo', 'Banco', 2, 900], ['debo', 'Hermana', 1, 300], ['meDeben', 'Prima', 1, 50]]);
const nuevo = await OdsDocument.open(await guardar(migrado.registro, migrado.datos));
assert.deepEqual(nuevo.sheetNames(), ['Ajustes', 'Debo · Banco · Casa', 'Debo · Hermana · Coche', 'Me deben · Prima · Viaje']);

// importes escritos en cada idioma
assert.deepEqual(['12,5', '1.000', '1.234,56', '1234.56', '650,50 €', 'x'].map(parseNum), [12.5, 1000, 1234.56, 1234.56, 650.5, null]);
assert.equal(numeroEditable(650.5), '650,5');
setIdioma('en');
assert.equal(i18n.t.tabs.debo[0], 'I owe'); // `i18n.t`: desestructurado no vería el cambio
assert.deepEqual(['12.5', '1,000', '1,234.56', '1.234,56', '12,5'].map(parseNum), [12.5, 1000, 1234.56, 1234.56, 12.5]);
assert.equal(numeroEditable(650.5), '650.5');
assert.equal(numeroEditable(0, true), '0.00');
setIdioma('es');

console.log(`ok · ${Math.round(performance.now() - t0)} ms · ${out}`);
