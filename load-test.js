import http from 'k6/http';
import { check, sleep } from 'k6';

// Konfigurasi Beban Ekstrem
export const options = {
    // 500 Siswa/Virtual User (VU) yang sama-sama menekan "Hadir" seketika di detik yang MURNI sama.
    vus: 500, 
    // Mereka akan terus menerus memberondong server selama 30 detik (Total bisa mencapai puluhan ribu Request).
    duration: '30s', 
};

// Fungsi yang dieksekusi oleh 500 siswa virtual secara pararel
export default function () {
    const url = 'http://localhost:8000/student/attendance/sync';
    
    // Payload JSON mirip seperti buatan IndexedDB
    const payload = JSON.stringify({
        items: [
            {
                // __VU x __ITER bikin kunci unik agar nggak kena filter antrean awal
                idempotency_key: `k6-test-${__VU}-${__ITER}`, 
                session_id: 1,  // ID Sesi bebas
                attendance_code: 'TEST',
                status: 'present',
                submitted_at: new Date().toISOString(),
                device_info: 'k6-load-test',
            }
        ]
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            
            // ============================================
            // ⚠️ PENTING: Ganti Isi Cookie & Token ini!
            // ============================================
             // 1. Copy dari Chrome > F12 > Network > Headers permintaan /sync terakhirmu
            'X-XSRF-TOKEN': 'PASTE_XSRF_VALUE_DISINI', 
            'Cookie': 'XSRF-TOKEN=PASTE_XSRF_VALUE; laravel_session=PASTE_LARAVEL_SESSION_VALUE'
        },
    };

    // Tembak server!
    const res = http.post(url, payload, params);

    // Cek sukses (202) atau ditolak karena server macet (429)
    check(res, {
        'Tembus sukses masuk Antrean (202)': (r) => r.status === 202,
        'Ditolak Pintu Limit Server (429)': (r) => r.status === 429,
        'Server Jebol / Crash (500/502/503)': (r) => r.status >= 500,
    });

    // PWA Delay aslinya (Stagger Cluster). K6 kita set nembak lagi stiap 1 - 2 detik.
    sleep(1);
}
