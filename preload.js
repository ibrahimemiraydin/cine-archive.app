const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const userDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'sinearsiv');

// Klasör daha önce oluşturulmadıysa (ilk kurulumda) otomatik olarak oluşturuyoruz.
if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
}

// Yeni güvenli kayıt dosyası yolu
const filePath = path.join(userDataPath, 'sinearsiv.json');

contextBridge.exposeInMainWorld('api', {
    verileriYukle: () => {
        try {
            if (fs.existsSync(filePath)) {
                const data = fs.readFileSync(filePath, 'utf8');
                return JSON.parse(data);
            }
        } catch (error) {
            console.error("Dosya okunurken hata oluştu:", error);
        }
        return [];
    },
    verileriKaydet: (veriler) => {
        try {
            // Veriyi Roaming içindeki sinearsiv klasörüne yazıyoruz, Windows buna asla engel olmaz.
            fs.writeFileSync(filePath, JSON.stringify(veriler, null, 2));
        } catch (error) {
            console.error("Dosya kaydedilirken hata oluştu:", error);
        }
    }
});

// .env'deki değerleri renderer tarafına geçiriyoruz
contextBridge.exposeInMainWorld('env', {
    TMDB_API_KEY: process.env.TMDB_API_KEY || ''
});

// Fragmanları varsayılan tarayıcıda açmak için kullanılan köprü
contextBridge.exposeInMainWorld('electronAPI', {
    openLink: (url) => ipcRenderer.send('open-url', url)
});