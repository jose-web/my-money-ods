// scripts/plantilla.mjs — genera public/plantilla.ods (node scripts/plantilla.mjs)
// Libro vacío con las cuatro hojas que lee la web: cabecera en la fila 1 y datos desde la 2.
// En la columna G de cada hoja de movimientos va un resumen con fórmula, para verlo en Hojas de cálculo.
import { writeFileSync } from 'node:fs';
import JSZip from 'jszip';

const MIME = 'application/vnd.oasis.opendocument.spreadsheet';
const CATEGORIAS = 'Alquiler o hipoteca, Luz, Agua, Gas, Internet y teléfono, Comunidad, Supermercado, Seguros, Reparaciones, Otros';
const FILAS = 1000;

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const texto = (s, estilo = 'Default') => `<table:table-cell table:style-name="${estilo}" office:value-type="string" calcext:value-type="string"><text:p>${esc(s)}</text:p></table:table-cell>`;
const vacias = n => `<table:table-cell table:number-columns-repeated="${n}"/>`;
const formula = (f, estilo) => `<table:table-cell table:style-name="${estilo}" table:formula="${esc(f)}" office:value-type="float" office:value="0" calcext:value-type="float"><text:p>0</text:p></table:table-cell>`;

/** Hoja de movimientos: FECHA, CONCEPTO, <tercera>, IMPORTE, NOTAS y, en G, el resumen. */
function hoja(nombre, tercera, resumen, f) {
  return `<table:table table:name="${esc(nombre)}" table:style-name="ta1">
<table:table-column table:style-name="co-fecha" table:default-cell-style-name="ce-fecha"/>
<table:table-column table:style-name="co-ancha" table:default-cell-style-name="Default"/>
<table:table-column table:style-name="co-media" table:default-cell-style-name="Default"/>
<table:table-column table:style-name="co-media" table:default-cell-style-name="ce-eur"/>
<table:table-column table:style-name="co-ancha" table:default-cell-style-name="Default"/>
<table:table-column table:style-name="co-estrecha" table:default-cell-style-name="Default"/>
<table:table-column table:style-name="co-media" table:default-cell-style-name="Default"/>
<table:table-row table:style-name="ro1">${['FECHA', 'CONCEPTO', tercera, 'IMPORTE', 'NOTAS'].map(c => texto(c, 'ce-cab')).join('')}${vacias(1)}${texto(resumen, 'ce-cab')}</table:table-row>
<table:table-row table:style-name="ro1">${vacias(6)}${formula(f, 'ce-eur-negrita')}</table:table-row>
<table:table-row table:style-name="ro1" table:number-rows-repeated="${FILAS}">${vacias(7)}</table:table-row>
</table:table>`;
}

const rango = c => `[.${c}2:.${c}${FILAS + 2}]`;
const pendiente = `of:=SUMIF(${rango('C')};"PRÉSTAMO";${rango('D')})-SUMIF(${rango('C')};"PAGO";${rango('D')})`;
const AJUSTES = [
  ['PERSONA A LA QUE DEBO', ''],
  ['PERSONA QUE ME DEBE', ''],
  ['CATEGORÍAS DE GASTOS', CATEGORIAS],
  ['EMAIL PARA COPIAS DE SEGURIDAD', ''],
  ['ÚLTIMA COPIA DE SEGURIDAD', ''],
];

