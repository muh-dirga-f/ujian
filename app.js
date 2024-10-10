const express = require('express');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 3000;

// Konfigurasi database
const db = new sqlite3.Database('./ujian_sekolah.db', (err) => {
  if (err) {
    console.error('Error opening database', err);
  } else {
    console.log('Connected to the SQLite database.');
    db.run(`CREATE TABLE IF NOT EXISTS guru (
      id_guru INTEGER PRIMARY KEY AUTOINCREMENT,
      fullname TEXT,
      username TEXT UNIQUE,
      password TEXT,
      id_sekolah INTEGER,
      nip TEXT
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS admin (
      id_admin INTEGER PRIMARY KEY AUTOINCREMENT,
      fullname TEXT,
      username TEXT UNIQUE,
      password TEXT
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS siswa (
      id_siswa INTEGER PRIMARY KEY AUTOINCREMENT,
      nis TEXT UNIQUE,
      fullname TEXT,
      password TEXT,
      id_sekolah INTEGER
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS kelas_siswa (
      id_kelas_siswa INTEGER PRIMARY KEY AUTOINCREMENT,
      nis TEXT,
      kelas TEXT,
      kelas_minor TEXT,
      tahun INTEGER,
      FOREIGN KEY (nis) REFERENCES siswa(nis)
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS sekolah (
      id_sekolah INTEGER PRIMARY KEY AUTOINCREMENT,
      npsn TEXT,
      nama_sekolah TEXT,
      alamat TEXT,
      kab_kota TEXT,
      provinsi TEXT
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS kelas (
      id_kelas INTEGER PRIMARY KEY AUTOINCREMENT,
      id_guru INTEGER,
      id_sekolah INTEGER,
      kelas TEXT,
      minor_kelas TEXT,
      tahun INTEGER,
      FOREIGN KEY (id_guru) REFERENCES guru(id_guru),
      FOREIGN KEY (id_sekolah) REFERENCES sekolah(id_sekolah)
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS mata_pelajaran (
      id_mapel INTEGER PRIMARY KEY AUTOINCREMENT,
      id_kelas INTEGER,
      nama_mapel TEXT,
      FOREIGN KEY (id_kelas) REFERENCES kelas(id_kelas)
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS ujian (
      id_ujian INTEGER PRIMARY KEY AUTOINCREMENT,
      judul_ujian TEXT,
      waktu_mulai DATETIME,
      waktu_selesai DATETIME,
      id_kelas INTEGER,
      id_mapel INTEGER
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS soal (
      id_soal INTEGER PRIMARY KEY AUTOINCREMENT,
      id_ujian INTEGER,
      jenis_soal TEXT,
      soal TEXT,
      pilihan_ganda TEXT,
      kunci_jawaban TEXT,
      FOREIGN KEY (id_ujian) REFERENCES ujian(id_ujian)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS jawaban_siswa (
      id_ujian INTEGER,
      id_soal INTEGER,
      nis TEXT,
      jawaban TEXT,
      PRIMARY KEY (id_ujian, id_soal, nis),
      FOREIGN KEY (id_ujian) REFERENCES ujian(id_ujian),
      FOREIGN KEY (id_soal) REFERENCES soal(id_soal),
      FOREIGN KEY (nis) REFERENCES siswa(nis)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS ujian_siswa (
      id_ujian INTEGER,
      nis TEXT,
      status TEXT,
      waktu_mulai TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      waktu_selesai TIMESTAMP,
      PRIMARY KEY (id_ujian, nis),
      FOREIGN KEY (id_ujian) REFERENCES ujian(id_ujian),
      FOREIGN KEY (nis) REFERENCES siswa(nis)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS nilai_ujian (
      id_ujian INTEGER,
      nis TEXT,
      nilai_total INTEGER,
      status TEXT,
      PRIMARY KEY (id_ujian, nis),
      FOREIGN KEY (id_ujian) REFERENCES ujian(id_ujian),
      FOREIGN KEY (nis) REFERENCES siswa(nis)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS nilai_soal (
      id_ujian INTEGER,
      id_soal INTEGER,
      nis TEXT,
      nilai INTEGER,
      PRIMARY KEY (id_ujian, id_soal, nis),
      FOREIGN KEY (id_ujian) REFERENCES ujian(id_ujian),
      FOREIGN KEY (id_soal) REFERENCES soal(id_soal),
      FOREIGN KEY (nis) REFERENCES siswa(nis)
    )`);
  }
});

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: crypto.randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: true,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => {
  db.all('SELECT id_sekolah, nama_sekolah FROM sekolah', [], (err, schools) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Server error');
    }
    res.render('login', { schools: schools });
  });
});

app.post('/login', (req, res) => {
  const { username, password, userType } = req.body;
  let table, query, param;

  switch (userType) {
    case 'guru':
      table = 'guru';
      query = `SELECT * FROM ${table} WHERE username = ?`;
      param = username;
      break;
    case 'admin':
      table = 'admin';
      query = `SELECT * FROM ${table} WHERE username = ?`;
      param = username;
      break;
    case 'siswa':
      table = 'siswa';
      query = `SELECT * FROM ${table} WHERE nis = ?`;
      param = username;
      break;
    default:
      return res.status(400).send('Invalid user type');
  }

  db.get(query, [param], (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Server error');
    }

    if (!row) {
      return res.status(401).send('Username atau password salah');
    }

    if (password === row.password) {
      req.session.user = { 
        id: row.id_guru || row.id_admin || row.id_siswa, 
        username: row.username || row.nis, 
        fullname: row.fullname,
        type: userType,
        id_sekolah: row.id_sekolah
      };
      req.session.isLoggedIn = true;
      res.redirect(`/${userType}/dashboard`);
    } else {
      res.status(401).send('Username/NIS atau password salah');
    }
  });
});

