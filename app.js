const $ = id => document.getElementById(id);
const todayISO = () => new Date().toISOString().slice(0,10);
const fmtDateID = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
};
let data = {}; // {date: { kav: {LG:[], LT1:[], LT2:[], RENCANA:[], noJob:false, images:[{id, src, name}]}}}
let pendingImages = []; // images waiting to be added

function load(){
  const raw = localStorage.getItem('ritz-data-v2');
  if(raw){ 
    try{ data = JSON.parse(raw); }catch{}
  } else {
    // migrate from old key
    const old = localStorage.getItem('ritz-data');
    if(old){ try{ data = JSON.parse(old);}catch{} }
  }
  $('tanggal').value = todayISO();
  render();
}
function save(){ localStorage.setItem('ritz-data-v2', JSON.stringify(data)); render(); }
function getDay(){ const d=$('tanggal').value||todayISO(); if(!data[d]) data[d]={}; return data[d]; }

$('kavling').addEventListener('change', e=>{
  $('customKav').classList.toggle('hidden', e.target.value!=='Custom');
});

// IMAGE COMPRESS
function compressImage(file){
  return new Promise(res=>{
    const r = new FileReader();
    r.onload = e=>{
      const img = new Image();
      img.onload = ()=>{
        const canvas = document.createElement('canvas');
        const MAX = 1024;
        let w = img.width, h = img.height;
        if(w>MAX || h>MAX){
          if(w>h){ h = h*MAX/w; w=MAX; } else { w = w*MAX/h; h=MAX; }
        }
        canvas.width=w; canvas.height=h;
        canvas.getContext('2d').drawImage(img,0,0,w,h);
        res(canvas.toDataURL('image/jpeg',0.7));
      };
      img.src = e.target.result;
    };
    r.readAsDataURL(file);
  });
}

$('fotoInput').addEventListener('change', async e=>{
  const files = Array.from(e.target.files).slice(0,5);
  if(pendingImages.length + files.length > 5) return alert('Max 5 foto per input');
  for(const f of files){
    const src = await compressImage(f);
    pendingImages.push({id: Date.now()+Math.random(), src, name: f.name});
  }
  renderPending();
  $('fotoInput').value='';
});

function renderPending(){
  const c = $('fotoPreview');
  if(pendingImages.length===0){ c.innerHTML='<span class="text-[11px] text-slate-400">Belum ada foto</span>'; return; }
  c.innerHTML = pendingImages.map((im,i)=>`
    <div class="relative w-16 h-16">
      <img src="${im.src}" class="w-16 h-16 rounded-lg object-cover border">
      <button onclick="removePending(${i})" class="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-[10px]">x</button>
    </div>`).join('');
}
window.removePending = (i)=>{ pendingImages.splice(i,1); renderPending(); };

$('btnTambah').onclick = ()=>{
  let kav = $('kavling').value;
  if(kav==='Custom') kav = $('customKav').value.trim()||'Custom';
  const lantai = $('lantai').value;
  const pek = $('pekerjaan').value.trim();
  if(!pek && pendingImages.length===0) return alert('Isi pekerjaan atau foto dulu');
  const day = getDay();
  if(!day[kav]) day[kav]={LG:[],LT1:[],LT2:[],RENCANA:[],noJob:false, images:[]};
  if(!day[kav].images) day[kav].images=[];
  if(pek){
    day[kav].noJob=false;
    if(day[kav][lantai]) day[kav][lantai].push(pek);
    else day[kav][lantai]=[pek];
  }
  if(pendingImages.length){
    day[kav].images.push(...pendingImages);
    pendingImages=[];
  }
  $('pekerjaan').value='';
  renderPending();
  save();
};
$('btnNoJob').onclick = ()=>{
  let kav = $('kavling').value;
  if(kav==='Custom') kav = $('customKav').value.trim()||'Custom';
  const day=getDay();
  day[kav]={LG:[],LT1:[],LT2:[],RENCANA:[],noJob:true, images: pendingImages.length? [...pendingImages] : (day[kav]?.images||[]) };
  pendingImages=[]; renderPending();
  save();
};
$('tanggal').addEventListener('change', render);
$('btnReset').onclick = ()=>{
  if(!confirm('Reset laporan hari ini? Semua foto hari ini juga hilang.')) return;
  const d=$('tanggal').value; delete data[d]; save();
};

function buildText(){
  const proj = $('projectName').value||'THE RITZ Puncak Dieng';
  const iso = $('tanggal').value||todayISO();
  const day = data[iso]||{};
  const keys = Object.keys(day).sort();
  let out = `LAPORAN PROGRES LAPANGAN\n${proj.toUpperCase()}\n\n📅 Tanggal: ${fmtDateID(iso)}\n📍 Project: ${proj}\n`;
  if(keys.length===0) out+='\n(Belum ada data)';
  keys.forEach(kav=>{
    const v=day[kav];
    out+=`\n🏠 Area/Unit: ${kav}\n`;
    if(v.noJob){ out+='\nno job\n'; if(v.images?.length) out+=`📸 Foto: ${v.images.length} foto terlampir\n`; return; }
    out+='\n1. PEKERJAAN HARI INI\n';
    if(v.LG?.length) out+=`- LG (${v.LG.join(', ')})\n`;
    if(v.LT1?.length) out+=`- LT.1 (${v.LT1.join(', ')})\n`;
    if(v.LT2?.length) out+=`- LT.2 (${v.LT2.join(', ')})\n`;
    if(v.RENCANA?.length){ out+='\n2. RENCANA PEKERJAAN BESOK\n'; v.RENCANA.forEach(r=> out+=`- ${r}\n`); }
    if(v.images?.length) out+=`📸 Foto: ${v.images.length} foto terlampir (kirim manual setelah WA)\n`;
  });
  return out;
}

