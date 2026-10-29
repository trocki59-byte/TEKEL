import { createState, applyAction } from './domain.mjs';
import {normalizeInvoiceState} from './invoices.mjs';
export async function readState(db) {
    await db.prepare('INSERT OR IGNORE INTO store (id,data,version) VALUES (1,?,0)').bind(JSON.stringify(createState())).run();
    const row = await db.prepare('SELECT data,version FROM store WHERE id=1').first();
    if (!row)
        throw new Error('Kayıt okunamadı.');
    return { state: normalizeInvoiceState(JSON.parse(row.data)), version: row.version };
}
export async function writeState(db, version, state) {
    const result = await db.prepare('UPDATE store SET data=?,version=version+1 WHERE id=1 AND version=?').bind(JSON.stringify(state), version).run();
    if (result.meta.changes !== 1) {
        const e = new Error('Kayıtlar başka cihazda değişti. Güncelleyip tekrar deneyin.');
        e.status = 409;
        throw e;
    }
    return { state, version: version + 1 };
}
const json = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
export async function handleRequest(request, db, userId) {
    if (!userId)
        return json({ error: 'Oturum açmanız gerekiyor.' }, 401);
    if (!db)
        return json({ error: 'Ortak veritabanı henüz bağlanmadı.' }, 503);
    if (request.method === 'GET')
        return json(await readState(db));
    if (request.headers.get('origin') !== new URL(request.url).origin)
        return json({ error: 'İstek kaynağı reddedildi.' }, 403);
    try {
        const raw = await request.text();
        if (raw.length > 8000000)
            return json({ error: 'Dosya çok büyük (en fazla 8 MB).' }, 413);
        const body = JSON.parse(raw);
        if (!Number.isSafeInteger(body.version) || body.version < 0)
            throw new Error('Kayıt sürümü geçersiz.');
        if (typeof body.operationId !== 'string' || !/^[-a-zA-Z0-9]{8,100}$/.test(body.operationId))
            throw new Error('İşlem kimliği geçersiz.');
        const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(body.action))))).map(x => x.toString(16).padStart(2, '0')).join('');
        const current = await readState(db), prior = current.state.operations?.find(x => x.id === body.operationId);
        if (prior)
            return prior.hash === hash ? json(current) : json({ error: 'İşlem kimliği farklı içerikle tekrar kullanılamaz.' }, 409);
        if (current.version !== body.version)
            return json({ error: 'Kayıtlar başka cihazda değişti. Yeniden deneyin.' }, 409);
        const next = applyAction(current.state, body.action);
        next.operations = [...(current.state.operations || []), { id: body.operationId, hash }];
        return json(await writeState(db, body.version, next));
    }
    catch (e) {
        return json({ error: e.message || 'İşlem kaydedilemedi.' }, e.status || 400);
    }
}
