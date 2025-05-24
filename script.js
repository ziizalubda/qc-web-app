const URL_WEB_APP = 'https://script.google.com/macros/s/AKfycbz_iSsVy6PicX7Xr4Zlp6tzvjcoF8qxWpeg29yTKPcQzij4OeX5LjIpDNeHO6JVqq0/exec';

let artikelMap = {};
let scannedData = {};

// Load data artikel via JSONP
function loadArtikelData() {
  const script = document.createElement('script');
  script.src = URL_WEB_APP + '?callback=handleArtikelData';
  document.body.appendChild(script);
}

function handleArtikelData(data) {
  artikelMap = data;
  console.log("✅ Data artikel berhasil dimuat:", artikelMap);
}

loadArtikelData();

document.addEventListener("DOMContentLoaded", () => {
  const barcodeInput = document.getElementById('barcode');
  const submitBtn = document.getElementById('submitBtn');

  barcodeInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addScan();
    }
  });

  submitBtn.addEventListener('click', submitToSheet);
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
