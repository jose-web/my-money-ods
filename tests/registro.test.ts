// tests/registro.test.ts — node --experimental-strip-types tests/registro.test.ts
import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
Object.assign(globalThis, { DOMParser, XMLSerializer });
const { abrir, guardar, pendiente, suma, porFecha, nombreMes, CATEGORIAS_INICIALES } = await import('../src/lib/registro.ts');
const { OdsDocument } = await import('../src/lib/ods.ts');

const out = process.argv[2] ?? 'tests/salida.ods';
const t0 = performance.now();

// la plantilla viene vacía, con las categorías de ejemplo
const { registro, datos } = await abrir(readFileSync('public/plantilla.ods'));
assert.equal(datos.gastos.length, 0);
assert.equal(datos.leDebo.length, 0);
assert.equal(datos.meDebe.length, 0);
assert.deepEqual(datos.ajustes.categorias, CATEGORIAS_INICIALES);
assert.equal(datos.ajustes.leDebo, '');

datos.ajustes.leDebo = 'Ana';
datos.ajustes.meDebe = 'Luis';
datos.ajustes.copiaEmail = 'yo@correo.es';
datos.gastos.push(
  { fecha: '2026-10-01', concepto: 'Recibo de la luz', categoria: 'Luz', importe: 54.3, notas: '' },
  { fecha: '2026-10-03', concepto: 'Compra semanal', categoria: 'Supermercado', importe: 82.15, notas: 'Mercadona' },
  { fecha: '2026-09-28', concepto: 'Agua', categoria: 'Agua', importe: 20, notas: '' },
);
datos.leDebo.push(
  { fecha: '2026-08-01', concepto: 'Préstamo coche', tipo: 'prestamo', importe: 1000, notas: '' },
  { fecha: '2026-09-01', concepto: 'Primer pago', tipo: 'pago', importe: 250, notas: 'Bizum' },
);
datos.meDebe.push({ fecha: '2026-10-10', concepto: 'Cena', tipo: 'prestamo', importe: 35.5, notas: '' });
writeFileSync(out, await guardar(registro, datos));

// reabrir y comprobar
const again = await abrir(readFileSync(out));
assert.equal(again.datos.gastos.length, 3);
assert.deepEqual(again.datos.gastos[1], { fecha: '2026-10-03', concepto: 'Compra semanal', categoria: 'Supermercado', importe: 82.15, notas: 'Mercadona' });
assert.equal(suma(again.datos.gastos), 156.45);
assert.equal(pendiente(again.datos.leDebo), 750);
assert.equal(pendiente(again.datos.meDebe), 35.5);
assert.equal(again.datos.leDebo[1].tipo, 'pago');
assert.equal(again.datos.ajustes.leDebo, 'Ana');
assert.equal(again.datos.ajustes.meDebe, 'Luis');
assert.equal(again.datos.ajustes.copiaEmail, 'yo@correo.es');
assert.deepEqual(porFecha(again.datos.gastos).map(g => g.fecha), ['2026-09-28', '2026-10-01', '2026-10-03']);
assert.equal(nombreMes('2026-10'), 'octubre de 2026');

// el resumen de la columna G conserva la fórmula y lleva el resultado
const zip = await JSZip.loadAsync(readFileSync(out));
const xml = await zip.file('content.xml')!.async('string');
assert.equal((xml.match(/table:formula="of:=SUMIF/g) ?? []).length, 2);
const doc = await OdsDocument.open(readFileSync(out));
assert.equal(doc.sheet('Gastos casa').read(2, 7), 156.45);
assert.equal(doc.sheet('Le debo').read(2, 7), 750);
assert.equal(doc.sheet('Le debo').read(2, 3), 'PRÉSTAMO');

// borrar filas: no deben quedar restos
again.datos.gastos.splice(0, 2);
again.datos.leDebo = [];
writeFileSync(out, await guardar(again.registro, again.datos));
const third = await abrir(readFileSync(out));
assert.deepEqual(third.datos.gastos.map(g => g.concepto), ['Agua']);
assert.equal(third.datos.leDebo.length, 0);
assert.equal(third.datos.meDebe.length, 1);

// un libro sin estas hojas (p. ej. otra hoja de cálculo exportada): se leen vacías y se crean al guardar;
// y lo escrito a mano en la hoja (fechas como texto, importes con coma, tipos en minúscula) se entiende
const ajeno = await OdsDocument.open(readFileSync(out));
const zipAjeno = await JSZip.loadAsync(await ajeno.toBytes());
let c = await zipAjeno.file('content.xml')!.async('string');
c = c.replace('table:name="Gastos casa"', 'table:name="Otra"').replace('table:name="Le debo"', 'table:name="Mis notas"')
  .replace('table:name="Ajustes"', 'table:name="Varios"');
zipAjeno.file('content.xml', c);
const bytesAjeno = await zipAjeno.generateAsync({ type: 'uint8array' });
const sinHojas = await abrir(bytesAjeno);
assert.equal(sinHojas.datos.gastos.length, 0);
assert.equal(sinHojas.datos.ajustes.leDebo, '');
sinHojas.datos.gastos.push({ fecha: '2026-10-05', concepto: 'Gas', categoria: 'Gas', importe: 40, notas: '' });
sinHojas.datos.ajustes.leDebo = 'Ana';
const creado = await OdsDocument.open(await guardar(sinHojas.registro, sinHojas.datos));
assert.deepEqual(creado.sheetNames(), ['Otra', 'Mis notas', 'Me debe', 'Varios', 'Gastos casa', 'Le debo', 'Ajustes']);
const hojaNueva = creado.sheet('Gastos casa');
assert.equal(hojaNueva.read(1, 4), 'IMPORTE');
hojaNueva.writeRows(3, 1, [['7/10/26', 'A mano', 'Otros', '12,50 €', null]]);
creado.sheet('Me debe').write(3, 3, 'pagado');
creado.sheet('Me debe').writeRows(3, 1, [[null, 'Me devolvió', 'pago', 10]]);
const releido = await abrir(await creado.toBytes());
assert.deepEqual(releido.datos.gastos[1], { fecha: '2026-10-07', concepto: 'A mano', categoria: 'Otros', importe: 12.5, notas: '' });
assert.equal(pendiente(releido.datos.meDebe), 25.5);
assert.equal(releido.datos.ajustes.leDebo, 'Ana');

console.log(`ok · ${Math.round(performance.now() - t0)} ms · ${out}`);
