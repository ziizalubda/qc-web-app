const URL_WEB_APP = 'https://script.google.com/macros/s/AKfycbyvL2aoF_8CD8OjJDop6Kz1dYcUc1yqyQpasoqYf7S1o8tmDTO-lomcuGEAk_JQXAkE/exec';

let artikelMap = {};
let scannedData = {};

async function loadArtikelMap() {
  try {
    const response = await fetch(URL_WEB_APP);
    if (!response.ok) throw new Error('Gagal load data artikel');
    artikelMap = await response.json();
    console.log('Artikel Map:', artikelMap);
  } catch (error) {
    console.error('Gagal load artikel map:', error);
    alert('Gagal load data artikel!');
  }
}

document.getElementById('barcode').addEventListener('keydown', function (event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    saveEntry();
  }
});

function saveEntry() {
  const barcode = document.getElementById('barcode').value.trim();
  if (!barcode) return;

  const now = new Date().toISOString();

  if (scannedData[barcode]) {
    scannedData[barcode].qty += 1;
  } else {
    scannedData[barcode] = { qty: 1, timestamp: now };
  }

  document.getElementById('barcode').value = '';
  document.getElementById('barcode').focus();
  renderTable();
}

function renderTable() {
  const tbody = document.querySelector('#dataTable tbody');
  const qc = document.getElementById('qcResult').value;
  tbody.innerHTML = '';

  for (const [code, { qty, timestamp }] of Object.entries(scannedData)) {
    const artikel = artikelMap[code] || 'Tidak Dikenal';
    const tanggalFormatted = new Date(timestamp).toLocaleString('id-ID');

    tbody.innerHTML += `<tr>
      <td>${tanggalFormatted}</td>
      <td>${code}</td>
      <td>${artikel}</td>
      <td>${qty}</td>
      <td>${qc || '-'}</td>
    </tr>`;
  }
}

function submitToSheet() {
  const lot = document.getElementById('lotNumber').value.trim();
  const qc = document.getElementById('qcResult').value;

  if (!lot) return alert('Lot Number harus diisi!');
  if (!qc) return alert('Hasil QC harus dipilih!');
  if (Object.keys(scannedData).length === 0) return alert('Belum ada barcode yang discan!');

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
    mode: 'no-cors',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' }
  });

  alert('Data berhasil dikirim!');

  // Reset form
  scannedData = {};
  renderTable();
  document.getElementById('lotNumber').value = '';
  document.getElementById('qcResult').value = '';
  document.getElementById('barcode').value = '';
  document.getElementById('barcode').focus();
}

async function init() {
  await loadArtikelMap();
  document.getElementById('barcode').focus();
}

init();
