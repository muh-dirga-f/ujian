const sqlite3 = require('sqlite3').verbose();

function initDatabase() {
    // Konfigurasi database
    const db = new sqlite3.Database('./ujian_sekolah.db', (err) => {
        if (err) {
            console.error('Error opening database', err);
            return;
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
            db.run(`CREATE TABLE IF NOT EXISTS admin_sekolah (
            id_admin_sekolah INTEGER PRIMARY KEY AUTOINCREMENT,
            fullname TEXT,
            username TEXT UNIQUE,
            password TEXT,
            id_sekolah INTEGER,
            FOREIGN KEY (id_sekolah) REFERENCES sekolah(id_sekolah)
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
            id_sekolah INTEGER,
            kelas TEXT,
            minor_kelas TEXT,
            tahun INTEGER,
            FOREIGN KEY (id_sekolah) REFERENCES sekolah(id_sekolah)
        )`);
            db.run(`CREATE TABLE IF NOT EXISTS mata_pelajaran (
            id_mapel INTEGER PRIMARY KEY AUTOINCREMENT,
            id_kelas INTEGER,
            id_guru INTEGER,
            nama_mapel TEXT,
            FOREIGN KEY (id_kelas) REFERENCES kelas(id_kelas),
            FOREIGN KEY (id_guru) REFERENCES guru(id_guru)
        )`);

            // Alter table to add id_guru column if it doesn't exist
            db.run(`PRAGMA foreign_keys=off;
        BEGIN TRANSACTION;
        ALTER TABLE mata_pelajaran ADD COLUMN id_guru INTEGER REFERENCES guru(id_guru);
        COMMIT;
        PRAGMA foreign_keys=on;`);
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
            nilai INTEGER,
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

    // Enable foreign keys
    db.run('PRAGMA foreign_keys = ON');

    return db;
}

// Create and configure a single database instance
const db = initDatabase();

// Export the configured database instance
module.exports = db;
