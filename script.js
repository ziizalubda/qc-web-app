const URL_WEB_APP = 'https://script.google.com/macros/s/AKfycby379spuU7lIDJ7NCAnegH08-lyZazludiQVXO1bhCdR5QKUFhtmM7Hg-dZa-AXg8aU/exec';

let artikelMap = {};
let scannedData = {};

fetch(URL_WEB_APP)
  .then(res => res.json())
  .then(data => artikelMap = data)
  .catch(err => alert("Gagal ambil data artikel"));

document.getElementById('barcode').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    addScan();
  }
});

document.getElementById('submitBtn').addEventListener('click', submitToSheet);

function addScan() {
  const spk = document.getElementById('spkNumber').value.trim();
  const rawBarcode = document.getElementById('barcode').value.trim();
  const barcode = rawBarcode.toLowerCase();
  const qc = document.getElementById('qcResult').value;

  if (!spk || !barcode) return alert("SPK dan Barcode wajib diisi");

  const key = `${spk}|${barcode}`;
  if (!scannedData[key]) {
    scannedData[key] = { qty: 1, timestamp: Date.now(), qc };
  } else {
    scannedData[key].qty++;
    scannedData[key].timestamp = Date.now();
  }

  document.getElementById('barcode').value = '';
  updateTable();
}

function updateTable() {
  const table = document.getElementById('scanTable');
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
  if (!Object.keys(scannedData).length) return alert("Belum ada data!");

  const payload = Object.entries(scannedData).map(([key, { qty, timestamp, qc }]) => {
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
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' }
  })
    .then(res => res.text())
    .then(msg => {
  if (msg.startsWith("OK")) {
        alert("✅ Data berhasil dikirim");
        scannedData = {};
        updateTable();
      } else {
        alert("❌ Gagal kirim: " + msg);
      }
    })
    .catch(err => console.error("❌ Fetch error:", err));
}
