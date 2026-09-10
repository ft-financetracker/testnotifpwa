# Backend Web Push

Backend kecil Node.js diperlukan karena Web Push membutuhkan payload encryption + VAPID signing. Private VAPID key **tidak boleh** berada di GitHub Pages atau Apps Script client.

## Setup

```bash
npm install
npx web-push generate-vapid-keys
cp .env.example .env
# isi key
npm start
```

Untuk prototype, subscription disimpan in-memory. Restart backend akan menghapus subscription. Untuk produksi, simpan subscription di database/Spreadsheet melalui API yang aman.

Deploy backend ke platform Node HTTPS (Cloud Run/Render/Railway/Fly.io/VPS). Set environment secrets di platform, bukan commit `.env`.
