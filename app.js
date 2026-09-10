const VAPID_PUBLIC_KEY = 'BDK5-SovL3JYmdswM3RHeTA-hRZziZz-wt4ZRSb9xNZpk8Lb0zVfpRhfcbKSjOFJXztAX3hBkfQGq9MauEkeyy4';
const el = id => document.getElementById(id);
const log = (...v) => { const line='['+new Date().toLocaleTimeString()+'] '+v.map(x=>typeof x==='string'?x:JSON.stringify(x)).join(' '); el('log').textContent += line+'\n'; el('log').scrollTop=el('log').scrollHeight; console.log(...v); };
const b64ToU8 = s => { const pad='='.repeat((4-s.length%4)%4); const raw=atob((s+pad).replace(/-/g,'+').replace(/_/g,'/')); return Uint8Array.from([...raw].map(c=>c.charCodeAt(0))); };
function standalone(){return matchMedia('(display-mode: standalone)').matches || navigator.standalone===true;}
async function registration(){return await navigator.serviceWorker.ready;}
async function refresh(){
 el('notificationSupport').textContent=('Notification'in window)?'didukung':'tidak didukung';
 el('permission').textContent=('Notification'in window)?Notification.permission:'n/a';
 el('displayMode').textContent=standalone()?'standalone / installed':'browser tab';
 if('serviceWorker'in navigator){ const r=await navigator.serviceWorker.getRegistration(); el('swStatus').textContent=r?'registered':'belum'; if(r){const sub=await r.pushManager?.getSubscription();el('pushStatus').textContent=sub?'subscribed':'belum subscribe';} }
}
async function enable(){ if(!('Notification'in window)) throw Error('Notification API tidak didukung.'); const p=await Notification.requestPermission(); log('Permission:',p); await refresh(); }
async function localNotify(body='Ini adalah pesan dummy dari aplikasi PWA.'){
 if(Notification.permission!=='granted') throw Error('Permission belum granted.');
 const r=await registration(); r.active?.postMessage({type:'SHOW_NOTIFICATION',payload:{title:'Pesan Baru',body,url:'./?page=messages'}}); log('Local notification dikirim ke Service Worker.');
}
async function subscribe(){
 if(Notification.permission!=='granted') await enable();
 const r=await registration(); let sub=await r.pushManager.getSubscription();
 if(!sub) sub=await r.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64ToU8(VAPID_PUBLIC_KEY)});
 localStorage.setItem('pushSubscription',JSON.stringify(sub)); log('Push subscription tersedia.',{endpoint:sub.endpoint.slice(0,55)+'...'});
 const base=el('backendUrl').value.trim().replace(/\/$/,''); if(base){ await api('/api/subscribe',{subscription:sub,userId:'demo-user'}); log('Subscription tersimpan di backend.'); }
 await refresh(); return sub;
}
async function api(path,data){ const base=el('backendUrl').value.trim().replace(/\/$/,''); if(!base) throw Error('Isi Backend URL terlebih dahulu.'); const headers={'Content-Type':'application/json'}; const key=el('apiKey').value.trim(); if(key) headers['X-API-Key']=key; const res=await fetch(base+path,{method:'POST',headers,body:JSON.stringify(data)}); const json=await res.json().catch(()=>({})); if(!res.ok) throw Error(json.error||('HTTP '+res.status)); return json; }
async function simulate(){ await subscribe(); const result=await api('/api/send',{userId:'demo-user',title:'Pesan Baru',body:'Ada informasi baru untuk Anda',url:'./?page=messages'}); log('Remote push response:',result); }
function saveConfig(){localStorage.setItem('backendUrl',el('backendUrl').value.trim());localStorage.setItem('apiKey',el('apiKey').value.trim());log('Config backend disimpan di perangkat. Jangan gunakan API key sensitif pada deployment produksi frontend.');}
window.addEventListener('DOMContentLoaded',async()=>{
 el('backendUrl').value=localStorage.getItem('backendUrl')||''; el('apiKey').value=localStorage.getItem('apiKey')||'';
 if('serviceWorker'in navigator){ try{const r=await navigator.serviceWorker.register('./sw.js');log('Service Worker registered:',r.scope);}catch(e){log('SW ERROR:',e.message);} } else log('Service Worker tidak didukung.');
 el('enableBtn').onclick=()=>enable().catch(e=>log('ERROR:',e.message)); el('nowBtn').onclick=()=>localNotify().catch(e=>log('ERROR:',e.message));
 el('delayBtn').onclick=async()=>{try{log('Timer lokal dimulai: 5 detik...');await new Promise(r=>setTimeout(r,5000));log('Timer selesai. Meminta Service Worker menampilkan notification.');await localNotify();}catch(e){log('ERROR:',e.message)}};
 el('subscribeBtn').onclick=()=>subscribe().catch(e=>log('ERROR:',e.message)); el('simulateBtn').onclick=()=>simulate().catch(e=>log('ERROR:',e.message)); el('saveBackendBtn').onclick=saveConfig;
 await refresh(); log('App siap. Origin:',location.origin,'Standalone:',standalone());
});
