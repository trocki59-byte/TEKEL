# TEKEL: cari kartlar ve program içi faturalar

Kullanıcı tedarikçi, müşteri, alış ve satış faturası ile üç iskonto istedi; faturaların yalnızca program içinde kullanılacağını belirtti. Mevcut koyu tema, Troçki Studio kısa açılışı ve TEKEL uygulama adı korunur.

Uygulayıcı kararı: üç fatura geneli yüzde iskonto sırayla kalan tutara uygulanır; oranlar 0–100%, iki ondalık, her adım kuruşa yuvarlanır. Alış faturası stok ekler; net alış maliyeti ürünün son alış fiyatını günceller. Satış faturası tek satış hareketi ve stok düşüşü oluşturur. Satış toplamı/net kâr iskonto sonrası tutardan hesaplanır. Vergi ayrıca hesaplanmaz; kullanıcı fatura birim tutarını girer. Belgeler açıkça program içi kayıt olarak gösterilir/yazdırılır.

Tedarikçi ve müşteride ad/unvan, telefon, adres, vergi/kimlik referansı (isteğe bağlı). Mevcut müşteriler korunur. Bakiye serbest düzenlenmez; hareketlerden türetilir. Tedarikçi borcu alış faturaları eksi ödemeler; müşterinin veresiye faturası mevcut veresiye satış/tahsilat akışına katılır. Nakit alış ödemesi nakit hareketinden düşer, kârdan ikinci kez düşülmez.

Faturalar numara, tarih, cari kart, ürün satırları, paket/karton miktarı, fiyat, üç oran, tutarlar ve ödeme türü içerir. Kayıtlar kesinleştikten sonra değiştirilemez/silinmez. Belge anındaki cari/ürün bilgileri sabitlenir. Alışta aynı tedarikçi+numara, satışta aynı numara tekrar edemez. Fatura yeni bir alış/satış oluşturur; yapılmış bir POS satışı yeniden faturalanmaz. İnternet belirsizliği için mevcut işlem kimliği koruması kullanılır.

Eski JSON kayıtları/backup uyumlu biçimde boş yeni listelere yükseltilir; DB şeması değişmez. Yazdırma görünümü sadece seçilen belgeyi içerir. Telefon menüsü tüm yeni ekranlara erişir.
