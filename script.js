const URL_WEB_APP = 'https://script.google.com/macros/s/AKfycbxnZyLz1aMMjJznQT9TVWvM0s6LJpz6Iex7_0bpQJ9Z2_13_S6FmUe4_pvlYcAPBU69/exec';

let artikelMap = {}; // Akan diisi dari Google Sheets
let scannedData = {};

// Ambil artikel dari database di Google Sheet via GAS
fetch(URL_WEB_APP)
  .then(res => res.json())
  .then(data => {
    artikelMap = data;
    console.log("Artikel berhasil dimuat:", artikelMap);
  })
  .catch(err => {
    console.error("Gagal memuat data artikel:", err);
    alert("Gagal memuat data artikel dari server");
  });

// Event listener saat barcode di-enter
document.getElementById('barcode').addEventListener('keydown', function (event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    addScan();
  }
});

// Tombol Kirim Data
document.getElementById('submitBtn').addEventListener('click', submitToSheet);

// Fungsi menambahkan scan ke daftar
function addScan() {
  const spkNumber = document.getElementById('spkNumber').value.trim();
  const barcode = document.getElementById('barcode').value.trim();
  const qcResult = document.getElementById('qcResult').value;

  if (!spkNumber || !barcode) {
    alert('SPK Number dan Barcode harus diisi.');
    return;
  }

  const key = `${spkNumber}|${barcode}`;
  if (!scannedData[key]) {
    scannedData[key] = {
      qty: 1,
      timestamp: Date.now(),
      qc: qcResult
    };
  } else {
    scannedData[key].qty += 1;
    scannedData[key].timestamp = Date.now();
    scannedData[key].qc = qcResult;
  }

  document.getElementById('barcode').value = '';
  updateTable();
}

// Update tabel HTML
function updateTable() {
  const table = document.getElementById('scanTable');
  table.innerHTML = `
    <tr>
      <th>Tanggal Scan</th>
      <th>Number SPK</th>
      <th>Barcode</th>
      <th>Nama Artikel</th>
      <th>Qty</th>
      <th>Hasil QC</th>
      <th></th>
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

    const editCell = row.insertCell();
    const editBtn = document.createElement('button');
    editBtn.textContent = '✏️';
    editBtn.onclick = () => editEntry(key);
    editCell.appendChild(editBtn);
  });
}

// Fungsi edit entry di tabel
function editEntry(key) {
  const [spk, barcode] = key.split('|');
  const entry = scannedData[key];

  const newSPK = prompt('Edit SPK Number:', spk);
  const newBarcode = prompt('Edit Barcode:', barcode);
  const newQty = parseInt(prompt('Edit Qty:', entry.qty), 10);
  const newQC = prompt('Edit Hasil QC:', entry.qc);

  if (!newSPK || !newBarcode || isNaN(newQty)) return;

  delete scannedData[key];
  const newKey = `${newSPK}|${newBarcode}`;
  scannedData[newKey] = {
    qty: newQty,
    timestamp: Date.now(),
    qc: newQC || entry.qc
  };

  updateTable();
}

// Submit ke Google Sheets
function submitToSheet() {
  if (Object.keys(scannedData).length === 0) {
    alert('Belum ada data yang discan!');
    return;
  }

  const payload = Object.entries(scannedData).map(([key, { qty, timestamp, qc }]) => {
    const [spk, code] = key.split('|');
    return {
      tanggal: new Date(timestamp).toLocaleString('id-ID'),
      lot: spk,
      barcode: code,
      nama: artikelMap[code] || 'Tidak Dikenal',
      qty,
      qc
    };
  });

  fetch(URL_WEB_APP, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' }
  })
    .then(res => res.text())
    .then(response => {
      alert('Data berhasil dikirim ke Sheet!');
      scannedData = {};
      updateTable();
    })
    .catch(err => {
      console.error('Gagal kirim data:', err);
      alert('Gagal mengirim data ke Google Sheet.');
    });
}