const content = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" xmlns:number="urn:oasis:names:tc:opendocument:xmlns:datastyle:1.0" xmlns:of="urn:oasis:names:tc:opendocument:xmlns:of:1.2" xmlns:calcext="urn:org:documentfoundation:names:experimental:calc:xmlns:calcext:1.0" office:version="1.3">
<office:automatic-styles>
<style:style style:name="co-fecha" style:family="table-column"><style:table-column-properties fo:break-before="auto" style:column-width="2.6cm"/></style:style>
<style:style style:name="co-estrecha" style:family="table-column"><style:table-column-properties fo:break-before="auto" style:column-width="1cm"/></style:style>
<style:style style:name="co-media" style:family="table-column"><style:table-column-properties fo:break-before="auto" style:column-width="3.6cm"/></style:style>
<style:style style:name="co-ancha" style:family="table-column"><style:table-column-properties fo:break-before="auto" style:column-width="6.5cm"/></style:style>
<style:style style:name="co-ajuste" style:family="table-column"><style:table-column-properties fo:break-before="auto" style:column-width="7cm"/></style:style>
<style:style style:name="co-valor" style:family="table-column"><style:table-column-properties fo:break-before="auto" style:column-width="16cm"/></style:style>
<style:style style:name="ro1" style:family="table-row"><style:table-row-properties style:row-height="0.5cm" fo:break-before="auto" style:use-optimal-row-height="true"/></style:style>
<style:style style:name="ta1" style:family="table" style:master-page-name="Default"><style:table-properties table:display="true" style:writing-mode="lr-tb"/></style:style>
<number:date-style style:name="N-fecha"><number:day number:style="long"/><number:text>/</number:text><number:month number:style="long"/><number:text>/</number:text><number:year number:style="long"/></number:date-style>
<number:number-style style:name="N-eur"><number:number number:decimal-places="2" number:min-decimal-places="2" number:min-integer-digits="1" number:grouping="true"/><number:text> €</number:text></number:number-style>
<style:style style:name="ce-cab" style:family="table-cell" style:parent-style-name="Default"><style:table-cell-properties fo:background-color="#c4e6d0"/><style:text-properties fo:font-weight="bold"/></style:style>
<style:style style:name="ce-fecha" style:family="table-cell" style:parent-style-name="Default" style:data-style-name="N-fecha"/>
<style:style style:name="ce-eur" style:family="table-cell" style:parent-style-name="Default" style:data-style-name="N-eur"/>
<style:style style:name="ce-eur-negrita" style:family="table-cell" style:parent-style-name="Default" style:data-style-name="N-eur"><style:text-properties fo:font-weight="bold"/></style:style>
</office:automatic-styles>
<office:body><office:spreadsheet>
${hoja('Gastos casa', 'CATEGORÍA', 'TOTAL', `of:=SUM(${rango('D')})`)}
${hoja('Le debo', 'TIPO', 'LE DEBO', pendiente)}
${hoja('Me debe', 'TIPO', 'ME DEBE', pendiente)}
<table:table table:name="Ajustes" table:style-name="ta1">
<table:table-column table:style-name="co-ajuste" table:default-cell-style-name="Default"/>
<table:table-column table:style-name="co-valor" table:default-cell-style-name="Default"/>
<table:table-row table:style-name="ro1">${texto('AJUSTE', 'ce-cab')}${texto('VALOR', 'ce-cab')}</table:table-row>
${AJUSTES.map(([k, v]) => `<table:table-row table:style-name="ro1">${texto(k)}${v ? texto(v) : vacias(1)}</table:table-row>`).join('\n')}
<table:table-row table:style-name="ro1" table:number-rows-repeated="20">${vacias(2)}</table:table-row>
</table:table>
</office:spreadsheet></office:body>
</office:document-content>
`;

const styles = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-styles xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" office:version="1.3">
<office:styles><style:style style:name="Default" style:family="table-cell"><style:text-properties fo:font-size="10pt"/></style:style></office:styles>
<office:automatic-styles><style:page-layout style:name="pm1"/></office:automatic-styles>
<office:master-styles><style:master-page style:name="Default" style:page-layout-name="pm1"/></office:master-styles>
</office:document-styles>
`;

const meta = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-meta xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0" office:version="1.3"><office:meta><meta:generator>Mi dinero</meta:generator></office:meta></office:document-meta>
`;

const manifest = `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.3">
<manifest:file-entry manifest:full-path="/" manifest:version="1.3" manifest:media-type="${MIME}"/>
<manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>
<manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>
<manifest:file-entry manifest:full-path="meta.xml" manifest:media-type="text/xml"/>
</manifest:manifest>
`;

// mimetype el primero y sin comprimir, como pide el formato
const zip = new JSZip();
zip.file('mimetype', MIME, { compression: 'STORE' });
zip.file('content.xml', content);
zip.file('styles.xml', styles);
zip.file('meta.xml', meta);
zip.file('META-INF/manifest.xml', manifest);
writeFileSync(new URL('../public/plantilla.ods', import.meta.url), await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', mimeType: MIME }));
console.log('public/plantilla.ods');