app.post('/register', (req, res) => {
  const { fullname, nis, password, id_sekolah } = req.body;
  
  db.run('INSERT INTO siswa (fullname, nis, password, id_sekolah) VALUES (?, ?, ?, ?)',
    [fullname, nis, password, id_sekolah],
    function(err) {
      if (err) {
        console.error(err);
        return res.status(500).send('Server error');
      }
      res.redirect('/');
    }
  );
});

// Middleware untuk memeriksa autentikasi
const checkAuth = (req, res, next) => {
  if (req.session.isLoggedIn) {
    next();
  } else {
    res.redirect('/');
  }
};

// Middleware untuk memeriksa tipe pengguna
const checkUserType = (type) => {
  return (req, res, next) => {
    if (req.session.user && req.session.user.type === type) {
      next();
    } else {
      res.redirect('/');
    }
  };
};

app.get('/admin/dashboard', checkAuth, checkUserType('admin'), (req, res) => {
  res.render('admin/dashboard', { user: req.session.user });
});

// Rute untuk manajemen pengguna
app.get('/admin/users', (req, res) => {
  if (!req.session.user || req.session.user.type !== 'admin') {
    return res.redirect('/');
  }
  db.all(`
    SELECT id_guru AS id, fullname, username, 'guru' AS user_type, id_sekolah, nip, NULL AS nis, 'guru' AS id_type FROM guru
    UNION ALL
    SELECT id_siswa AS id, fullname, nis AS username, 'siswa' AS user_type, id_sekolah, NULL AS nip, nis, 'siswa' AS id_type FROM siswa
    UNION ALL
    SELECT id_admin AS id, fullname, username, 'admin' AS user_type, NULL AS id_sekolah, NULL AS nip, NULL AS nis, 'admin' AS id_type FROM admin
  `, [], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Server error');
    }
    res.render('admin/users', { users: rows, user: req.session.user });
  });
});

app.get('/admin/users/add', (req, res) => {
  if (!req.session.user || req.session.user.type !== 'admin') {
    return res.redirect('/');
  }
  res.render('admin/add_user', { user: req.session.user });
});

app.post('/admin/users/add', (req, res) => {
  if (!req.session.user || req.session.user.type !== 'admin') {
    return res.redirect('/');
  }
  const { fullname, username, password, userType, id_sekolah, nip, nis } = req.body;
  let query, params;

  switch (userType) {
    case 'guru':
      query = 'INSERT INTO guru (fullname, username, password, id_sekolah, nip) VALUES (?, ?, ?, ?, ?)';
      params = [fullname, username, password, id_sekolah, nip];
      break;
    case 'siswa':
      query = 'INSERT INTO siswa (fullname, nis, password, id_sekolah) VALUES (?, ?, ?, ?)';
      params = [fullname, nis, password, id_sekolah];
      break;
    case 'admin':
      query = 'INSERT INTO admin (fullname, username, password) VALUES (?, ?, ?)';
      params = [fullname, username, password];
      break;
    default:
      return res.status(400).send('Invalid user type');
  }

  db.run(query, params, function(err) {
    if (err) {
      console.error(err);
      return res.status(500).send('Server error');
    }
    res.redirect('/admin/users');
  });
});

app.get('/admin/users/edit/:id/:type', (req, res) => {
  if (!req.session.user || req.session.user.type !== 'admin') {
    return res.redirect('/');
  }
  const { id, type } = req.params;
  let query;
  switch (type) {
    case 'guru':
      query = 'SELECT * FROM guru WHERE id_guru = ?';
      break;
    case 'siswa':
      query = 'SELECT * FROM siswa WHERE id_siswa = ?';
      break;
    case 'admin':
      query = 'SELECT * FROM admin WHERE id_admin = ?';
      break;
    default:
      return res.status(400).send('Invalid user type');
  }
  db.get(query, [id], (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Server error');
    }
    // Fetch schools for dropdown
    db.all('SELECT id_sekolah, nama_sekolah FROM sekolah', [], (err, schools) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Server error');
      }
      res.render('admin/edit_user', { user: req.session.user, editUser: row, userType: type, schools: schools });
    });
  });
});

app.post('/admin/users/edit/:id/:type', (req, res) => {
  if (!req.session.user || req.session.user.type !== 'admin') {
    return res.redirect('/');
  }
  const { id, type } = req.params;
  const { fullname, username, password, id_sekolah, nip, nis } = req.body;
  let query, params;

  switch (type) {
    case 'guru':
      if (password) {
        query = 'UPDATE guru SET fullname = ?, username = ?, password = ?, id_sekolah = ?, nip = ? WHERE id_guru = ?';
        params = [fullname, username, password, id_sekolah, nip, id];
      } else {
        query = 'UPDATE guru SET fullname = ?, username = ?, id_sekolah = ?, nip = ? WHERE id_guru = ?';
        params = [fullname, username, id_sekolah, nip, id];
      }
      break;
    case 'siswa':
      if (password) {
        query = 'UPDATE siswa SET fullname = ?, nis = ?, password = ?, id_sekolah = ? WHERE id_siswa = ?';
        params = [fullname, nis, password, id_sekolah, id];
      } else {
        query = 'UPDATE siswa SET fullname = ?, nis = ?, id_sekolah = ? WHERE id_siswa = ?';
        params = [fullname, nis, id_sekolah, id];
      }
      break;
    case 'admin':
      if (password) {
        query = 'UPDATE admin SET fullname = ?, username = ?, password = ? WHERE id_admin = ?';
        params = [fullname, username, password, id];
      } else {
        query = 'UPDATE admin SET fullname = ?, username = ? WHERE id_admin = ?';
        params = [fullname, username, id];
      }
      break;
    default:
      return res.status(400).send('Invalid user type');
  }

  db.run(query, params, function(err) {
    if (err) {
      console.error(err);
      return res.status(500).send('Server error');
    }
    res.redirect('/admin/users');
  });
});

