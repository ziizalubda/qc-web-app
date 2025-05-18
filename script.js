const URL_WEB_APP = 'https://script.google.com/macros/s/AKfycbyvL2aoF_8CD8OjJDop6Kz1dYcUc1yqyQpasoqYf7S1o8tmDTO-lomcuGEAk_JQXAkE/exec';

const artikelMap = {
  'HS-CMTH-38': 'Campbell Thyme 38',
  'HS-CMTH-39': 'Campbell Thyme 39',
  'HR-TCNR-39': 'Turner HR 39',
  // Tambahkan barcode lain jika perlu
};

let scannedData = {};

// Tangani Enter saat scan barcode
document.getElementById('barcode').addEventListener('keydown', function (event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    addScan();
  }
});

// Fungsi untuk menambah scan ke tabel
function addScan() {
  const spkNumber = document.getElementById('spkNumber').value.trim();
  const barcode = document.getElementById('barcode').value.trim();
  const qcResult = document.getElementById('qcResult').value;

  if (!spkNumber || !barcode) {
    alert('SPK Number dan Barcode harus diisi.');
    return;
  }

  const key = `${spkNumber}|${barcode}`;
  const now = Date.now();

  if (!scannedData[key]) {
    scannedData[key] = {
      qty: 1,
      timestamp: now,
      qc: qcResult
    };
  } else {
    scannedData[key].qty += 1;
    scannedData[key].timestamp = now;
    scannedData[key].qc = qcResult;
  }

  document.getElementById('barcode').value = '';
  document.getElementById('barcode').focus();

  updateTable();
}

// Update tabel tampilan
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

// Edit data
function editEntry(key) {
  const [spk, barcode] = key.split('|');
  const entry = scannedData[key];

  const newBarcode = prompt('Edit Barcode:', barcode);
  const newSPK = prompt('Edit SPK Number:', spk);
  const newQty = parseInt(prompt('Edit Qty:', entry.qty), 10);
  const newQC = prompt('Edit Hasil QC:', entry.qc);

  if (!newBarcode || !newSPK || isNaN(newQty)) return;

  delete scannedData[key];
  const newKey = `${newSPK}|${newBarcode}`;
  scannedData[newKey] = {
    qty: newQty,
    timestamp: Date.now(),
    qc: newQC || entry.qc
  };

  updateTable();
}

// Kirim ke Google Sheet
function submitToSheet() {
  if (Object.keys(scannedData).length === 0) {
    alert('Belum ada data yang discan!');
    return;
  }

  const payload = Object.entries(scannedData).map(([key, { qty, timestamp, qc }]) => {
    const [spk, code] = key.split('|');
    return {
      timestamp: new Date(timestamp).toLocaleString('id-ID'),
      spk,
      barcode: code,
      artikel: artikelMap[code] || 'Tidak Dikenal',
      qty,
      hasilQC: qc
    };
  });

  fetch(URL_WEB_APP, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' }
  })
    .then(res => res.text())
    .then(response => {
      alert('Data berhasil dikirim!');
      location.reload();
    })
    .catch(err => {
      console.error(err);
      alert('Gagal mengirim data!');
    });
}
