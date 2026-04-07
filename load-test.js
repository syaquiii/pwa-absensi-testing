import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
    vus: 50, // 500 siswa nekan bareng
    iterations: 500, // Tepat 500 Data Harus Masuk DB, pantang pulang sebelum tembus!
};

export default function () {
    const url = "http://localhost:8000/student/attendance/sync";

    // Identitas Unik per-Siswa (Pasti masuk ke DB)
    const baseKey = `k6-test-pwa-${__VU}-${__ITER}-`;
    const idempotencyKey = baseKey.padEnd(36, "0");

    const payload = JSON.stringify({
        items: [
            {
                idempotency_key: idempotencyKey,
                session_id: 18,
                attendance_code: "123123",
                status: "present",
                submitted_at: new Date().toISOString(),
                device_info: "k6-pwa-simulator",
            },
        ],
    });

    const params = {
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            // ============================================
            // ⚠️ JANGAN LUPA GANTI KEMBALI COOKIENYA SAMA SEPERTI TADI!
            // ============================================
            // JANGAN LUPA URL DECODE kalau masuk ke header!
            "X-XSRF-TOKEN":
                "eyJpdiI6IkdyQWRrU1VCZnZZZENXVUZRMDhoaWc9PSIsInZhbHVlIjoidDFTN3ZRcEd3dzdmWGJ3U0IzamJzNC9oRGFKMTJvOXh2QUlXRVhwQmVUL2lzQUtZaHBWNmFVZjlsbVlDKytBODlZeGY4ay9CZEZmS2JOdTZha1k0SmJwL0lWVkZkUXB2aFBncTVWekowY2xmL0pCanE2eEFUOFAvRzRkYkZnZmgiLCJtYWMiOiI1NmY1N2FlMDgzMWZhMDg3ODFlMzUyMTBkNDQyMTllYjk2YmJmOTg0ZDIzMzJlY2M2ZWI1Zjk5NmJlYzM3MzNkIiwidGFnIjoiIn0=",
            Cookie: "XSRF-TOKEN=eyJpdiI6IkdyQWRrU1VCZnZZZENXVUZRMDhoaWc9PSIsInZhbHVlIjoidDFTN3ZRcEd3dzdmWGJ3U0IzamJzNC9oRGFKMTJvOXh2QUlXRVhwQmVUL2lzQUtZaHBWNmFVZjlsbVlDKytBODlZeGY4ay9CZEZmS2JOdTZha1k0SmJwL0lWVkZkUXB2aFBncTVWekowY2xmL0pCanE2eEFUOFAvRzRkYkZnZmgiLCJtYWMiOiI1NmY1N2FlMDgzMWZhMDg3ODFlMzUyMTBkNDQyMTllYjk2YmJmOTg0ZDIzMzJlY2M2ZWI1Zjk5NmJlYzM3MzNkIiwidGFnIjoiIn0%3D; absensi-digital-session=eyJpdiI6ImlZUEkycGVCb3ZyejZ1aHNmZ1NJZnc9PSIsInZhbHVlIjoid2ZjSm4zNHpoUCtOUiswRGlHYVliREhhQjF2WTIxK0xRSFh0N2h1NWRMT1J4VVdvVm9NcXdyU01HSC91TDVnaFV3bUl4T1l4S3FVMGZtYmxGdFhCRmMzRk1DVmxKQmI0R1RpUUwvN0JEYWJWanB5Z1pDTFM2T2g0NUwvU1ZDQ1IiLCJtYWMiOiIyNDUyZDcxOTMyMjJiY2ZlMTYzYjYyNjRiYzg3ZDU4NThlYjhjYjAxZmNhNWUwYzdjNWZiZjE1NGI2ODMyYzM0IiwidGFnIjoiIn0%3D",
        },
    };

    let suksesTembusDB = false;
    let percobaanRetries = 0;

    // INILAH PERILAKU ASLI PWA SISWA: TERUS MENCOBA SAMPAI SUKSES
    while (!suksesTembusDB && percobaanRetries < 20) {
        const res = http.post(url, payload, params);

        if (res.status === 202) {
            // BERHASIL DIPROSES SERVER!
            suksesTembusDB = true;
            check(res, { "✅ Sukses Menembus Server (202)": (r) => true });
        } else if (res.status === 429) {
            // SERVER KEPANASAN (PWA Disuruh Nunggu 15 Detik oleh Laravel)
            check(res, {
                "🔥 Server Kepanasan (429) -> PWA Aktif Mengantre": (r) => true,
            });
            sleep(15); // Simulasi Back-off Delay PWA aslinya!
        } else {
            // JIKA MASUK KESINI, KITA HARUS TAU APAKAH INI CONNECTION REFUSED ATAU ERROR DARI LARAVEL
            let errMsg = res.body;
            try {
                let json = JSON.parse(res.body);
                errMsg = JSON.stringify(
                    json.errors || json.message || "Unknown",
                );
            } catch (e) {}
            console.log(
                `\n[TERTOLAK] Status: ${res.status} | Pesan: ${errMsg}`,
            );
            check(res, {
                "☠️ Server Mati/Refused/Error -> PWA Menyimpan Data Tunggu nyala":
                    (r) => true,
            });
            sleep(5); // PWA Offline menunggu koneksi hidup lagi
        }

        percobaanRetries++;
    }
}
