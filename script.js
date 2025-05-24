const URL_WEB_APP = 'https://script.google.com/macros/s/AKfycbygsTLE3TIZOT7-LBmZ-U2lD6vcvifK_QDDAcMzOoUZpBA7P4P1o61RTz3O5X7Hhts/exec';

let artikelMap = {};
let scannedData = {};

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
  })
  .catch(err => {
    console.error("❌ Gagal ambil data artikel:", err);
    alert("❌ Gagal ambil data artikel dari server.");
  });

// Event listener: ENTER di input barcode
document.addEventListener("DOMContentLoaded", () => {
  const barcodeInput = document.getElementById('barcode');
  const submitBtn = document.getElementById('submitBtn');

  if (barcodeInput) {
    barcodeInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addScan();
      }
    });
  }

  if (submitBtn) {
    submitBtn.addEventListener('click', submitToSheet);
  }
});

function addScan() {
  const spk = document.getElementById('spkNumber').value.trim();
  const rawBarcode = document.getElementById('barcode').value.trim().toLowerCase();
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
    scannedData[key].timestamp = Date.now(); // update waktu
  }

  console.log("✅ Scan berhasil ditambahkan:", scannedData[key]);

  document.getElementById('barcode').value = '';
  updateTable();
}

function updateTable() {
  const table = document.getElementById('scanTable');
  if (!table) return;

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
}

function submitToSheet() {
  if (!Object.keys(scannedData).length) {
    alert("⚠️ Belum ada data untuk dikirim.");
    return;
  }

  const data = Object.entries(scannedData).map(([key, { qty, timestamp, qc }]) => {
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
    body: JSON.stringify(data),
    headers: {
      'Content-Type': 'application/json',
    }
  })
    .then(res => res.json())
    .then(result => {
      if (result.status === 'success') {
        alert("✅ Data berhasil dikirim!");
        scannedData = {};
        updateTable();
      } else {
        throw new Error(result.message || "Unknown error");
      }
    })
    .catch(err => {
      alert("❌ Gagal kirim data. Periksa koneksi dan status Web App.");
      console.error(err);
    });
}
