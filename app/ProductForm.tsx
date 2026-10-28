'use client';
import type { Product } from '../lib/types';
export default function ProductForm({ product, busy, onSave }: {
    product: Product;
    busy: boolean;
    onSave: (p: Product) => void;
}) {
    return <form className="form-grid" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); onSave({ ...product, name: String(f.get('name')), brand: String(f.get('brand')), barcode: String(f.get('barcode')), cost: Math.round(Number(f.get('cost')) * 100), price: Math.round(Number(f.get('price')) * 100), stock: Number(f.get('stock')), threshold: Number(f.get('threshold')), packsPerCarton: Number(f.get('packsPerCarton')), verified: f.get('verified') === 'on' }); }}>
 <label className="wide">Ürün adı<input name="name" defaultValue={product.name} required maxLength={140}/></label><label>Marka<input name="brand" defaultValue={product.brand} required maxLength={140}/></label><label>Barkod<input name="barcode" inputMode="numeric" pattern="[0-9]{8,14}" defaultValue={product.barcode} placeholder="Paket üzerindeki barkod"/></label>
 <label>Alış fiyatı (₺ / paket)<input name="cost" type="number" min="0" max="10000000" step="0.01" defaultValue={product.cost / 100} required/></label><label>Satış fiyatı (₺ / paket)<input name="price" type="number" min="0" max="10000000" step="0.01" defaultValue={product.price / 100} required/></label><label>Stok (paket)<input name="stock" type="number" min="0" step="1" defaultValue={product.stock} required/></label><label>Azalan stok eşiği<input name="threshold" type="number" min="0" step="1" defaultValue={product.threshold} required/></label><label>Kartondaki paket sayısı<input name="packsPerCarton" type="number" min="1" max="100" step="1" defaultValue={product.packsPerCarton} required/></label><label className="checkbox wide"><input name="verified" type="checkbox" defaultChecked={product.verified}/> Ürün çeşidini ve fiyatlarını kontrol ettim.</label><p className="hint wide">Barkod bilinmiyorsa boş bırakın. Satış için alış/satış fiyatı ve kontrol onayı gerekir. Karton fiyatı, paket fiyatı × paket sayısıdır.</p><button className="btn primary wide" disabled={busy}>Ürünü kaydet</button>
 </form>;
}
