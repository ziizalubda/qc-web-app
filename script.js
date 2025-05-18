const URL_WEB_APP = 'https://script.google.com/macros/s/AKfycbzvPlAUa9Q0qpftK5dEGoWwYC_wKCDh_HQjor2TzjZg_7uJunvYdcjxVxd8QBKcl1IT/exec';

let artikelMap = {};
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

document.getElementById('barcode').addEventListener('keydown', function (event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    addScan();
  }
});

document.getElementById('submitBtn').addEventListener('click', submitToSheet);

function addScan() {
  const spkNumber = document.getElementById('spkNumber').value.trim();
  const barcode = document.getElementById('barcode').value.trim().toLowerCase(); // ✅ Convert ke huruf kecil
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

function editEntry(key) {
  const [spk, barcode] = key.split('|');
  const entry = scannedData[key];

  const newSPK = prompt('Edit SPK Number:', spk);
  const newBarcode = prompt('Edit Barcode:', barcode).toLowerCase(); // ✅ Convert ke huruf kecil
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
    if (response.startsWith("OK")) {
      alert('Data berhasil dikirim ke Sheet!');
      scannedData = {};
      updateTable();
    } else {
      console.error('Server Error:', response);
      alert('Gagal mengirim data ke Google Sheet: ' + response);
    }
  })
  .catch(err => {
    console.error('Fetch Error:', err);
    alert('Gagal mengirim data ke Google Sheet.');
  });
}
