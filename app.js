const express = require('express');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const port = 3000;

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
    db.run(`CREATE TABLE IF NOT EXISTS sekolah (
      id_sekolah INTEGER PRIMARY KEY AUTOINCREMENT,
      npsn TEXT,
      nama_sekolah TEXT,
      alamat TEXT,
      kab_kota TEXT,
      provinsi TEXT
    )`);
  }
});

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: 'rahasia',
  resave: false,
  saveUninitialized: true
}));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => {
  res.render('login');
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
        type: userType 
      };
      res.redirect(`/${userType}/dashboard`);
    } else {
      res.status(401).send('Username/NIS atau password salah');
    }
  });
});

app.get('/admin/dashboard', (req, res) => {
  if (!req.session.user || req.session.user.type !== 'admin') {
    return res.redirect('/');
  }
  res.render('admin/dashboard', { user: req.session.user });
});

// Rute untuk manajemen pengguna
app.get('/admin/users', (req, res) => {
  if (!req.session.user || req.session.user.type !== 'admin') {
    return res.redirect('/');
  }
  db.all('SELECT * FROM guru UNION SELECT * FROM siswa UNION SELECT * FROM admin', [], (err, rows) => {
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
    res.render('admin/edit_user', { user: req.session.user, editUser: row, userType: type });
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
      query = 'UPDATE guru SET fullname = ?, username = ?, password = ?, id_sekolah = ?, nip = ? WHERE id_guru = ?';
      params = [fullname, username, password, id_sekolah, nip, id];
      break;
    case 'siswa':
      query = 'UPDATE siswa SET fullname = ?, nis = ?, password = ?, id_sekolah = ? WHERE id_siswa = ?';
      params = [fullname, nis, password, id_sekolah, id];
      break;
    case 'admin':
      query = 'UPDATE admin SET fullname = ?, username = ?, password = ? WHERE id_admin = ?';
      params = [fullname, username, password, id];
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

app.get('/guru/dashboard', (req, res) => {
  if (!req.session.user || req.session.user.type !== 'guru') {
    return res.redirect('/');
  }
  res.render('guru/dashboard', { user: req.session.user });
});

app.get('/siswa/dashboard', (req, res) => {
  if (!req.session.user || req.session.user.type !== 'siswa') {
    return res.redirect('/');
  }
  res.render('siswa/dashboard', { user: req.session.user });
});

app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
    }
    res.redirect('/');
  });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
