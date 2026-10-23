// tests/registro.test.ts — node --experimental-strip-types tests/registro.test.ts
import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
Object.assign(globalThis, { DOMParser, XMLSerializer });
const { abrir, guardar, pendiente, deudas, ordenar, claveDeuda, esDe } = await import('../src/lib/registro.ts');
const { OdsDocument } = await import('../src/lib/ods.ts');
import type { Movimiento } from '../src/lib/registro.ts';

const out = process.argv[2] ?? 'tests/salida.ods';
const t0 = performance.now();
const mov = (quien: string, motivo: string, fecha: string, tipo: 'prestamo' | 'pago', importe: number, concepto = ''): Movimiento =>
  ({ quien, motivo, fecha, concepto, tipo, importe, notas: '' });

// la plantilla viene vacía
const { registro, datos } = await abrir(readFileSync('public/plantilla.ods'));
assert.equal(datos.debo.length, 0);
assert.equal(datos.meDeben.length, 0);
assert.equal(datos.ajustes.copiaEmail, '');

// varias deudas en cada lado; los movimientos se apuntan desordenados
datos.ajustes.copiaEmail = 'yo@correo.es';
datos.debo = ordenar([
  mov('Banco', 'Hipoteca de la casa', '2026-01-01', 'prestamo', 120000),
  mov('Hermana', 'Préstamo del coche', '2026-05-10', 'prestamo', 3000),
  mov('Banco', 'Hipoteca de la casa', '2026-02-01', 'pago', 650.5, 'Cuota de febrero'),
  mov('Hermana', 'Préstamo del coche', '2026-06-10', 'pago', 500),
  mov('Banco', 'Hipoteca de la casa', '2026-03-01', 'pago', 650.5),
]);
datos.meDeben = [
  mov('Mi prima', 'Vacaciones en Lisboa', '2026-08-01', 'prestamo', 420),
  mov('Mi prima', 'Vacaciones en Lisboa', '2026-09-01', 'pago', 420),
  mov('Luis', 'Cena', '2026-10-10', 'prestamo', 35.5),
];
// ordenar deja juntas las filas de cada deuda, por fecha
assert.deepEqual(datos.debo.map(m => `${m.quien} ${m.fecha}`),
  ['Banco 2026-01-01', 'Banco 2026-02-01', 'Banco 2026-03-01', 'Hermana 2026-05-10', 'Hermana 2026-06-10']);
writeFileSync(out, await guardar(registro, datos));

// reabrir y comprobar
const again = await abrir(readFileSync(out));
assert.equal(again.datos.debo.length, 5);
assert.deepEqual(again.datos.debo[1], mov('Banco', 'Hipoteca de la casa', '2026-02-01', 'pago', 650.5, 'Cuota de febrero'));
const dDebo = deudas(again.datos.debo);
assert.deepEqual(dDebo.map(d => [d.quien, d.pendiente]), [['Banco', 118699], ['Hermana', 2500]]);
assert.equal(dDebo[0].prestado, 120000);
assert.equal(dDebo[0].pagado, 1301);
assert.equal(dDebo[0].desde, '2026-01-01');
assert.equal(dDebo[0].ultimo, '2026-03-01');
const dMe = deudas(again.datos.meDeben);
assert.deepEqual(dMe.map(d => [d.motivo, d.pendiente]), [['Vacaciones en Lisboa', 0], ['Cena', 35.5]]);
assert.equal(pendiente(again.datos.meDeben), 35.5);
assert.equal(again.datos.ajustes.copiaEmail, 'yo@correo.es');
// la deuda se reconoce sin mirar mayúsculas ni tildes
assert.equal(claveDeuda('mi PRIMA', 'vacaciones en lisboa'), dMe[0].clave);

// el total de la columna I conserva la fórmula y lleva el resultado
const zip = await JSZip.loadAsync(readFileSync(out));
const xml = await zip.file('content.xml')!.async('string');
assert.equal((xml.match(/table:formula="of:=SUMIF/g) ?? []).length, 2);
const doc = await OdsDocument.open(readFileSync(out));
assert.equal(doc.sheet('Debo').read(2, 9), 121199);
assert.equal(doc.sheet('Me deben').read(2, 9), 35.5);
assert.equal(doc.sheet('Debo').read(2, 5), 'PRÉSTAMO');

// borrar una deuda entera: no deben quedar restos
const banco = dDebo[0].clave;
again.datos.debo = again.datos.debo.filter(m => !esDe(m, banco));
again.datos.meDeben = [];
writeFileSync(out, await guardar(again.registro, again.datos));
const third = await abrir(readFileSync(out));
assert.deepEqual(deudas(third.datos.debo).map(d => d.quien), ['Hermana']);
assert.equal(third.datos.debo.length, 2);
assert.equal(third.datos.meDeben.length, 0);

// un libro sin estas hojas (p. ej. otra hoja de cálculo exportada): se leen vacías y se crean al guardar;
// y lo escrito a mano en la hoja (fechas como texto, importes con coma, tipos en minúscula) se entiende
const zipAjeno = await JSZip.loadAsync(readFileSync(out));
let c = await zipAjeno.file('content.xml')!.async('string');
c = c.replace('table:name="Debo"', 'table:name="Otra"').replace('table:name="Ajustes"', 'table:name="Varios"');
zipAjeno.file('content.xml', c);
const sinHojas = await abrir(await zipAjeno.generateAsync({ type: 'uint8array' }));
assert.equal(sinHojas.datos.debo.length, 0);
assert.equal(sinHojas.datos.ajustes.copiaEmail, '');
sinHojas.datos.debo.push(mov('Banco', 'Casa', '2026-10-05', 'prestamo', 1000));
sinHojas.datos.ajustes.copiaEmail = 'otro@correo.es';
const creado = await OdsDocument.open(await guardar(sinHojas.registro, sinHojas.datos));
assert.deepEqual(creado.sheetNames(), ['Otra', 'Me deben', 'Varios', 'Debo', 'Ajustes']);
const hojaNueva = creado.sheet('Debo');
assert.equal(hojaNueva.read(1, 6), 'IMPORTE');
hojaNueva.writeRows(3, 1, [['banco', 'casa', '7/10/26', 'A mano', 'pagado', '12,50 €', null]]);
const releido = await abrir(await creado.toBytes());
assert.deepEqual(releido.datos.debo[1], { ...mov('banco', 'casa', '2026-10-07', 'pago', 12.5, 'A mano') });
assert.deepEqual(deudas(releido.datos.debo).map(d => d.pendiente), [987.5]);
assert.equal(releido.datos.ajustes.copiaEmail, 'otro@correo.es');

console.log(`ok · ${Math.round(performance.now() - t0)} ms · ${out}`);
