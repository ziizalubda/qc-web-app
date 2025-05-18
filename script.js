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

const scannedData = {};
const artikelMap = {
  'HS-CMTH-38': 'Campbell Thyme 38',
  'HS-CMTH-39': 'Campbell Thyme 39',
  // Tambahkan sesuai kebutuhan
};

function renderTable() {
  const tbody = document.querySelector('#dataTable tbody');
  const qc = document.getElementById('qcResult').value;
  tbody.innerHTML = '';

  Object.entries(scannedData).forEach(([key, { qty, timestamp, lot }]) => {
    const [spk, code] = key.split('|');
    const artikel = artikelMap[code] || 'Tidak Dikenal';
    const tanggalFormatted = new Date(timestamp).toLocaleString('id-ID', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });

    tbody.innerHTML += `<tr>
      <td>${tanggalFormatted}</td>
      <td>${spk}</td>
      <td>
        ${code}
        <button onclick="editBarcode('${key}')" style="margin-left:5px;">✏️</button>
        <button onclick="deleteBarcode('${key}')" style="margin-left:5px;color:red;">🗑️</button>
      </td>
      <td>${artikel}</td>
      <td>${qty}</td>
      <td>${qc || '-'}</td>
    </tr>`;
  });
}

function editBarcode(oldKey) {
  const [spk, oldCode] = oldKey.split('|');
  const newCode = prompt('Masukkan barcode baru:', oldCode);
  if (!newCode || newCode === oldCode) return;

  const newKey = `${spk}|${newCode}`;

  // Pindahkan datanya
  if (scannedData[newKey]) {
    scannedData[newKey].qty += scannedData[oldKey].qty;
  } else {
    scannedData[newKey] = {
      qty: scannedData[oldKey].qty,
      timestamp: scannedData[oldKey].timestamp,
      lot: scannedData[oldKey].lot
    };
  }

  delete scannedData[oldKey];
  renderTable();
}

function deleteBarcode(key) {
  if (confirm('Hapus baris ini?')) {
    delete scannedData[key];
    renderTable();
  }
}

document.getElementById('barcode').addEventListener('keypress', function (e) {
  if (e.key === 'Enter') {
    const barcode = e.target.value.trim();
    const spk = document.getElementById('lotNumber').value.trim();

    if (!barcode || !spk) {
      alert('Lot Number dan Barcode harus diisi');
      return;
    }

    const key = `${spk}|${barcode}`;

    if (scannedData[key]) {
      scannedData[key].qty += 1;
    } else {
      scannedData[key] = {
        qty: 1,
        timestamp: new Date(),
        lot: spk
      };
    }

    e.target.value = '';
    renderTable();
  }
});

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
