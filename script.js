const URL_WEB_APP = 'https://script.google.com/macros/s/AKfycbyvL2aoF_8CD8OjJDop6Kz1dYcUc1yqyQpasoqYf7S1o8tmDTO-lomcuGEAk_JQXAkE/exec';

let artikelMap = {};
let scannedData = {};

async function loadArtikelMap() {
  try {
    const response = await fetch(URL_WEB_APP);
    if (!response.ok) throw new Error('Gagal ambil data artikel');
    artikelMap = await response.json();
  } catch (error) {
    alert('Gagal memuat data artikel.');
    console.error(error);
  }
}

document.getElementById('barcode').addEventListener('keydown', function(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    saveEntry();
  }
});

function saveEntry() {
  const barcodeInput = document.getElementById('barcode');
  const barcode = barcodeInput.value.trim();
  if (!barcode) return;

  const now = new Date().toISOString();
  if (scannedData[barcode]) {
    scannedData[barcode].qty += 1;
  } else {
    scannedData[barcode] = { qty: 1, timestamp: now };
  }

  barcodeInput.value = '';
  barcodeInput.focus();
  renderTable();
}

function renderTable() {
  const tbody = document.querySelector('#dataTable tbody');
  const qc = document.getElementById('qcResult').value;
  tbody.innerHTML = '';

  for (const [code, { qty, timestamp }] of Object.entries(scannedData)) {
    const artikel = artikelMap[code] || 'Tidak Dikenal';
    const tanggal = new Date(timestamp).toLocaleString('id-ID');

    tbody.innerHTML += `
      <tr>
        <td>${tanggal}</td>
        <td>${code}</td>
        <td>${artikel}</td>
        <td>${qty}</td>
        <td>${qc || '-'}</td>
      </tr>
    `;
  }
}

function submitToSheet() {
  const lot = document.getElementById('lotNumber').value.trim();
  const qc = document.getElementById('qcResult').value;

  if (!lot || !qc || Object.keys(scannedData).length === 0) {
    alert('Isi semua data terlebih dahulu!');
    return;
  }

  const payload = Object.entries(scannedData).map(([barcode, data]) => ({
    lot,
    barcode,
    nama: artikelMap[barcode] || 'Tidak Dikenal',
    qty: data.qty,
    qc,
    tanggal: data.timestamp
  }));

  fetch(URL_WEB_APP, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  .then(res => res.text())
  .then(() => {
    alert('Data berhasil dikirim!');
    scannedData = {};
    renderTable();
    document.getElementById('lotNumber').value = '';
    document.getElementById('qcResult').value = '';
    document.getElementById('barcode').value = '';
    document.getElementById('barcode').focus();
  })
  .catch(err => {
    alert('Gagal kirim data!');
    console.error(err);
  });
}

loadArtikelMap();
document.getElementById('barcode').focus();
