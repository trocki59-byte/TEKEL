# Troçki Studio • Bayi Yönetim

Türkçe, koyu temalı ve telefon/bilgisayar uyumlu özel işletme paneli.

## Özellikler
- Barkod okuyucuyla veya ürün kartıyla sepet, paket/karton, nakit/kart/veresiye satış.
- Ürün fiyatları, paket stokları, karton katsayısı ve stok girişleri.
- İstanbul saatine göre tarih aralıklı ciro, satış kârı ve nakit hareketi raporu.
- Müşteri borçları, nakit/kart tahsilat ve hesap hareketleri.
- JSON dışa aktarma/geri yükleme ve ürün CSV içe/dışa aktarma.
- Ortak Cloudflare D1 kaydı, atomik sürüm kontrolü ve tekrar işlem koruması.
- Açılış ekranında **Troçki Studio**.

## İlk kullanım
1. Özel yayın adresine, yayının sahibi olan ChatGPT hesabıyla giriş yapın.
2. Ürünler ekranında ürün adını, alış ve satış fiyatını, barkodu, stok sayımını ve karton paket sayısını doğrulayın. “Kontrol ettim” kutusunu işaretleyin.
3. Satış ekranında barkod okuyucu alanına odaklanın (F2). Okuyucunun Enter gönderme ayarını kullanın. Barkodsuz ürünler karttan seçilebilir.
4. Nakit/kart düğmeleri ödeme işlemini **kaydeder**; banka POS cihazından ücret çekmez.
5. Gün sonunda JSON yedeği indirip güvenli bir yerde saklayın.

80 ürün kaydı **taslak katalogdur**. Eksiksiz, güncel Türkiye çeşit/barkod/fiyat veritabanı değildir. Fiyat ve barkod uydurulmaz; başlangıç stok/fiyatları sıfırdır. Eksik çeşitler eklenebilir veya CSV ile aktarılabilir. Katalog araştırma kaynakları: [JTI](https://www.jti.com/en/our-brands), [Türkiye marka/seri araştırması](https://www.karekod.org/blog/turkiyede-satilan-sigara-markalari/).

## Çalıştırma
Node >=22.13, pnpm 11.25, Git gerekir.

```text
pnpm install --frozen-lockfile
pnpm test
pnpm exec tsc --noEmit
pnpm build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_aspiring_blur.sql
pnpm dev
```

Yerel test girişi: `http://127.0.0.1:5173/signin-with-chatgpt?return_to=/`. Test kimliği yalnızca loopback geliştirmede kullanılabilir. Üretim erişimini Sites yönetir. `.openai/hosting.json` içindeki `DB` binding'i ve Drizzle migrasyonları Sites tarafından üretime bağlanır.

## Veri ve güvenlik
Kayıt kaynağı tarayıcı değil, sunucudaki D1 veritabanıdır. İnternet gerekir. Telefon ve bilgisayarda aynı sahip hesabıyla giriş yapılır. Site owner-private kalmalıdır; genel yayına açmak için sunucu tarafında ayrıca mağaza üyelik yetkilendirmesi gerekir.

Para tamsayı kuruş olarak saklanır; satış maliyeti işlem anında sabitlenir. Eksi stok ve borcu aşan tahsilat reddedilir. Eşzamanlı eski kayıtla işlem 409 döndürür. Açık ürün formunun eski stok bilgisi başka cihazdaki satışı ezemez. Ağ yanıtı kaybolursa bekleyen işlem yerel depolamada korunur ve aynı kimlikle güvenle kontrol edilir; başka kayıt yapmadan önce bu işlem çözülmelidir.

Nakit hareketi = nakit satış + nakit tahsilat − nakit gider. Açılış kasa bakiyesi dahil değildir. Stok girişleri kasadan otomatik düşmez; nakit ödemeyi ayrıca gider olarak girin. Rapor muhasebe/fatura sistemi yerine geçmez. Satış iptali/iade ilk sürümde yoktur.

Bu ilk sürüm bütün işletme durumunu sürümlü tek JSON kayıtta saklar. D1 satır boyutu sınırına yaklaşmadan önce normalleştirilmiş hareket tablolarına geçiş gerekir; yüksek hacimli işletmelerde bu sürümü uzun süreli ana kayıt sistemi olarak devreye almadan önce kapasite çalışması yapılmalıdır. Yedekler en fazla 8 MB olarak içe alınır. Üretim verileri kaynak koduna veya GitHub'a eklenmez.

## Yayın ve kaynak
Sites plugin'in `site-workflow.mjs` yardımcısı kaynak eşitleme, paketleme ve özel yayını yönetir. GitHub kaynak aynası `scripts/github-sync.mjs` ile mevcut Git Credential Manager oturumundan gönderilir; anahtar veya parola dosyaya yazılmaz. Kod deposu özel oluşturulur. Yerel `.env`, runtime state, bağımlılıklar ve build çıktıları Git'e dahil edilmez.

Plan/tasarım ve doğrulama notları `docs/` altındadır.
