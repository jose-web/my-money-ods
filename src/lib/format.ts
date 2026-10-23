// src/lib/format.ts
import { t } from './i18n.ts';

// los formatos van con el idioma actual: se crean de nuevo si cambia
let formatos: { locale: string; eur: Intl.NumberFormat; num: Intl.NumberFormat } | null = null;
function fmt() {
  if (formatos?.locale !== t.locale) {
    formatos = { locale: t.locale, eur: new Intl.NumberFormat(t.locale, { style: 'currency', currency: 'EUR' }), num: new Intl.NumberFormat(t.locale, { maximumFractionDigits: 2 }) };
  }
  return formatos;
}

export const eur = (n: number): string => fmt().eur.format(n || 0);
export const numero = (n: number): string => fmt().num.format(n || 0);

/** Un número tal como se escribe en un campo, con el separador decimal del idioma: 650,5 / 650.5. Con `ceros`, «0,00». */
export const numeroEditable = (n: number, ceros = false): string => {
  const s = ceros ? n.toFixed(2) : String(n);
  return t.locale.startsWith('es') ? s.replace('.', ',') : s;
};

/** Fecha y hora de un instante (p. ej. el modifiedTime de Drive) en el idioma actual: 09/10/2026, 19:55 */
export const fechaLarga = (iso: string): string =>
  new Date(iso).toLocaleString(t.locale, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/** 2026-10-09 → 09/10/2026 (igual en los dos idiomas: el inglés es el británico) */
export function fecha(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso;
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

/** 2026-10-09T20:15 → 09/10/2026 20:15 */
export const fechaHora = (iso: string): string => `${fecha(iso)}${iso.length > 10 ? ` ${iso.slice(11, 16)}` : ''}`;

/** fecha y hora local en ISO, sin zona: 2026-10-09T19:55 */
export const ahoraLocal = (): string => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);

/**
 * Acepta "1.234,56", "1,234.56", "1234.56" o "12,5". Con punto y coma, el decimal es el último; con solo uno de
 * los dos, es decimal salvo que separe miles en el idioma actual ("1.000" en español, "1,000" en inglés).
 * Devuelve null si no es un número.
 */
export function parseNum(s: string): number | null {
  const v = s.trim().replace(/\s|€|%/g, '');
  if (!v) return null;
  const coma = v.lastIndexOf(',');
  const punto = v.lastIndexOf('.');
  let norm = v;
  if (coma >= 0 && punto >= 0) norm = coma > punto ? v.replace(/\./g, '').replace(',', '.') : v.replace(/,/g, '');
  else if (coma >= 0) norm = !t.locale.startsWith('es') && /^-?\d{1,3}(,\d{3})+$/.test(v) ? v.replace(/,/g, '') : v.replace(',', '.');
  else if (punto >= 0 && t.locale.startsWith('es') && /^-?\d{1,3}(\.\d{3})+$/.test(v)) norm = v.replace(/\./g, '');
  const n = Number(norm);
  return Number.isFinite(n) ? n : null;
}

export const norm = (s: string): string =>
  s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
