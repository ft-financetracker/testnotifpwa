# PWA Notification Test

Prototype end-to-end untuk menguji **PWA Android + persistent notification + remote Web Push**.

## Arsitektur yang dipilih

```text
GitHub Pages PWA
  ├─ Notification API (tes lokal)
  ├─ Service Worker
  └─ PushManager subscription
          ↓
Browser Push Service
          ↑
Node.js Web Push backend (VAPID private key + encryption)
          ↑
Google Apps Script / Spreadsheet trigger
```

Saya memilih standar **Push API + VAPID + backend Node kecil**, bukan mengimplementasikan enkripsi Web Push di Apps Script. Apps Script ideal sebagai pemicu bisnis; backend Node menangani VAPID signing dan RFC Web Push encryption menggunakan library `web-push`.

> Tes **5 detik** hanya timer JavaScript lokal. Jika halaman/PWA benar-benar dihentikan OS, timer tersebut tidak membuktikan apa pun. Tes remote `/api/send` adalah jalur yang relevan untuk membuktikan server → push service → service worker → notifikasi HP.

## Struktur

```text
/
├─ index.html
├─ app.js
├─ sw.js
├─ manifest.json
├─ icons/
│  ├─ icon-192.png
│  └─ icon-512.png
├─ backend/
│  ├─ server.js
│  ├─ package.json
│  ├─ .env.example
│  └─ README_BACKEND.md
└─ apps-script/
   ├─ Code.gs
   └─ README_APPS_SCRIPT.md
```

## 1. Deploy frontend ke GitHub Pages

1. Buat repository baru, misalnya `pwa-notification-test`.
2. Upload `index.html`, `app.js`, `sw.js`, `manifest.json`, dan folder `icons` ke root repository.
3. GitHub → **Settings → Pages** → Deploy from branch → `main` / root.
4. Buka URL Pages melalui HTTPS.
5. Path manifest, service worker, icon, `start_url`, dan `scope` semuanya relatif sehingga aman untuk project-site seperti `username.github.io/pwa-notification-test/`.

## 2. Install Android

1. Buka URL GitHub Pages di Chrome Android.
2. Menu browser → **Install app / Add to Home screen**.
3. Buka hasil instalasi.
4. Status `Mode aplikasi` seharusnya `standalone / installed`.
5. Tekan **Aktifkan Notifikasi**, lalu izinkan.

Permission harus diminta melalui interaksi tombol pengguna. Jika sudah `denied`, ubah permission dari Site Settings Android/Chrome.

## 3. Tes local notification

- **Tes Notifikasi Sekarang** → page mengirim message ke Service Worker → `registration.showNotification()`.
- **Tes Notifikasi 5 Detik** → menunggu 5 detik di page → Service Worker menampilkan notification.
- Tap notification → Service Worker mencoba fokus/navigasi window PWA ke `./?page=messages`.

## 4. Setup remote Web Push backend

Di komputer/server Node:

```bash
cd backend
npm install
npx web-push generate-vapid-keys
cp .env.example .env
```

Isi `.env`:

```text
VAPID_PUBLIC_KEY=<public key>
VAPID_PRIVATE_KEY=<private key>
VAPID_SUBJECT=mailto:email-anda@example.com
API_KEY=<secret opsional>
```

**Penting:** public key yang dipakai backend harus sama dengan `VAPID_PUBLIC_KEY` di `app.js`. Prototype ZIP ini sudah memiliki public key dummy hasil generate, tetapi private key sengaja **tidak disertakan**. Generate pasangan key Anda sendiri sebelum tes remote.

Deploy backend ke host Node yang memiliki HTTPS. Jangan commit `.env` atau private key.

## 5. Tes remote push

1. Update `VAPID_PUBLIC_KEY` di `app.js` dengan public key milik backend lalu redeploy GitHub Pages.
2. Di PWA isi **Backend URL**, misalnya `https://push-backend.example.com`.
3. Jika backend memakai `API_KEY`, isi untuk prototype test. Untuk produksi, jangan expose shared server secret ke client; gunakan authentication/session aplikasi.
4. Tekan **Subscribe Remote Push**.
5. Tekan **Simulasikan Pesan Masuk**.
6. Payload yang dikirim:

```json
{"title":"Pesan Baru","body":"Ada informasi baru untuk Anda","url":"./?page=messages"}
```

Untuk pengujian yang lebih kuat, subscribe dahulu, lalu tutup PWA dari recent apps dan kirim `/api/send` dari backend/cURL/Apps Script. Hasil akhir tetap dipengaruhi kebijakan browser/OS, konektivitas, battery optimization, dan permission perangkat.

## 6. Hubungkan Google Apps Script

File `apps-script/Code.gs` menyediakan:

```javascript
sendNotification(userId, title, message, url)
```

Simpan URL backend dan API key di **Script Properties**. Setelah row pesan berhasil ditulis ke Spreadsheet, panggil `sendNotification()`.

Contoh alur final:

```text
User A kirim pesan
→ Apps Script validasi + append/update Spreadsheet
→ Apps Script sendNotification(toUserId, ...)
→ Node Web Push backend
→ browser push service
→ Service Worker User B menerima event push
→ showNotification()
→ User B tap
→ PWA fokus/buka ?page=messages
```

Untuk sistem multi-user, simpan mapping `userId → PushSubscription` secara persisten. Prototype backend saat ini menggunakan Map in-memory agar sederhana; produksi harus memakai database yang persisten.

## 7. Security

- VAPID **private key hanya di backend environment**.
- Jangan commit `.env`.
- Push subscription endpoint juga harus diperlakukan sebagai data sensitif/capability URL.
- Endpoint subscribe/send produksi harus memakai authentication + authorization dan proteksi CSRF yang sesuai.
- Shared `API_KEY` field di UI hanya fasilitas lab; jangan gunakan pola itu sebagai autentikasi produksi.
- Apps Script menyimpan backend secret di Script Properties.

## 8. Troubleshooting

**Install PWA tidak muncul:** pastikan GitHub Pages HTTPS, manifest dapat dibuka, icon 192/512 valid, service worker registered, dan tidak ada error console.

**Notification tidak muncul:** cek permission `granted`, Android notification setting untuk Chrome/PWA, service worker status, Focus/DND, dan log halaman.

**Remote subscribe gagal:** public VAPID key frontend harus cocok dengan key backend dan berbentuk URL-safe base64 P-256 public key.

**Remote send 404 subscription:** backend restart menghapus Map prototype; subscribe ulang. Untuk produksi gunakan persistent storage.

**Perubahan frontend tidak terlihat:** ubah `CACHE_NAME` di `sw.js` (v1 → v2), redeploy, lalu reload.

## 9. APK

PWA ini dapat dibungkus menjadi APK melalui **Trusted Web Activity (TWA/Bubblewrap)** atau **Capacitor**. Runtime ini memiliki Java tetapi tidak memiliki Android SDK/Gradle toolchain lengkap, sehingga APK debug tidak dibangun di sini. Untuk PWA hosted yang sudah stabil, TWA adalah jalur paling tipis karena aplikasi Android pada dasarnya membuka origin PWA yang terverifikasi.
