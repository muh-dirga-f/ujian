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