app.get('/admin/users/delete/:id/:type', (req, res) => {
  if (!req.session.user || req.session.user.type !== 'admin') {
    return res.redirect('/');
  }
  const { id, type } = req.params;
  let query;
  switch (type) {
    case 'guru':
      query = 'DELETE FROM guru WHERE id_guru = ?';
      break;
    case 'siswa':
      query = 'DELETE FROM siswa WHERE id_siswa = ?';
      break;
    case 'admin':
      query = 'DELETE FROM admin WHERE id_admin = ?';
      break;
    default:
      return res.status(400).send('Invalid user type');
  }
  db.run(query, [id], function(err) {
    if (err) {
      console.error(err);
      return res.status(500).send('Server error');
    }
    res.redirect('/admin/users');
  });
});

// Rute untuk manajemen sekolah
app.get('/admin/schools', (req, res) => {
  if (!req.session.user || req.session.user.type !== 'admin') {
    return res.redirect('/');
  }
  db.all('SELECT * FROM sekolah', [], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Server error');
    }
    res.render('admin/schools', { schools: rows, user: req.session.user });
  });
});

app.get('/admin/schools/add', (req, res) => {
  if (!req.session.user || req.session.user.type !== 'admin') {
    return res.redirect('/');
  }
  res.render('admin/add_school', { user: req.session.user });
});

app.post('/admin/schools/add', (req, res) => {
  if (!req.session.user || req.session.user.type !== 'admin') {
    return res.redirect('/');
  }
  const { npsn, nama_sekolah, alamat, kab_kota, provinsi } = req.body;
  db.run('INSERT INTO sekolah (npsn, nama_sekolah, alamat, kab_kota, provinsi) VALUES (?, ?, ?, ?, ?)',
    [npsn, nama_sekolah, alamat, kab_kota, provinsi],
    function(err) {
      if (err) {
        console.error(err);
        return res.status(500).send('Server error');
      }
      res.redirect('/admin/schools');
    });
});

app.get('/admin/schools/edit/:id', (req, res) => {
  if (!req.session.user || req.session.user.type !== 'admin') {
    return res.redirect('/');
  }
  const { id } = req.params;
  db.get('SELECT * FROM sekolah WHERE id_sekolah = ?', [id], (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Server error');
    }
    res.render('admin/edit_school', { user: req.session.user, school: row });
  });
});

app.post('/admin/schools/edit/:id', (req, res) => {
  if (!req.session.user || req.session.user.type !== 'admin') {
    return res.redirect('/');
  }
  const { id } = req.params;
  const { npsn, nama_sekolah, alamat, kab_kota, provinsi } = req.body;
  db.run('UPDATE sekolah SET npsn = ?, nama_sekolah = ?, alamat = ?, kab_kota = ?, provinsi = ? WHERE id_sekolah = ?',
    [npsn, nama_sekolah, alamat, kab_kota, provinsi, id],
    function(err) {
      if (err) {
        console.error(err);
        return res.status(500).send('Server error');
      }
      res.redirect('/admin/schools');
    });
});

app.get('/admin/schools/delete/:id', (req, res) => {
  if (!req.session.user || req.session.user.type !== 'admin') {
    return res.redirect('/');
  }
  const { id } = req.params;
  db.run('DELETE FROM sekolah WHERE id_sekolah = ?', [id], function(err) {
    if (err) {
      console.error(err);
      return res.status(500).send('Server error');
    }
    res.redirect('/admin/schools');
  });
});

app.get('/guru/dashboard', checkAuth, checkUserType('guru'), (req, res) => {
  db.get('SELECT g.*, s.nama_sekolah FROM guru g JOIN sekolah s ON g.id_sekolah = s.id_sekolah WHERE g.id_guru = ?', 
    [req.session.user.id], 
    (err, row) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Server error');
      }
      res.render('guru/dashboard', { user: {...req.session.user, ...row} });
    }
  );
});

app.get('/guru/ujian', (req, res) => {
  if (!req.session.user || req.session.user.type !== 'guru') {
    return res.redirect('/');
  }
  db.all(`
    SELECT u.id_ujian, u.judul_ujian, k.kelas, k.minor_kelas, m.nama_mapel, u.waktu_mulai, u.waktu_selesai
    FROM ujian u
    JOIN kelas k ON u.id_kelas = k.id_kelas
    JOIN mata_pelajaran m ON u.id_mapel = m.id_mapel
    WHERE k.id_guru = ?
    ORDER BY u.waktu_mulai DESC
  `, [req.session.user.id], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Server error');
    }
    res.render('guru/ujian', { user: req.session.user, ujianList: rows });
  });
});

// Rute untuk menampilkan daftar soal
app.get('/guru/ujian/:id/soal', (req, res) => {
  if (!req.session.user || req.session.user.type !== 'guru') {
    return res.redirect('/');
  }
  const { id } = req.params;
  db.all('SELECT * FROM soal WHERE id_ujian = ?', [id], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Server error');
    }
    res.render('guru/soal', { user: req.session.user, soalList: rows, id_ujian: id });
  });
});

