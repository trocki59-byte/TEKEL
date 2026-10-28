# Troçki Studio Bayi Yönetim

Kullanıcı koyu lacivert/mavi tasarım 2'yi, telefon ve bilgisayardan ortak kullanım ile Türkiye sigara kataloğunu seçti ve kodlama/yayın talimatı verdi. Açılışta tam olarak **Troçki Studio** yazacak.

Satış, ürün/fiyat düzenleme, stok girişi, kasa/gider, veresiye/tahsilat, rapor ve dışa aktarma tek uygulamada. İnternet bağlantılı, owner-private Sites erişimi ve D1 ortak kayıtlar. GitHub kaynak deposu ayrıca oluşturulacak; erişim engelleri açıkça bildirilecek. Yerel tarayıcı verisi ortak kayıtların kaynağı olmayacak.

Yaklaşımlar: cihaz içi kayıt ortak kullanımı sağlamaz; GitHub Pages tek başına veritabanı sağlamaz. Seçilen uygulama sunucuda doğrulanan işlemler ve D1 ile yayınlanır. Bu teknik seçim uygulayıcıya aittir.

Para kuruş olarak tutulur; paket temel birim, karton katsayısı ürün bazında düzenlenir. Satış, borç ve stok tek sürümlü atomik güncelleme ile saklanır. Eski sürümle işlem 409 döner. Stok eksiye düşmez, fiyat ve maliyet satış anında kaydedilir. Tahsilat borcu aşamaz. Müşterisiz veresiye olmaz. Paket açıp tek dal satış kapsam dışıdır.

Katalog başlangıç taslak listesidir: doğrulanmış tam barkod kataloğu erişilebilir değil. Uydurma barkod/fiyat yok; başlangıçta fiyat/stok sıfır, düzenlenmeden satış yapılamaz. Tam güncel Türkiye kataloğu garanti edilmez; kullanıcı eksikleri ekleyebilir ve CSV içe aktarabilir.

Görsel ürün ambalajı yerine sade ürün kartları; reklam değil özel işletme yönetimi. Yedek JSON tüm kayıtları içerir, geri yükleme doğrulanır ve açık kullanıcı onayı ister.
