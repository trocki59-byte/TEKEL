import { createState, validateState } from './domain.mjs';
const columns = ['name', 'brand', 'barcode', 'price', 'cost', 'stock', 'threshold', 'packsPerCarton', 'verified'];
const quote = x => '"' + String(x).replaceAll('"', '""') + '"';
export function productsCSV(products) { return [columns.join(';'), ...products.map(p => columns.map(k => quote(k === 'price' || k === 'cost' ? p[k] / 100 : k === 'verified' ? (p[k] ? '1' : '0') : p[k])).join(';'))].join('\r\n'); }
function parse(text) { const rows = []; let row = [], cell = '', quoted = false; for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
        if (quoted && text[i + 1] === '"') {
            cell += '"';
            i++;
        }
        else
            quoted = !quoted;
    }
    else if (c === ';' && !quoted) {
        row.push(cell);
        cell = '';
    }
    else if ((c === '\n' || c === '\r') && !quoted) {
        if (c === '\r' && text[i + 1] === '\n')
            i++;
        row.push(cell);
        if (row.some(x => x.trim()))
            rows.push(row);
        row = [];
        cell = '';
    }
    else
        cell += c;
} if (quoted)
    throw new Error('CSV tırnakları eşleşmiyor.'); row.push(cell); if (row.some(x => x.trim()))
    rows.push(row); return rows; }
export function parseProductsCSV(text) { const rows = parse(text.replace(/^\uFEFF/, '')); const header = rows.shift(); if (!header || columns.some((x, i) => header[i] !== x))
    throw new Error('CSV sütunları geçersiz. Önce ürün CSV dosyasını indirin.'); if (rows.length > 2000)
    throw new Error('En fazla 2000 ürün aktarılabilir.'); const products = rows.map((r, index) => { if (r.length !== columns.length)
    throw new Error(`Satır ${index + 2}: sütun sayısı hatalı.`); const p = Object.fromEntries(columns.map((k, i) => [k, r[i]])); for (const k of ['price', 'cost', 'stock', 'threshold', 'packsPerCarton']) {
    if (!String(p[k]).trim())
        throw new Error('Sayısal alanlar boş olamaz.');
    p[k] = Number(String(p[k]).replace(',', '.'));
    if (k === 'price' || k === 'cost')
        p[k] = Math.round(p[k] * 100);
} if (!['0', '1'].includes(p.verified))
    throw new Error('verified sütunu 0 veya 1 olmalı.'); p.verified = p.verified === '1'; const temporary = { ...p, id: 'csv-' + index }; const s = createState(); s.products = [temporary]; validateState(s); return { ...p, id: undefined }; }); return products; }
