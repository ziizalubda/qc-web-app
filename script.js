const URL_WEB_APP = 'https://script.google.com/macros/s/AKfycbzg6D6weOqbhgST9d9UIaOrNHZ_bvXj6uRzW7_1exSx2WZ6NPMxC_JLc0Ldpu2IYNk/exec';

let artikelMap = {};
let scannedData = {};

// Ambil data artikel dengan JSONP
function loadArtikelData() {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const callbackName = 'handleArtikelData_' + Date.now();

    window[callbackName] = function(data) {
      resolve(data);
      document.body.removeChild(script);
      delete window[callbackName];
    };

    script.src = URL_WEB_APP + '?callback=' + callbackName;
    script.onerror = () => {
      reject(new Error("Gagal load JSONP"));
      document.body.removeChild(script);
      delete window[callbackName];
    };

    document.body.appendChild(script);
  });
}

// Panggil saat halaman siap
loadArtikelData()
  .then(data => {
    artikelMap = data;
    console.log("✅ Data artikel berhasil dimuat:", artikelMap);
  })
  .catch(err => {
    console.error("❌ Gagal ambil data artikel via JSONP:", err);
    alert("❌ Gagal ambil data artikel dari server.");
  });

// Event listener, tambah scan dan submit tetap sama seperti sebelumnya
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
    scannedData[key].timestamp = Date.now();
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