// Rute untuk menampilkan form tambah soal
app.get('/guru/ujian/:id/soal/add', (req, res) => {
  if (!req.session.user || req.session.user.type !== 'guru') {
    return res.redirect('/');
  }
  const { id } = req.params;
  res.render('guru/add_soal', { user: req.session.user, id_ujian: id });
});

// Rute untuk memproses penambahan soal
app.post('/guru/ujian/:id/soal/add', (req, res) => {
  if (!req.session.user || req.session.user.type !== 'guru') {
    return res.redirect('/');
  }
  const { id } = req.params;
  const { jenis_soal, soal, kunci_jawaban, kata_kunci, pilihan_ganda } = req.body;
  let pilihan_ganda_json = null;
  if (jenis_soal === 'pilihan_ganda') {
    // Pastikan pilihan_ganda adalah objek sebelum di-stringify
    if (typeof pilihan_ganda === 'object' && pilihan_ganda !== null) {
      pilihan_ganda_json = JSON.stringify(pilihan_ganda);
    } else {
      console.error('pilihan_ganda is not an object:', pilihan_ganda);
      return res.status(400).send('Invalid pilihan_ganda format');
    }
  }
  const kunci = jenis_soal === 'pilihan_ganda' ? kunci_jawaban : kata_kunci;
  db.run('INSERT INTO soal (id_ujian, jenis_soal, soal, kunci_jawaban, pilihan_ganda) VALUES (?, ?, ?, ?, ?)',
    [id, jenis_soal, soal, kunci, pilihan_ganda_json], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Server error');
    }
    res.redirect(`/guru/ujian/${id}/soal`);
  });
});

// Rute untuk menampilkan form edit soal
app.get('/guru/ujian/:id_ujian/soal/edit/:id_soal', (req, res) => {
  if (!req.session.user || req.session.user.type !== 'guru') {
    return res.redirect('/');
  }
  const { id_ujian, id_soal } = req.params;
  db.get('SELECT * FROM soal WHERE id_soal = ? AND id_ujian = ?', [id_soal, id_ujian], (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Server error');
    }
    if (row.jenis_soal === 'pilihan_ganda' && row.pilihan_ganda) {
      row.pilihan_ganda = JSON.parse(row.pilihan_ganda);
    }
    res.render('guru/edit_soal', { user: req.session.user, soal: row, id_ujian });
  });
});

// Rute untuk memproses edit soal
app.post('/guru/ujian/:id_ujian/soal/edit/:id_soal', (req, res) => {
  if (!req.session.user || req.session.user.type !== 'guru') {
    return res.redirect('/');
  }
  const { id_ujian, id_soal } = req.params;
  const { jenis_soal, soal, kunci_jawaban, kata_kunci, pilihan_ganda } = req.body;
  let pilihan_ganda_json = null;
  if (jenis_soal === 'pilihan_ganda') {
    pilihan_ganda_json = JSON.stringify(pilihan_ganda);
  }
  const kunci = jenis_soal === 'pilihan_ganda' ? kunci_jawaban : kata_kunci;
  db.run('UPDATE soal SET jenis_soal = ?, soal = ?, kunci_jawaban = ?, pilihan_ganda = ? WHERE id_soal = ? AND id_ujian = ?',
    [jenis_soal, soal, kunci, pilihan_ganda_json, id_soal, id_ujian], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Server error');
    }
    res.redirect(`/guru/ujian/${id_ujian}/soal`);
  });
});

// Rute untuk menghapus soal
app.get('/guru/ujian/:id_ujian/soal/delete/:id_soal', (req, res) => {
  if (!req.session.user || req.session.user.type !== 'guru') {
    return res.redirect('/');
  }
  const { id_ujian, id_soal } = req.params;
  db.run('DELETE FROM soal WHERE id_soal = ? AND id_ujian = ?', [id_soal, id_ujian], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Server error');
    }
    res.redirect(`/guru/ujian/${id_ujian}/soal`);
  });
});

app.get('/guru/ujian/add', (req, res) => {
  if (!req.session.user || req.session.user.type !== 'guru') {
    return res.redirect('/');
  }
  db.all(`
    SELECT k.id_kelas, k.kelas, k.minor_kelas, m.id_mapel, m.nama_mapel
    FROM kelas k
    JOIN mata_pelajaran m ON k.id_kelas = m.id_kelas
    WHERE k.id_guru = ?
  `, [req.session.user.id], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Server error');
    }
    res.render('guru/add_ujian', { user: req.session.user, kelasList: rows });
  });
});

app.post('/guru/ujian/add', (req, res) => {
  if (!req.session.user || req.session.user.type !== 'guru') {
    return res.redirect('/');
  }
  const { id_kelas, id_mapel, judul_ujian, waktu_mulai, waktu_selesai } = req.body;
  const [kelas_id, mapel_id] = id_kelas.split('|');
  db.run('INSERT INTO ujian (id_kelas, id_mapel, judul_ujian, waktu_mulai, waktu_selesai) VALUES (?, ?, ?, ?, ?)',
    [kelas_id, mapel_id, judul_ujian, waktu_mulai, waktu_selesai], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Server error');
    }
    res.redirect('/guru/ujian');
  });
});

app.get('/guru/ujian/edit/:id', (req, res) => {
  if (!req.session.user || req.session.user.type !== 'guru') {
    return res.redirect('/');
  }
  const { id } = req.params;
  db.get('SELECT * FROM ujian WHERE id_ujian = ?', [id], (err, ujian) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Server error');
    }
    db.all(`
      SELECT k.id_kelas, k.kelas, k.minor_kelas, m.id_mapel, m.nama_mapel
      FROM kelas k
      JOIN mata_pelajaran m ON k.id_kelas = m.id_kelas
      WHERE k.id_guru = ?
    `, [req.session.user.id], (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Server error');
      }
      res.render('guru/edit_ujian', { user: req.session.user, ujian: ujian, kelasList: rows });
    });
  });
});

