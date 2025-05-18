const URL_WEB_APP = 'https://script.google.com/macros/s/AKfycbyvL2aoF_8CD8OjJDop6Kz1dYcUc1yqyQpasoqYf7S1o8tmDTO-lomcuGEAk_JQXAkE/exec';

let artikelMap = {};
let scannedData = {};

async function loadArtikelMap() {
  try {
    const response = await fetch(URL_WEB_APP);
    if (!response.ok) throw new Error('Gagal load data artikel');
    artikelMap = await response.json();
    console.log('Data artikel berhasil dimuat:', artikelMap);
  } catch (error) {
    console.error('Error load artikel map:', error);
    alert('Gagal memuat data artikel. Cek koneksi atau server.');
  }
}

document.getElementById('barcode').addEventListener('keydown', function(event) {
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
    const tanggalFormatted = new Date(timestamp).toLocaleString('id-ID', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });

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

  if (!lot) {
    alert('Lot Number harus diisi!');
    return;
  }
  if (!qc) {
    alert('Hasil QC harus dipilih!');
    return;
  }
  if (Object.keys(scannedData).length === 0) {
    alert('Harap scan barcode terlebih dahulu!');
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

  // Kirim data ke Google Apps Script
  fetch(URL_WEB_APP, {
    method: 'POST',
    mode: 'no-cors', // penting agar bisa kirim ke GAS
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json'
    }
  });

  // Karena mode: 'no-cors', kita tidak bisa pakai then(). Jadi kita reset manual.
  alert('Data sedang dikirim. Silakan cek Google Sheets setelah beberapa detik.');

  // Reset tampilan
  scannedData = {};
  renderTable();
  document.getElementById('lotNumber').value = '';
  document.getElementById('qcResult').value = '';
  document.getElementById('barcode').value = '';
  document.getElementById('barcode').focus();
}
