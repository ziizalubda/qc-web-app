<script>
const URL_WEB_APP = 'https://script.google.com/macros/s/AKfycbwqqSxQT3lXtDZV51wXm53Z40RouE8rYgcdJ6ke47IwGck4uvJJFo3L4F6FS0aZR5g/exec';

let artikelMap = {};
let scannedData = {};

// Disable input sementara
const barcodeInput = document.getElementById('barcode');
barcodeInput.disabled = true;

// Ambil data artikel dari Web App
fetch(URL_WEB_APP)
  .then(res => res.json())
  .then(data => {
    artikelMap = {};
    for (const key in data) {
      const barcode = key.toLowerCase().trim();
      artikelMap[barcode] = data[key];
    }
    console.log("✅ Data artikel berhasil dimuat:", artikelMap);
    barcodeInput.disabled = false; // Aktifkan input setelah data siap
  })
  .catch(err => {
    console.error("❌ Gagal ambil data artikel:", err);
    alert("❌ Gagal ambil data artikel dari server. Pastikan koneksi dan izin akses Web App.");
  });

// Event listener input barcode
barcodeInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    addScan();
  }
});

// Event listener tombol Submit
document.getElementById('submitBtn').addEventListener('click', submitToSheet);

function addScan() {
  const spk = document.getElementById('spkNumber').value.trim();
  const rawBarcode = barcodeInput.value.trim().toLowerCase();
  const qc = document.getElementById('qcResult').value;

  if (!spk || !rawBarcode) {
    alert("⚠️ SPK dan Barcode wajib diisi.");
    return;
  }

  const key = `${spk}|${rawBarcode}`;

  if (!scannedData[key]) {
    scannedData[key] = {
      qty: 1,
      timestamp: Date.now(),
      qc
    };
  } else {
    scannedData[key].qty++;
    scannedData[key].timestamp = Date.now(); // update waktu scan terakhir
  }

  barcodeInput.value = '';
  updateTable();
}

function updateTable() {
  const table = document.getElementById('scanTable');
  table.innerHTML = `
    <tr>
      <th>Waktu</th>
      <th>SPK</th>
      <th>Barcode</th>
      <th>Nama Artikel</th>
      <th>Qty</th>
      <th>QC</th>
    </tr>
  `;

  Object.entries(scannedData).forEach(([key, { qty, timestamp, qc }]) => {
    const [spk, barcode] = key.split('|');
    const row = table.insertRow();
    row.insertCell().textContent = new Date(timestamp).toLocaleString('id-ID');
    row.insertCell().textContent = spk;
    row.insertCell().textContent = barcode;
    row.insertCell().textContent = artikelMap[barcode] || 'Tidak Dikenal';
    row.insertCell().textContent = qty;
    row.insertCell().textContent = qc;
  });

  console.log("📝 Tabel diperbarui:", scannedData);
}

function submitToSheet() {
  if (!Object.keys(scannedData).length) {
    alert("⚠️ Belum ada data untuk dikirim.");
    return;
  }

  const payload = Object.entries(scannedData).map(([key, { qty, timestamp, qc }]) => {
    const [spk, barcode] = key.split('|');
    return {
      timestamp,
      lot: spk,
      barcode,
      nama: artikelMap[barcode] || 'Tidak Dikenal',
      qty,
      qc
    };
  });

  fetch(URL_WEB_APP, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json',
    }
  })
  .then(res => res.json())
  .then(result => {
    if (result.status === 'success') {
      alert("✅ Data berhasil dikirim!");
      scannedData = {}; // kosongkan data
      updateTable(); // perbarui tabel
    } else {
      throw new Error(result.message || "Unknown error");
    }
  })
  .catch(err => {
    alert("❌ Gagal kirim data. Periksa koneksi dan status Web App.");
    console.error("❌ Fetch error saat kirim data:", err);
  });
}
</script>
