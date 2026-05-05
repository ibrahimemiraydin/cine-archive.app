const TMDB_API_KEY = window.env?.TMDB_API_KEY || "YOUR_TMDB_API_KEY_HERE"; // .env'den gelecek anahtar
const IMG_URL = "https://image.tmdb.org/t/p/w500";

let filmListesi = window.api.verileriYukle() || [];
let seciliFilmId = null;
let mevcutFiltre = 'tumu';
let mevcutSirala = 'newest';
let searchTimer;

// --- ARAMA TEMİZLE ---
function aramaTemizle() {
    const input = document.getElementById('filmInput');
    const dropdown = document.getElementById('searchDropdown');
    const clearBtn = document.getElementById('clearSearch');
    input.value = "";
    dropdown.innerHTML = "";
    dropdown.classList.add('hidden');
    clearBtn.classList.add('hidden');
    input.focus();
}

// --- API ENGINE ---
async function fetchMovieData(param, isId = false) {
    try {
        let type, id;
        if(isId) {
            id = param.id;
            type = param.media_type === "tv" ? "tv" : "movie";
        } else {
            const searchRes = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(param)}&language=tr-TR`);
            const searchData = await searchRes.json();
            if (!searchData.results || searchData.results.length === 0) return null;
            const f = searchData.results[0];
            id = f.id; type = f.media_type === "tv" ? "tv" : "movie";
        }
        
        const [d, c, v, s, w] = await Promise.all([
            fetch(`https://api.themoviedb.org/3/${type}/${id}?api_key=${TMDB_API_KEY}&language=tr-TR`).then(r => r.json()),
            fetch(`https://api.themoviedb.org/3/${type}/${id}/credits?api_key=${TMDB_API_KEY}&language=tr-TR`).then(r => r.json()),
            fetch(`https://api.themoviedb.org/3/${type}/${id}/videos?api_key=${TMDB_API_KEY}`).then(r => r.json()),
            fetch(`https://api.themoviedb.org/3/${type}/${id}/similar?api_key=${TMDB_API_KEY}&language=tr-TR`).then(r => r.json()),
            fetch(`https://api.themoviedb.org/3/${type}/${id}/watch/providers?api_key=${TMDB_API_KEY}`).then(r => r.json())
        ]);

        let directorData = null;
        if (type === "movie") {
            const dr = c.crew?.find(person => person.job === "Director");
            if(dr) directorData = { name: dr.name, img: dr.profile_path ? IMG_URL + dr.profile_path : null };
        } else {
            const cr = d.created_by?.[0];
            if(cr) directorData = { name: cr.name, img: cr.profile_path ? IMG_URL + cr.profile_path : null };
        }

        return {
            id: d.id, 
            poster: d.poster_path ? IMG_URL + d.poster_path : null,
            ozet: d.overview, 
            yil: (d.release_date || d.first_air_date || "").split("-")[0],
            tur: type === "movie" ? "FİLM" : "DİZİ", 
            imdb: d.vote_average?.toFixed(1) || "0.0",
            runtime: d.runtime || (d.episode_run_time ? d.episode_run_time[0] : 0) || 0,
            sure: type === "movie" 
                  ? (d.runtime + " dk") 
                  : (d.number_of_seasons + " Sezon / " + d.number_of_episodes + " Bölüm"),
            slogan: d.tagline,
            genres: d.genres?.map(g => g.name) || [],
            director: directorData,
            providers: w.results?.TR?.flatrate?.slice(0, 4).map(p => ({ 
                img: IMG_URL + p.logo_path, 
                name: p.provider_name,
                watchLink: w.results?.TR?.link 
            })) || [],
            actors: c.cast?.slice(0, 10).map(a => ({ 
                name: a.name, 
                character: a.character,
                img: a.profile_path ? IMG_URL + a.profile_path : null 
            })),
            trailer: v.results?.find(vid => vid.type === "Trailer" && vid.site === "YouTube")?.key,
            similar: s.results?.slice(0, 6).map(sm => ({ 
                id: sm.id,
                name: sm.title || sm.name, 
                img: sm.poster_path ? IMG_URL + sm.poster_path : null 
            }))
        };
    } catch (err) { console.error(err); }
    return null;
}