app.post('/guru/ujian/edit/:id', (req, res) => {
  if (!req.session.user || req.session.user.type !== 'guru') {
    return res.redirect('/');
  }
  const { id } = req.params;
  const { id_kelas, judul_ujian, waktu_mulai, waktu_selesai } = req.body;
  const [kelas_id, mapel_id] = id_kelas.split('|');
  db.run('UPDATE ujian SET id_kelas = ?, id_mapel = ?, judul_ujian = ?, waktu_mulai = ?, waktu_selesai = ? WHERE id_ujian = ?',
    [kelas_id, mapel_id, judul_ujian, waktu_mulai, waktu_selesai, id], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Server error');
    }
    res.redirect('/guru/ujian');
  });
});

app.get('/guru/ujian/delete/:id', (req, res) => {
  if (!req.session.user || req.session.user.type !== 'guru') {
    return res.redirect('/');
  }
  const { id } = req.params;
  db.run('DELETE FROM ujian WHERE id_ujian = ?', [id], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Server error');
    }
    res.redirect('/guru/ujian');
  });
});

app.get('/guru/ujian/:id/nilai', (req, res) => {
  if (!req.session.user || req.session.user.type !== 'guru') {
    return res.redirect('/');
  }
  const { id } = req.params;
  
  // Fetch exam details
  db.get(`
    SELECT u.*, m.nama_mapel, k.kelas, k.minor_kelas
    FROM ujian u
    JOIN mata_pelajaran m ON u.id_mapel = m.id_mapel
    JOIN kelas k ON u.id_kelas = k.id_kelas
    WHERE u.id_ujian = ?
  `, [id], (err, ujian) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Server error');
    }
    
    if (!ujian) {
      return res.status(404).send('Ujian tidak ditemukan');
    }
    
    // Fetch student scores and answers count
    db.all(`
      SELECT s.nis, s.fullname, n.nilai_total, n.status,
             COUNT(js.id_soal) as count
      FROM siswa s
      LEFT JOIN nilai_ujian n ON n.id_ujian = ? AND n.nis = s.nis
      LEFT JOIN jawaban_siswa js ON js.id_ujian = ? AND js.nis = s.nis
      JOIN kelas_siswa ks ON ks.nis = s.nis
      WHERE ks.kelas = ? AND ks.kelas_minor = ?
      GROUP BY s.nis
    `, [id, id, ujian.kelas, ujian.minor_kelas], (err, jawaban) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Server error');
      }
      
      res.render('guru/nilai_ujian', { user: req.session.user, ujian: ujian, jawaban: jawaban });
    });
  });
});

app.get('/guru/ujian/:id_ujian/nilai/:nis', (req, res) => {
  if (!req.session.user || req.session.user.type !== 'guru') {
    return res.redirect('/');
  }
  const { id_ujian, nis } = req.params;

  // Fetch exam details
  db.get(`
    SELECT u.*, m.nama_mapel, k.kelas, k.minor_kelas
    FROM ujian u
    JOIN mata_pelajaran m ON u.id_mapel = m.id_mapel
    JOIN kelas k ON u.id_kelas = k.id_kelas
    WHERE u.id_ujian = ?
  `, [id_ujian], (err, ujian) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Server error');
    }

    if (!ujian) {
      return res.status(404).send('Ujian tidak ditemukan');
    }

    // Fetch student details
    db.get('SELECT * FROM siswa WHERE nis = ?', [nis], (err, siswa) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Server error');
      }

      if (!siswa) {
        return res.status(404).send('Siswa tidak ditemukan');
      }

      // Fetch exam questions
      db.all('SELECT * FROM soal WHERE id_ujian = ?', [id_ujian], (err, soal) => {
        if (err) {
          console.error(err);
          return res.status(500).send('Server error');
        }

        // Fetch student answers
        db.all('SELECT * FROM jawaban_siswa WHERE id_ujian = ? AND nis = ?', [id_ujian, nis], (err, jawaban) => {
          if (err) {
            console.error(err);
            return res.status(500).send('Server error');
          }

          // Convert jawaban array to object for easier access
          const jawabanObj = {};
          jawaban.forEach(j => {
            jawabanObj[j.id_soal] = j.jawaban;
          });

          res.render('guru/nilai_siswa', { 
            user: req.session.user, 
            ujian: ujian, 
            siswa: siswa, 
            soal: soal, 
            jawaban: jawabanObj 
          });
        });
      });
    });
  });
});

