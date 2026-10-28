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
