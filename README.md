# CineArchive

`CineArchive`, Electron üzerinde çalışan bir film ve dizi arşiv uygulamasıdır. Kullanıcı filmi/diziyi arayabilir, detaylarını görebilir ve kişisel arşivine kaydedebilir.

## Özellikler

- TMDB API kullanarak film/dizi araması yapar.
- Film/dizi detayları, oyuncular, yönetmen/yapımcı, benzer içerikler ve izleme sağlayıcılarını gösterir.
- Kullanıcının favori arşivini yerel olarak `sinearsiv.json` dosyasında saklar.
- Windows üzerinde Roaming dizininde güvenli şekilde veri kaydeder.

## Kurulum

1. Proje klasörüne gidin:

```bash
cd c:\Users\emira\Documents\GitHub\cine-archive.app
```

2. Bağımlılıkları yükleyin:

```bash
npm install
```

3. `.env` dosyasını oluşturun ve içine TMDB API anahtarınızı ekleyin:

```env
TMDB_API_KEY=senin_gercek_tmdb_anahtarın
```

> `.env` dosyasında tırnak işareti kullanmayın.

## Çalıştırma

```bash
npm start
```

## Paketleme

Uygulamayı Windows için paketlemek isterseniz:

```bash
npm run build
```

## Dosya Yapısı

- `main.js` - Electron ana süreç ve pencere oluşturma.
- `preload.js` - Güvenli köprü ile `.env` değerlerini ve dosya işlemlerini renderer tarafına geçirir.
- `app.js` - Uygulama mantığı, API istekleri ve kullanıcı arayüzü yönetimi.
- `index.html` - Uygulamanın HTML yapısı.
- `style.css` - Kullanıcı arayüzü stilleri.

## Notlar

- `.env` dosyası `.gitignore` içinde listelenmiştir, bu sayede anahtarınız repoya eklenmez.
- TMDB API anahtarınızı koruyun ve başkalarıyla paylaşmayın.
- `dist/` klasörü derlenmiş uygulama dosyaları içerir; repodan silinmesi gerekebilir.