app.post('/guru/ujian/:id_ujian/nilai/:nis', (req, res) => {
  if (!req.session.user || req.session.user.type !== 'guru') {
    return res.redirect('/');
  }
  const { id_ujian, nis } = req.params;
  const { nilai, status } = req.body;

  // Calculate total score
  const totalNilai = Object.values(nilai).reduce((sum, nilai) => sum + parseInt(nilai), 0);

  // Insert or update nilai_ujian
  db.run(`
    INSERT INTO nilai_ujian (id_ujian, nis, nilai_total, status)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(id_ujian, nis) DO UPDATE SET
    nilai_total = excluded.nilai_total,
    status = excluded.status
  `, [id_ujian, nis, totalNilai, status], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Server error');
    }

    // Insert or update nilai_soal for each question
    const nilaiSoalPromises = Object.entries(nilai).map(([id_soal, nilai_soal]) => {
      return new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO nilai_soal (id_ujian, id_soal, nis, nilai)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(id_ujian, id_soal, nis) DO UPDATE SET
          nilai = excluded.nilai
        `, [id_ujian, id_soal, nis, nilai_soal], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });

    Promise.all(nilaiSoalPromises)
      .then(() => {
        res.redirect(`/guru/ujian/${id_ujian}/nilai`);
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send('Server error');
      });
  });
});

app.get('/guru/ujian/add', (req, res) => {
  if (!req.session.user || req.session.user.type !== 'guru') {
    return res.redirect('/');
  }
  db.all('SELECT id_kelas, kelas, minor_kelas FROM kelas WHERE id_guru = ?', [req.session.user.id], (err, kelas) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Server error');
    }
    res.render('guru/add_ujian', { user: req.session.user, kelas: kelas });
  });
});

app.post('/guru/ujian/add', (req, res) => {
  if (!req.session.user || req.session.user.type !== 'guru') {
    return res.redirect('/');
  }
  const { id_kelas, nama_mapel } = req.body;
  db.run('INSERT INTO mata_pelajaran (id_kelas, nama_mapel) VALUES (?, ?)', [id_kelas, nama_mapel], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Server error');
    }
    res.redirect('/guru/ujian');
  });
});

app.get('/guru/ujian/edit/:id_kelas/:id_mapel', (req, res) => {
  if (!req.session.user || req.session.user.type !== 'guru') {
    return res.redirect('/');
  }
  const { id_kelas, id_mapel } = req.params;
  db.get('SELECT * FROM mata_pelajaran WHERE id_mapel = ? AND id_kelas = ?', [id_mapel, id_kelas], (err, mapel) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Server error');
    }
    db.all('SELECT id_kelas, kelas, minor_kelas FROM kelas WHERE id_guru = ?', [req.session.user.id], (err, kelas) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Server error');
      }
      res.render('guru/edit_ujian', { user: req.session.user, mapel: mapel, kelas: kelas });
    });
  });
});

app.post('/guru/ujian/edit/:id_kelas/:id_mapel', (req, res) => {
  if (!req.session.user || req.session.user.type !== 'guru') {
    return res.redirect('/');
  }
  const { id_kelas, id_mapel } = req.params;
  const { nama_mapel, new_id_kelas } = req.body;
  db.run('UPDATE mata_pelajaran SET nama_mapel = ?, id_kelas = ? WHERE id_mapel = ? AND id_kelas = ?', 
    [nama_mapel, new_id_kelas, id_mapel, id_kelas], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Server error');
    }
    res.redirect('/guru/ujian');
  });
});

app.get('/guru/ujian/delete/:id_kelas/:id_mapel', (req, res) => {
  if (!req.session.user || req.session.user.type !== 'guru') {
    return res.redirect('/');
  }
  const { id_kelas, id_mapel } = req.params;
  db.run('DELETE FROM mata_pelajaran WHERE id_mapel = ? AND id_kelas = ?', [id_mapel, id_kelas], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Server error');
    }
    res.redirect('/guru/ujian');
  });
});

app.get('/guru/kelas', (req, res) => {
  if (!req.session.user || req.session.user.type !== 'guru') {
    return res.redirect('/');
  }
  // Ambil daftar kelas dari database
  db.all('SELECT * FROM kelas WHERE id_guru = ?', [req.session.user.id], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Server error');
    }
    res.render('guru/kelas', { user: req.session.user, kelas: rows });
  });
});

app.get('/guru/kelas/add', (req, res) => {
  if (!req.session.user || req.session.user.type !== 'guru') {
    return res.redirect('/');
  }
  res.render('guru/add_kelas', { user: req.session.user });
});

app.post('/guru/kelas/add', (req, res) => {
  if (!req.session.user || req.session.user.type !== 'guru') {
    return res.redirect('/');
  }
  const { kelas, minor_kelas, tahun } = req.body;
  db.run('INSERT INTO kelas (id_guru, id_sekolah, kelas, minor_kelas, tahun) VALUES (?, ?, ?, ?, ?)',
    [req.session.user.id, req.session.user.id_sekolah, kelas, minor_kelas, tahun],
    function(err) {
      if (err) {
        console.error(err);
        return res.status(500).send('Server error');
      }
      res.redirect('/guru/kelas');
    });
});

app.get('/guru/kelas/edit/:id', (req, res) => {
  if (!req.session.user || req.session.user.type !== 'guru') {
    return res.redirect('/');
  }
  const { id } = req.params;
  db.get('SELECT * FROM kelas WHERE id_kelas = ? AND id_guru = ?', [id, req.session.user.id], (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Server error');
    }
    if (!row) {
      return res.status(404).send('Kelas tidak ditemukan');
    }
    res.render('guru/edit_kelas', { user: req.session.user, kelas: row });
  });
});

app.post('/guru/kelas/edit/:id', (req, res) => {
  if (!req.session.user || req.session.user.type !== 'guru') {
    return res.redirect('/');
  }
  const { id } = req.params;
  const { kelas, minor_kelas, tahun } = req.body;
  db.run('UPDATE kelas SET kelas = ?, minor_kelas = ?, tahun = ? WHERE id_kelas = ? AND id_guru = ?',
    [kelas, minor_kelas, tahun, id, req.session.user.id],
    function(err) {
      if (err) {
        console.error(err);
        return res.status(500).send('Server error');
      }
      res.redirect('/guru/kelas');
    });
});

app.get('/guru/kelas/delete/:id', (req, res) => {
  if (!req.session.user || req.session.user.type !== 'guru') {
    return res.redirect('/');
  }
  const { id } = req.params;
  
  // Periksa apakah ada mata pelajaran dalam kelas ini
  db.get('SELECT COUNT(*) as count FROM mata_pelajaran WHERE id_kelas = ?', [id], (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Server error');
    }
    
    if (row.count > 0) {
      // Jika ada mata pelajaran, kirim pesan error
      return res.status(400).send('Tidak dapat menghapus kelas karena masih ada mata pelajaran terkait.');
    }
    
    // Jika tidak ada mata pelajaran, lanjutkan dengan penghapusan kelas
    db.run('DELETE FROM kelas WHERE id_kelas = ? AND id_guru = ?', [id, req.session.user.id], function(err) {
      if (err) {
        console.error(err);
        return res.status(500).send('Server error');
      }
      res.redirect('/guru/kelas');
    });
  });
});

app.get('/guru/kelas/:id/mapel', (req, res) => {
  if (!req.session.user || req.session.user.type !== 'guru') {
    return res.redirect('/');
  }
  const { id } = req.params;
  db.all('SELECT * FROM mata_pelajaran WHERE id_kelas = ?', [id], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Server error');
    }
    res.render('guru/mapel', { user: req.session.user, mapel: rows, id_kelas: id });
  });
});

app.get('/guru/kelas/:id/mapel/add', (req, res) => {
  if (!req.session.user || req.session.user.type !== 'guru') {
    return res.redirect('/');
  }
  const { id } = req.params;
  res.render('guru/add_mapel', { user: req.session.user, id_kelas: id });
});

app.post('/guru/kelas/:id/mapel/add', (req, res) => {
  if (!req.session.user || req.session.user.type !== 'guru') {
    return res.redirect('/');
  }
  const { id } = req.params;
  const { nama_mapel } = req.body;
  db.run('INSERT INTO mata_pelajaran (id_kelas, nama_mapel) VALUES (?, ?)',
    [id, nama_mapel],
    function(err) {
      if (err) {
        console.error(err);
        return res.status(500).send('Server error');
      }
      res.redirect(`/guru/kelas/${id}/mapel`);
    });
});

app.get('/guru/kelas/:id_kelas/mapel/edit/:id_mapel', (req, res) => {
  if (!req.session.user || req.session.user.type !== 'guru') {
    return res.redirect('/');
  }
  const { id_kelas, id_mapel } = req.params;
  db.get('SELECT * FROM mata_pelajaran WHERE id_mapel = ? AND id_kelas = ?', [id_mapel, id_kelas], (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Server error');
    }
    if (!row) {
      return res.status(404).send('Mata pelajaran tidak ditemukan');
    }
    res.render('guru/edit_mapel', { user: req.session.user, mapel: row, id_kelas });
  });
});

app.post('/guru/kelas/:id_kelas/mapel/edit/:id_mapel', (req, res) => {
  if (!req.session.user || req.session.user.type !== 'guru') {
    return res.redirect('/');
  }
  const { id_kelas, id_mapel } = req.params;
  const { nama_mapel } = req.body;
  db.run('UPDATE mata_pelajaran SET nama_mapel = ? WHERE id_mapel = ? AND id_kelas = ?',
    [nama_mapel, id_mapel, id_kelas],
    function(err) {
      if (err) {
        console.error(err);
        return res.status(500).send('Server error');
      }
      res.redirect(`/guru/kelas/${id_kelas}/mapel`);
    });
});

app.get('/guru/kelas/:id_kelas/mapel/delete/:id_mapel', (req, res) => {
  if (!req.session.user || req.session.user.type !== 'guru') {
    return res.redirect('/');
  }
  const { id_kelas, id_mapel } = req.params;
  db.run('DELETE FROM mata_pelajaran WHERE id_mapel = ? AND id_kelas = ?', [id_mapel, id_kelas], function(err) {
    if (err) {
      console.error(err);
      return res.status(500).send('Server error');
    }
    res.redirect(`/guru/kelas/${id_kelas}/mapel`);
  });
});

app.get('/siswa/dashboard', (req, res) => {
  if (!req.session.user || req.session.user.type !== 'siswa') {
    return res.redirect('/');
  }
  db.get(`
    SELECT ks.*, s.nama_sekolah 
    FROM kelas_siswa ks
    JOIN siswa si ON ks.nis = si.nis
    JOIN sekolah s ON si.id_sekolah = s.id_sekolah
    WHERE ks.nis = ?
  `, [req.session.user.username], (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Server error');
    }
    res.render('siswa/dashboard', { user: req.session.user, kelas: row });
  });
});

app.get('/siswa/jadwal-ujian', (req, res) => {
  if (!req.session.user || req.session.user.type !== 'siswa') {
    return res.redirect('/');
  }
  
  db.all(`
    SELECT u.id_ujian, u.judul_ujian, u.waktu_mulai, u.waktu_selesai, 
           k.kelas, k.minor_kelas, m.nama_mapel
    FROM ujian u
    JOIN kelas k ON u.id_kelas = k.id_kelas
    JOIN mata_pelajaran m ON u.id_mapel = m.id_mapel
    JOIN kelas_siswa ks ON k.kelas = ks.kelas AND k.minor_kelas = ks.kelas_minor
    WHERE ks.nis = ?
    ORDER BY u.waktu_mulai ASC
  `, [req.session.user.username], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Server error');
    }
    res.render('siswa/jadwal-ujian', { user: req.session.user, jadwalUjian: rows });
  });
});

app.get('/siswa/nilai', (req, res) => {
  if (!req.session.user || req.session.user.type !== 'siswa') {
    return res.redirect('/');
  }
  
  db.all(`
    SELECT u.judul_ujian, m.nama_mapel, k.kelas, k.minor_kelas, nu.nilai_total, nu.status
    FROM nilai_ujian nu
    JOIN ujian u ON nu.id_ujian = u.id_ujian
    JOIN mata_pelajaran m ON u.id_mapel = m.id_mapel
    JOIN kelas k ON u.id_kelas = k.id_kelas
    WHERE nu.nis = ?
    ORDER BY u.waktu_mulai DESC
  `, [req.session.user.username], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Server error');
    }
    res.render('siswa/nilai', { user: req.session.user, nilaiUjian: rows });
  });
});

app.get('/siswa/ujian/:id', (req, res) => {
  if (!req.session.user || req.session.user.type !== 'siswa') {
    return res.redirect('/');
  }
  
  const ujianId = req.params.id;
  
  // Periksa apakah ujian ada dan siswa berhak mengaksesnya
  db.get(`
    SELECT u.*, m.nama_mapel, k.kelas, k.minor_kelas
    FROM ujian u
    JOIN mata_pelajaran m ON u.id_mapel = m.id_mapel
    JOIN kelas k ON u.id_kelas = k.id_kelas
    JOIN kelas_siswa ks ON k.kelas = ks.kelas AND k.minor_kelas = ks.kelas_minor
    WHERE u.id_ujian = ? AND ks.nis = ?
  `, [ujianId, req.session.user.username], (err, ujian) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Server error');
    }
    
    if (!ujian) {
      return res.status(404).send('Ujian tidak ditemukan atau Anda tidak memiliki akses');
    }
    
    const now = new Date();
    const waktuMulai = new Date(ujian.waktu_mulai);
    const waktuSelesai = new Date(ujian.waktu_selesai);
    
    if (now < waktuMulai) {
      return res.status(403).send('Ujian belum dimulai');
    }
    
    if (now > waktuSelesai) {
      return res.status(403).send('Ujian sudah berakhir');
    }
    
    // Ambil soal-soal ujian
    db.all('SELECT * FROM soal WHERE id_ujian = ?', [ujianId], (err, soal) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Server error');
      }
      
      // Ambil jawaban siswa yang sudah ada (jika ada)
      db.all('SELECT * FROM jawaban_siswa WHERE id_ujian = ? AND nis = ?', [ujianId, req.session.user.username], (err, jawaban) => {
        if (err) {
          console.error(err);
          return res.status(500).send('Server error');
        }
        
        // Konversi jawaban menjadi objek untuk memudahkan akses
        const jawabanObj = {};
        jawaban.forEach(j => {
          jawabanObj[j.id_soal] = j.jawaban;
        });
        
        res.render('siswa/ujian', { user: req.session.user, ujian: ujian, soal: soal, jawaban: jawabanObj });
      });
    });
  });
});

// Rute untuk menyimpan jawaban siswa
app.post('/siswa/ujian/:id/jawab', (req, res) => {
  if (!req.session.user || req.session.user.type !== 'siswa') {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const ujianId = req.params.id;
  const { id_soal, jawaban } = req.body;

  // Simpan atau perbarui jawaban
  db.run(`
    INSERT INTO jawaban_siswa (id_ujian, id_soal, nis, jawaban)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(id_ujian, id_soal, nis) DO UPDATE SET jawaban = excluded.jawaban
  `, [ujianId, id_soal, req.session.user.username, jawaban], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
    res.json({ success: true });
  });
});

// Rute untuk menyelesaikan ujian
app.post('/siswa/ujian/:id/selesai', (req, res) => {
  if (!req.session.user || req.session.user.type !== 'siswa') {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const ujianId = req.params.id;

  // Tandai ujian sebagai selesai
  db.run(`
    INSERT INTO ujian_siswa (id_ujian, nis, status, waktu_selesai)
    VALUES (?, ?, 'selesai', CURRENT_TIMESTAMP)
    ON CONFLICT(id_ujian, nis) DO UPDATE SET status = 'selesai', waktu_selesai = CURRENT_TIMESTAMP
  `, [ujianId, req.session.user.username], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
    res.json({ success: true });
  });
});

// Rute untuk memeriksa status ujian
app.get('/siswa/ujian/:id/status', (req, res) => {
  if (!req.session.user || req.session.user.type !== 'siswa') {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const ujianId = req.params.id;

  db.get('SELECT status FROM ujian_siswa WHERE id_ujian = ? AND nis = ?', 
    [ujianId, req.session.user.username], 
    (err, row) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
      }
      res.json({ status: row ? row.status : 'belum_selesai' });
    }
  );
});

app.post('/siswa/update-kelas', (req, res) => {
  if (!req.session.user || req.session.user.type !== 'siswa') {
    return res.redirect('/');
  }
  const { kelas, kelas_minor, tahun } = req.body;
  const nis = req.session.user.username;

  // Cek apakah data kelas siswa sudah ada
  db.get('SELECT * FROM kelas_siswa WHERE nis = ?', [nis], (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Server error');
    }

    if (row) {
      // Jika data sudah ada, lakukan update
      db.run('UPDATE kelas_siswa SET kelas = ?, kelas_minor = ?, tahun = ? WHERE nis = ?',
        [kelas, kelas_minor, tahun, nis],
        function(err) {
          if (err) {
            console.error(err);
            return res.status(500).send('Server error');
          }
          res.redirect('/siswa/dashboard');
        });
    } else {
      // Jika data belum ada, tambahkan baru
      db.run('INSERT INTO kelas_siswa (nis, kelas, kelas_minor, tahun) VALUES (?, ?, ?, ?)',
        [nis, kelas, kelas_minor, tahun],
        function(err) {
          if (err) {
            console.error(err);
            return res.status(500).send('Server error');
          }
          res.redirect('/siswa/dashboard');
        });
    }
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
    }
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
