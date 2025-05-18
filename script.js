<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>QC Scanner</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    table { border-collapse: collapse; width: 100%; margin-top: 10px; }
    th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
    input, select, button { margin: 5px 0; padding: 6px; }
  </style>
</head>
<body>
  <h2>QC Scanner</h2>

  <label for="lotNumber">Nomor Lot:</label><br />
  <input type="text" id="lotNumber" placeholder="Masukkan Nomor Lot" /><br />

  <label for="qcResult">Hasil QC:</label><br />
  <select id="qcResult">
    <option value="">Pilih Hasil QC</option>
    <option value="Lolos">Lolos</option>
    <option value="Reject">Reject</option>
  </select><br />

  <label for="barcode">Scan Barcode:</label><br />
  <input type="text" id="barcode" autocomplete="off" placeholder="Scan barcode dan tekan Enter" /><br />

  <button onclick="submitToSheet()">Kirim Data ke Sheet</button>

  <table id="dataTable">
    <thead>
      <tr>
        <th>Tanggal</th>
        <th>Barcode</th>
        <th>Nama Artikel</th>
        <th>Qty</th>
        <th>QC Result</th>
      </tr>
    </thead>
    <tbody></tbody>
  </table>

  <script>
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
      let rows = '';

      for (const [code, { qty, timestamp }] of Object.entries(scannedData)) {
        const artikel = artikelMap[code] || 'Tidak Dikenal';
        const tanggalFormatted = new Date(timestamp).toLocaleString('id-ID', {
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', second: '2-digit'
        });

        rows += `<tr>
          <td>${tanggalFormatted}</td>
          <td>${code}</td>
          <td>${artikel}</td>
          <td>${qty}</td>
          <td>${qc || '-'}</td>
        </tr>`;
      }
      tbody.innerHTML = rows;
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

      fetch(URL_WEB_APP, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(response => {
        if (!response.ok) throw new Error('Gagal mengirim data ke server');
        return response.text();
      })
      .then(result => {
        alert('Data berhasil disimpan!');
        scannedData = {};
        renderTable();
        document.getElementById('lotNumber').value = '';
        document.getElementById('qcResult').value = '';
        document.getElementById('barcode').value = '';
        document.getElementById('barcode').focus();
      })
      .catch(error => {
        alert('Gagal menyimpan data: ' + error.message);
      });
    }

    async function init() {
      await loadArtikelMap();
      document.getElementById('barcode').focus();
    }

    init();
  </script>
</body>
</html>