// --- UI UPDATES ---
function detayModalKapat() { 
    const overlay = document.getElementById('detayOverlay');
    overlay.classList.remove('open'); 
    setTimeout(() => { overlay.classList.add('hidden'); }, 400); 
}

function siralaSec(value, label) {
    mevcutSirala = value;
    document.getElementById('sortLabel').textContent = label;
    document.querySelectorAll('[data-value]').forEach(item => {
        item.classList.remove('active');
        if(item.getAttribute('data-value') === value) item.classList.add('active');
    });
    document.getElementById('dropdownMenu').classList.add('hidden');
    ekraniGuncelle();
}

async function canliArama(query) {
    const dropdown = document.getElementById('searchDropdown');
    const clearBtn = document.getElementById('clearSearch');
    if (query.length > 0) { clearBtn.classList.remove('hidden'); } else { clearBtn.classList.add('hidden'); dropdown.classList.add('hidden'); return; }
    
    clearTimeout(searchTimer);
    if (query.length < 2) { dropdown.classList.add('hidden'); return; }
    
    searchTimer = setTimeout(async () => {
        const res = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=tr-TR`);
        const data = await res.json();
        if (data.results?.length > 0) {
            dropdown.innerHTML = ""; dropdown.classList.remove('hidden');
            data.results.slice(0, 6).forEach(item => {
                const titleText = item.title || item.name;
                const div = document.createElement('div');
                div.className = "flex items-center gap-4 p-3 rounded-xl cursor-pointer hover:bg-zinc-800 transition-colors border-b border-white/5 last:border-0";
                div.onmousedown = () => filmSecVeEkle(item);
                div.title = titleText; 
                div.innerHTML = `
                    <img src="${item.poster_path ? IMG_URL + item.poster_path : 'https://via.placeholder.com/45x65'}" class="w-12 h-16 object-cover rounded-lg shrink-0">
                    <div class="flex flex-col overflow-hidden">
                        <span class="text-white font-bold text-sm truncate italic uppercase">${titleText}</span>
                        <span class="text-red-500 font-bold text-[10px]">${(item.release_date || item.first_air_date || "").split("-")[0]}</span>
                    </div>`;
                dropdown.appendChild(div);
            });
        }
    }, 300);
}

function ekraniGuncelle() {
    const list = document.getElementById('liste');
    list.innerHTML = "";
    const search = document.getElementById('searchFilter').value.toLowerCase();
    
    const izlenenler = filmListesi.filter(f => f.kategori === 'izlenenler');
    document.getElementById('count').textContent = filmListesi.length;
    const toplamDakika = izlenenler.reduce((acc, f) => acc + (f.apiData?.runtime || 0), 0);
    document.getElementById('totalTime').textContent = Math.round(toplamDakika / 60);
    const puanliFilmler = izlenenler.filter(f => parseFloat(f.puan) > 0);
    document.getElementById('avgScore').textContent = puanliFilmler.length > 0 ? (puanliFilmler.reduce((acc, f) => acc + parseFloat(f.puan), 0) / puanliFilmler.length).toFixed(1) : "0.0";

    let filtered = [...filmListesi];
    if(mevcutFiltre !== 'tumu') filtered = mevcutFiltre === 'favoriler' ? filtered.filter(f => f.favori) : filtered.filter(f => f.kategori === mevcutFiltre);
    if(search) filtered = filtered.filter(f => f.ad.toLowerCase().includes(search));
    
    filtered.sort((a, b) => {
        if (mevcutSirala === 'myScore') return b.puan - a.puan;
        if (mevcutSirala === 'imdbScore') return (parseFloat(b.apiData?.imdb) || 0) - (parseFloat(a.apiData?.imdb) || 0);
        if (mevcutSirala === 'alphabetical') return a.ad.localeCompare(b.ad);
        return 0; 
    });

    filtered.forEach(f => {
        const card = document.createElement('div');
        card.className = "movie-card relative h-[380px] bg-[#16161e] rounded-[32px] border border-zinc-800 overflow-hidden cursor-pointer group transition-all duration-500 hover:-translate-y-3 hover:border-red-600 z-0 isolation-isolate";
        card.title = f.ad;
        card.onclick = () => detayModalAc(f.id);
        card.innerHTML = `
            <img src="${f.apiData?.poster || ''}" class="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-all duration-500 scale-100 group-hover:scale-110">
            <div class="absolute top-6 left-6 bg-black/60 backdrop-blur-xl px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2 z-20 font-black text-xs text-white italic">
                <i data-lucide="star" class="w-4 h-4 fill-yellow-500 text-yellow-500"></i>${f.apiData?.imdb || "0.0"}
            </div>
            <div class="absolute top-6 right-6 flex flex-col gap-2 z-30 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                <button onclick="event.stopPropagation(); filmDuzenle(${f.id})" class="p-2.5 bg-zinc-900/90 hover:bg-blue-600 rounded-xl border border-white/10 text-white transition-all"><i data-lucide="pencil" class="w-4 h-4"></i></button>
                <button onclick="event.stopPropagation(); filmSil(${f.id})" class="p-2.5 bg-zinc-900/90 hover:bg-red-600 rounded-xl border border-white/10 text-white transition-all"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </div>
            <div class="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10"></div>
            <div class="absolute bottom-0 inset-x-0 p-6 z-20">
                <h3 class="text-sm font-black text-white truncate mb-4 uppercase tracking-tighter italic">${f.ad}</h3>
                <div class="flex items-center justify-between pointer-events-auto">
                    <button onclick="event.stopPropagation(); izlendiToggle(${f.id})" class="transition-colors ${f.kategori === 'izlenenler' ? 'text-green-500' : 'text-zinc-500 hover:text-white'}"><i data-lucide="check-circle" class="w-6 h-6"></i></button>
                    <button onclick="event.stopPropagation(); favoriToggle(${f.id})" class="transition-colors ${f.favori ? 'text-red-600' : 'text-zinc-500 hover:text-white'}"><i data-lucide="heart" class="w-6 h-6" ${f.favori ? 'fill="currentColor"' : ''}></i></button>
                </div>
            </div>`;
        list.appendChild(card);
    });
    lucide.createIcons();
}

async function filmSecVeEkle(tmdbItem) {
    aramaTemizle();
    document.getElementById('addBtn').textContent = "...";
    const apiData = await fetchMovieData(tmdbItem, true);
    if(apiData) {
        filmListesi.unshift({ id: Date.now(), ad: tmdbItem.title || tmdbItem.name, kategori: 'izlenecekler', favori: false, puan: 0, not: "", apiData: apiData });
        window.api.verileriKaydet(filmListesi);
    }
    document.getElementById('addBtn').textContent = "EKLE"; ekraniGuncelle();
}

async function filmEkle() {
    const input = document.getElementById('filmInput');
    if(!input.value.trim()) return;
    document.getElementById('addBtn').textContent = "...";
    const api = await fetchMovieData(input.value.trim(), false);
    if(api) {
        filmListesi.unshift({ id: Date.now(), ad: input.value.trim(), kategori: 'izlenecekler', favori: false, puan: 0, not: "", apiData: api });
        window.api.verileriKaydet(filmListesi);
    }
    input.value = "";
    document.getElementById('addBtn').textContent = "EKLE"; ekraniGuncelle();
}

function detayModalAc(id) {
    let f, api;
    if(typeof id === 'object') {
        api = id;
        seciliFilmId = null;
    } else {
        seciliFilmId = id;
        f = filmListesi.find(x => x.id === id);
        api = f.apiData || {};
    }
    
    document.getElementById('detayBaslik').textContent = api.name || api.title || f?.ad || "Bilinmiyor";
    document.getElementById('detayIMDB').textContent = api.imdb || "0.0";
    document.getElementById('detayOzet').textContent = api.ozet || "Bilgi yok.";
    document.getElementById('detayNotlar').value = f ? (f.not || "") : "";
    document.getElementById('detayPuanSlider').value = f ? (f.puan || 0) : 0;
    document.getElementById('detayPuanText').textContent = f ? (f.puan || 0) : 0;
    document.getElementById('detayPosterImg').src = api.poster || "";
    document.getElementById('detayTur').textContent = api.tur || "İÇERİK";
    document.getElementById('detayYil').textContent = api.yil || "-";
    document.getElementById('detaySure').textContent = api.sure || "-";

    const sloganEl = document.getElementById('detaySlogan');
    if(api.slogan && api.slogan.trim() !== "") {
        sloganEl.textContent = api.slogan;
        sloganEl.title = api.slogan;
        sloganEl.classList.remove('hidden');
    } else { sloganEl.classList.add('hidden'); }

    const genreDiv = document.getElementById('detayTurListesi');
    genreDiv.innerHTML = "";
    api.genres?.forEach(g => {
        genreDiv.innerHTML += `<span class="bg-red-600/10 text-red-500 border border-red-500/20 px-3 py-1 rounded-lg text-[10px] font-black uppercase italic">${g}</span>`;
    });

    const dirDiv = document.getElementById('directorContent');
    dirDiv.innerHTML = "";
    if (api.director) {
        dirDiv.innerHTML = `
            <div class="flex items-center gap-4 bg-zinc-900/50 p-3 rounded-2xl border border-zinc-800 w-fit" title="${api.director.name}">
                <img src="${api.director.img || 'https://via.placeholder.com/60'}" class="w-14 h-14 rounded-full object-cover border-2 border-zinc-700">
                <span class="text-white font-black italic text-xl uppercase tracking-tight">${api.director.name}</span>
            </div>`;
    }

    const provSection = document.getElementById('providerSection');
    const provDiv = document.getElementById('providerList');
    provDiv.innerHTML = "";
    if(api.providers?.length > 0) {
        provSection.classList.remove('hidden');
        api.providers.forEach(p => {
            provDiv.innerHTML += `<img src="${p.img}" title="${p.name}" class="w-11 h-11 rounded-xl border border-white/10 cursor-pointer hover:scale-110 transition-transform" onclick="window.electronAPI.openLink('${p.watchLink}')">`;
        });
    } else { provSection.classList.add('hidden'); }

    const tBtn = document.getElementById('trailerBtn');
    if(api.trailer) {
        tBtn.classList.remove('hidden');
        tBtn.onclick = () => window.electronAPI.openLink(`https://www.youtube.com/watch?v=${api.trailer}`);
    } else { tBtn.classList.add('hidden'); }

    const actDiv = document.getElementById('actorList'); 
    actDiv.innerHTML = "";
    if(api.actors?.length > 0) {
        document.getElementById('actorSection').classList.remove('hidden');
        api.actors.forEach(a => {
            actDiv.innerHTML += `
                <div class="flex flex-col items-center text-center" title="${a.name} (${a.character || '-'})">
                    <img src="${a.img || 'https://via.placeholder.com/90'}" class="w-20 h-20 rounded-full object-cover border-2 border-zinc-800 mb-2">
                    <span class="text-white font-black uppercase italic text-[10px] leading-tight truncate w-24">${a.name}</span>
                    <span class="text-zinc-500 font-bold uppercase italic text-[8px] mt-1 truncate w-24">${a.character || '-'}</span>
                </div>`;
        });
    }

    const simDiv = document.getElementById('similarList');
    simDiv.innerHTML = "";
    if(api.similar?.length > 0) {
        document.getElementById('similarSection').classList.remove('hidden');
        api.similar.forEach(s => {
            const card = document.createElement('div');
            card.className = "min-w-[140px] group cursor-pointer";
            card.title = s.name;
            card.onclick = async () => {
                detayModalKapat();
                const fullData = await fetchMovieData(s.name);
                if(fullData) setTimeout(() => detayModalAc(fullData), 450);
            };
            card.innerHTML = `
                <img src="${s.img || 'https://via.placeholder.com/140x200'}" class="w-full h-[200px] object-cover rounded-2xl border border-zinc-800 group-hover:border-red-600 transition-all">
                <p class="text-[9px] text-white font-bold truncate uppercase text-center mt-2 italic">${s.name}</p>`;
            simDiv.appendChild(card);
        });
    } else { document.getElementById('similarSection').classList.add('hidden'); }

    document.getElementById('detayOverlay').classList.remove('hidden');
    setTimeout(() => document.getElementById('detayOverlay').classList.add('open'), 10);
    lucide.createIcons();
}

function detayKaydet() {
    if(!seciliFilmId) { alert("Bu içerik arşivinde değil kanka, önce eklemen lazım."); return; }
    const f = filmListesi.find(x => x.id === seciliFilmId);
    f.puan = document.getElementById('detayPuanSlider').value;
    f.not = document.getElementById('detayNotlar').value;
    window.api.verileriKaydet(filmListesi);
    detayModalKapat(); ekraniGuncelle();
}

function modalKapat() { document.getElementById('modalOverlay').classList.add('hidden'); }

function filmSil(id) {
    const m = document.getElementById('modalOverlay');
    document.getElementById('modalTitle').textContent = "KALDIR";
    document.getElementById('modalDesc').textContent = "Bu içerik arşivden silinecek.";
    document.getElementById('modalInputContainer').classList.add('hidden');
    document.getElementById('modalConfirmBtn').onclick = () => { 
        filmListesi = filmListesi.filter(x => x.id !== id); 
        window.api.verileriKaydet(filmListesi); 
        ekraniGuncelle(); 
        modalKapat(); 
    };
    m.classList.remove('hidden');
}

function filmDuzenle(id) {
    const f = filmListesi.find(x => x.id === id);
    const m = document.getElementById('modalOverlay');
    document.getElementById('modalTitle').textContent = "DÜZENLE";
    document.getElementById('modalDesc').textContent = "İsmi değiştir:";
    document.getElementById('modalInputContainer').classList.remove('hidden');
    const input = document.getElementById('modalInput'); input.value = f.ad;
    document.getElementById('modalConfirmBtn').onclick = () => { 
        if(input.value.trim()) { 
            f.ad = input.value.trim(); 
            window.api.verileriKaydet(filmListesi); 
            ekraniGuncelle(); 
            modalKapat(); 
        } 
    };
    m.classList.remove('hidden'); setTimeout(() => input.focus(), 100);
}

// --- GLOBAL CLICK LISTENER (Dropdowns & Search Close) ---
document.addEventListener('mousedown', (e) => {
    // Sıralama Dropdown Kapatma
    const trigger = document.getElementById('triggerBtn');
    const menu = document.getElementById('dropdownMenu');
    if (trigger && !trigger.contains(e.target) && menu && !menu.contains(e.target)) {
        menu.classList.add('hidden');
    } else if (trigger && trigger.contains(e.target)) {
        menu.classList.toggle('hidden');
    }

    // Arama Dropdown Kapatma (DIŞARI TIKLANINCA)
    const searchDropdown = document.getElementById('searchDropdown');
    const searchInput = document.getElementById('filmInput');
    if (searchDropdown && !searchDropdown.contains(e.target) && searchInput && !searchInput.contains(e.target)) {
        searchDropdown.classList.add('hidden');
    }
});

function ayarlarModalAc() { document.getElementById('ayarlarOverlay').classList.remove('hidden'); }
function ayarlarModalKapat() { document.getElementById('ayarlarOverlay').classList.add('hidden'); }

function verileriDisaAktar() {
    const data = JSON.stringify(filmListesi);
    const blob = new Blob([data], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `sinearsiv_backup.json`; a.click();
}

function verileriIceAktar(event) {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try { 
            const content = JSON.parse(e.target.result); 
            if (Array.isArray(content)) { 
                filmListesi = content; window.api.verileriKaydet(filmListesi); 
                ekraniGuncelle(); ayarlarModalKapat(); 
            } 
        } catch (err) { alert("Hatalı dosya formatı!"); }
    };
    reader.readAsText(file); event.target.value = '';
}

function verileriSifirlaBirinciAsama() {
    ayarlarModalKapat();
    const m = document.getElementById('modalOverlay');
    document.getElementById('modalTitle').textContent = "ARŞİVİ SIFIRLA";
    document.getElementById('modalDesc').textContent = "Emin misin? Bu işlem geri alınamaz!";
    document.getElementById('modalInputContainer').classList.add('hidden');
    document.getElementById('modalConfirmBtn').onclick = () => { 
        filmListesi = []; window.api.verileriKaydet([]); ekraniGuncelle(); modalKapat(); 
    };
    m.classList.remove('hidden');
}

function filtrele(k) { 
    mevcutFiltre = k; 
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active')); 
    document.getElementById('btn-' + k).classList.add('active'); 
    ekraniGuncelle(); 
}

function favoriToggle(id) { 
    const f = filmListesi.find(x => x.id === id); 
    f.favori = !f.favori; 
    window.api.verileriKaydet(filmListesi); 
    ekraniGuncelle(); 
}

function izlendiToggle(id) { 
    const f = filmListesi.find(x => x.id === id); 
    f.kategori = (f.kategori === 'izlenenler' ? 'izlenecekler' : 'izlenenler'); 
    window.api.verileriKaydet(filmListesi); 
    ekraniGuncelle(); 
}

ekraniGuncelle();