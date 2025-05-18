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

const artikelMap = {
  'HS-CMTH-38': 'Campbell Thyme 38',
  'HS-CMTH-39': 'Campbell Thyme 39',
  // Tambahkan mapping barcode-artikel lainnya di sini
};

let scannedData = {};

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

document.getElementById('submitBtn').addEventListener('click', addScan);


function submitToSheet() {
  const qc = document.getElementById('qcResult').value;

  if (!qc) {
    alert('Pilih hasil QC terlebih dahulu!');
    return;
  }

  const payload = Object.entries(scannedData).map(([key, { qty, timestamp, lot }]) => {
    const [spk, code] = key.split('|');
    return {
      timestamp: new Date(timestamp).toLocaleString('id-ID'),
      lot,
      spk,
      barcode: code,
      artikel: artikelMap[code] || 'Tidak Dikenal',
      qty,
      hasilQC: qc
    };
  });

  fetch('https://script.google.com/macros/s/AKfycbyvL2aoF_8CD8OjJDop6Kz1dYcUc1yqyQpasoqYf7S1o8tmDTO-lomcuGEAk_JQXAkE/exec', {
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

init();
