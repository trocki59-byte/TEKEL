# Doğrulama ve uygulama kararları

- Kullanıcının doğrudan kodlama/yayın isteğiyle mevcut tasarımdan uygulamaya geçildi.
- Ortak kayıtlar Cloudflare D1'de. Kayıt sürümüyle atomik güncelleme; yarışan isteklerden yalnızca biri kazanır.
- Ürün formu açıldığı andaki kayıt ayrıca doğrulanır; arka planda gelen yeni stok bilgisi eski formla ezilemez.
- Bütün yazmalarda istemci işlem kimliği ve SHA-256 içerik özeti: yanıt kaybolursa aynı istek ikinci hareket oluşturmaz. Bekleyen istek tarayıcıda saklanır; yeni işlemden önce kontrol edilir.
- Katalog 80 taslak kayıt içerir. Tam/güncel katalog garantisi yok; barkod, fiyat ve stok kullanıcı doğrulaması gerekir. Kaynaklar lib/catalog.mjs'dedir.
- Nakit gider kasadan düşülür. Stok alımı otomatik nakit gider sayılmaz; nakit ödendiyse ayrıca gider kaydı yapılır. Nakit raporu açılış kasa sayımını içermez.
- İlk yayın owner-private; API ayrıca oturum ve Origin denetimi yapar. Genel erişime açmadan önce mağaza yetkilendirmesi ayrıca tasarlanmalıdır.
- Başlangıçta boş repo; ayrı worktree gerektiren kullanıcı değişikliği yoktu. Yeni uygulama kendi alt klasöründe tutuldu.
- Bağımsız inceleme: stok ezilmesi, belirsiz yanıt tekrarları ve sepet satırlarının birlikte artması bulguları düzeltildi. Tests/domain.test.mjs ve tests/storage.test.mjs gerileme kontrolleri içerir.
- Yerel tarayıcıda ürün fiyat/onay/stok düzenleme ve nakit satış doğrulandı: stok 25→24, ciro 110 TL. Bu test kayıtları üretim veritabanına taşınmaz.
- Windows UI denetimi adres güvenini kuramadığı için durdu; sonraki yayın ve GitHub işleri bağlı araçlar/standart Git üzerinden yapılır.

## Cari kartlar ve üç iskontolu faturalar — 29 Ekim
- 22 Node testi ve TypeScript kontrolü geçti. Yeni testler sıralı yüzde iskontoları, kalan kuruş dağıtımını, alış/satış stok ve borç etkilerini, eski yedekleri ve fatura tekrarının tek stok/ödeme oluşturmasını doğrular.
- Bağımsız incelemede iki önemli durum düzeltildi: belirsiz işlem sonrası başarılı global tekrar, yerel cari/fatura formlarını da kapatır; doğrulanmış sıfır maliyetli ürün, tam iskontolu alıştan sonra satılabilir. Sıfır maliyet için RED→GREEN testi eklendi.
- Yerel UI: TEST Tedarikçi ve TEST Müşteri eklendi. 10 paket × 100 TL alış, %10/%5/%2 → 837,90 TL veresiye borcu ve 24→34 stok. Bir paket 110 TL satış aynı iskontolarla 92,17 TL müşteri borcu ve 34→33 stok oluşturdu.
- 390×844 mobil görünümde yeni menüler ve fatura formu denetlendi. Açık yan menüde metinleri gizleyen CSS seçicisi düzeltildi ve tarayıcıda yeniden doğrulandı.
- Uygulayıcı kararı: iskontolar fatura genelinde sıralı yüzde olarak uygulanır. Fatura kesinleşince değiştirilemez; yeni stok/satış işlemi oluşturduğu formda açıklanır. Satır neti ürün son alış fiyatına kuruşla yuvarlanır. Ayrı vergi hesaplaması veya resmi e-belge entegrasyonu yoktur.
- Yerel test verileri üretime taşınmaz; paylaşılan D1 kaydı mevcut haliyle korunur, yeni listeler geriye uyumlu eklenir.

## Kamera okuyucu — 29 Ekim
- ZXing @zxing/browser 0.2.1 ve @zxing/library 0.23.0 isteğe bağlı yüklenir. EAN13/EAN8/UPC-A/Code128/ITF; rakam dışı veya 8–14 hane dışı sonuçlar yok sayılır. Görüntü cihazda kalır.
- Oturum tek sonuç verir; kapanma, arka plan, unmount ve geç izin durumlarında sahip olunan kaynaklar bırakılır. Yeniden başlatmada ayrı video DOM düğümü kullanılır; eski ZXing finalizer'ı yeni görüntüyü silemez.
- İncelemede UPC-E'nin yalnızca sıfır eklemeyle UPC-A'ya çevrilemeyeceği doğrulandı; bu format desteği çıkarıldı. Elle ürün kaydı da EAN/UPC eşdeğer barkod çakışmasını reddeder.
- 30 test, TypeScript kontrolü; gerçek ZXing ile sentetik EAN13 piksel görüntüsünü çözme ve çözülen üründen stok düşüren satış testi dahil.
- Yerel UI: kamera modalı ve 390×844 görünüm, kamerayı başlatmadan kapatma, ortak barkod girişinden bilinmeyen barkodu boş bir ürüne bağlama → sepete tek paket → nakit satış doğrulandı. Yalnızca yerel test verisi kullanıldı.
- Fiziksel telefon/kamera denemesi yapılmadı. İzin hata metinleri ve iptal davranışı kaynak sınırında otomatik testlerle denetlendi; kullanıcının telefonunda canlı okutma ayrıca denenmelidir.