function render(){
  const iso=$('tanggal').value||todayISO();
  const day=data[iso]||{};
  const list=$('listLaporan');
  const keys=Object.keys(day).sort();
  if(keys.length===0){ list.innerHTML='<p class=text-slate-400>Belum ada laporan hari ini. Tambah di atas.</p>'; }
  else{
    list.innerHTML=keys.map(k=>{
      const v=day[k];
      const hasImg = v.images?.length||0;
      if(v.noJob) return `<div class="border rounded-lg p-3"><div class="flex justify-between"><span class="font-semibold">${k}</span><button onclick="delKav('${k}')" class="text-xs text-red-400">hapus</button></div><div class="mt-1"><span class="text-xs bg-slate-100 px-2 py-1 rounded">no job</span> ${hasImg?`<span class="text-xs">📸 ${hasImg}</span>`:''}</div>${renderThumbs(k,v)}</div>`;
      const all=[...(v.LG||[]).map(t=>`LG: ${t}`),...(v.LT1||[]).map(t=>`LT1: ${t}`),...(v.LT2||[]).map(t=>`LT2: ${t}`),...(v.RENCANA||[]).map(t=>`Rencana: ${t}`)].join('<br>');
      return `<div class="border rounded-lg p-3">
        <div class="font-semibold flex justify-between">${k} <div class="flex gap-2"><label class="text-xs bg-slate-900 text-white px-2 py-1 rounded cursor-pointer">+Foto<input type="file" accept="image/*" multiple class="hidden" onchange="addMoreFoto(event,'${k}')"></label><button onclick="delKav('${k}')" class="text-xs text-red-400">hapus</button></div></div>
        <div class="mt-1 text-slate-600">${all||'<span class=text-slate-400>kosong</span>'}</div>
        ${renderThumbs(k,v)}
      </div>`;
    }).join('');
  }
  $('preview').textContent=buildText();
}
function renderThumbs(kavKey, v){
  if(!v.images?.length) return '';
  return `<div class="flex flex-wrap gap-2 mt-2">${v.images.map((im,idx)=>`
    <div class="relative w-20 h-20 group">
      <img src="${im.src}" class="w-20 h-20 rounded-lg object-cover border cursor-pointer" onclick="openImg('${kavKey}',${idx})">
      <button onclick="delImg('${kavKey}',${idx})" class="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-[10px]">x</button>
    </div>`).join('')}</div>`;
}
window.delKav=(k)=>{
  const iso=$('tanggal').value; if(data[iso]){ delete data[iso][k]; save(); }
};
window.delImg=(kav, idx)=>{
  const iso=$('tanggal').value;
  if(data[iso]?.[kav]?.images){ data[iso][kav].images.splice(idx,1); save(); }
};
window.addMoreFoto = async (e,kav)=>{
  const files = Array.from(e.target.files).slice(0,5);
  const iso=$('tanggal').value;
  if(!data[iso]?.[kav]) return;
  if(!data[iso][kav].images) data[iso][kav].images=[];
  for(const f of files){
    const src = await compressImage(f);
    data[iso][kav].images.push({id:Date.now()+Math.random(), src, name:f.name});
  }
  save();
};
window.openImg=(kav, idx)=>{
  const iso=$('tanggal').value;
  const src=data[iso]?.[kav]?.images?.[idx]?.src;
  if(!src) return;
  const w=window.open('','_blank'); w.document.write(`<img src="${src}" style="max-width:100%">`);
};

$('btnCopy').onclick=()=>{ navigator.clipboard.writeText(buildText()).then(()=>alert('Tersalin!')); };
$('btnWAPagi').onclick=()=>{ const t=encodeURIComponent(buildText()); window.open(`https://wa.me/?text=${t}`,'_blank'); };
$('btnWASore').onclick=()=>{ const t=encodeURIComponent(buildText()); window.open(`https://wa.me/?text=${t}`,'_blank'); };
$('btnDownloadFoto').onclick=()=>{
  const iso=$('tanggal').value; const day=data[iso]||{};
  let count=0;
  Object.values(day).forEach(v=> (v.images||[]).forEach(im=>{
    const a=document.createElement('a'); a.href=im.src; a.download=`${iso}_${count++}.jpg`; a.click();
  }));
  if(count===0) alert('Belum ada foto hari ini');
};

function addTemplate(txt){ const el=$('pekerjaan'); if(!el.value) el.value=txt; else el.value += ' + ' + txt; el.focus(); } window.addTemplate=addTemplate; 

// init pending view
renderPending(); load();
