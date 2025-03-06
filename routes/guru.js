const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { checkAuth, checkUserType } = require('../middleware/auth');

// Guru dashboard

router.get('/dashboard', checkAuth, checkUserType('guru'), (req, res) => {
    db.get('SELECT g.*, s.nama_sekolah FROM guru g JOIN sekolah s ON g.id_sekolah = s.id_sekolah WHERE g.id_guru = ?',
        [req.session.user.id],
        (err, row) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Server error');
            }
            res.render('guru/dashboard', { user: { ...req.session.user, ...row } });
        }
    );
});

router.get('/ujian', checkAuth, checkUserType('guru'), (req, res) => {
    if (!req.session.user || req.session.user.type !== 'guru') {
        return res.redirect('/');
    }
    
    // Query untuk mendapatkan semua ujian guru
    const query = `
        SELECT u.id_ujian, u.judul_ujian, k.kelas, k.minor_kelas, m.nama_mapel, u.waktu_mulai, u.waktu_selesai,
               k.id_kelas
        FROM ujian u
        JOIN kelas k ON u.id_kelas = k.id_kelas
        JOIN mata_pelajaran m ON u.id_mapel = m.id_mapel
        WHERE m.id_guru = ?
        ORDER BY u.waktu_mulai DESC
    `;
    
    db.all(query, [req.session.user.id], (err, ujianList) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Server error');
        }
        
        res.render('guru/ujian', { 
            user: req.session.user, 
            ujianList: ujianList
        });
    });
});

// Rute untuk menampilkan daftar soal
router.get('/ujian/:id/soal', (req, res) => {
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
router.get('/ujian/:id/soal/add', (req, res) => {
    if (!req.session.user || req.session.user.type !== 'guru') {
        return res.redirect('/');
    }
    const { id } = req.params;
    res.render('guru/add_soal', { user: req.session.user, id_ujian: id });
});

// Rute untuk memproses penambahan soal
router.post('/ujian/:id/soal/add', (req, res) => {
    if (!req.session.user || req.session.user.type !== 'guru') {
        return res.redirect('/');
    }
    const { id } = req.params;
    const { jenis_soal, soal, kunci_jawaban, kata_kunci, pilihan_ganda, nilai } = req.body;
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
    db.run('INSERT INTO soal (id_ujian, jenis_soal, soal, kunci_jawaban, pilihan_ganda, nilai) VALUES (?, ?, ?, ?, ?, ?)',
        [id, jenis_soal, soal, kunci, pilihan_ganda_json, nilai], (err) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Server error');
            }
            res.redirect(`/guru/ujian/${id}/soal`);
        });
});

// Rute untuk menampilkan form edit soal
router.get('/ujian/:id_ujian/soal/edit/:id_soal', (req, res) => {
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
router.post('/ujian/:id_ujian/soal/edit/:id_soal', (req, res) => {
    if (!req.session.user || req.session.user.type !== 'guru') {
        return res.redirect('/');
    }
    const { id_ujian, id_soal } = req.params;
    const { jenis_soal, soal, kunci_jawaban, kata_kunci, pilihan_ganda, nilai } = req.body;
    let pilihan_ganda_json = null;
    if (jenis_soal === 'pilihan_ganda') {
        pilihan_ganda_json = JSON.stringify(pilihan_ganda);
    }
    const kunci = jenis_soal === 'pilihan_ganda' ? kunci_jawaban : kata_kunci;
    db.run('UPDATE soal SET jenis_soal = ?, soal = ?, kunci_jawaban = ?, pilihan_ganda = ?, nilai = ? WHERE id_soal = ? AND id_ujian = ?',
        [jenis_soal, soal, kunci, pilihan_ganda_json, nilai, id_soal, id_ujian], (err) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Server error');
            }
            res.redirect(`/guru/ujian/${id_ujian}/soal`);
        });
});

// Rute untuk menghapus soal
router.get('/ujian/:id_ujian/soal/delete/:id_soal', (req, res) => {
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

router.get('/ujian/add', (req, res) => {
    if (!req.session.user || req.session.user.type !== 'guru') {
        return res.redirect('/');
    }
    db.all(`
      SELECT m.*, k.kelas, k.minor_kelas
      FROM mata_pelajaran m
      JOIN kelas k ON m.id_kelas = k.id_kelas
      WHERE m.id_guru = ?
    `, [req.session.user.id], (err, rows) => {
        console.log(req.session.user.id);
        if (err) {
            console.error(err);
            return res.status(500).send('Server error');
        }
        res.render('guru/add_ujian', { user: req.session.user, kelasList: rows });
    });
});

router.post('/ujian/add', (req, res) => {
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

router.get('/ujian/edit/:id', (req, res) => {
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
        WHERE m.id_guru = ?
      `, [req.session.user.id], (err, rows) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Server error');
            }
            res.render('guru/edit_ujian', { user: req.session.user, ujian: ujian, kelasList: rows });
        });
    });
});

router.post('/ujian/edit/:id', (req, res) => {
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

router.get('/ujian/delete/:id', (req, res) => {
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

router.get('/ujian/:id/nilai', (req, res) => {
    if (!req.session.user || req.session.user.type !== 'guru') {
        return res.redirect('/');
    }
    const { id } = req.params;

    // Fetch exam details and teacher's school
    db.get(`
      SELECT u.*, m.nama_mapel, k.kelas, k.minor_kelas, g.id_sekolah
      FROM ujian u
      JOIN mata_pelajaran m ON u.id_mapel = m.id_mapel
      JOIN kelas k ON u.id_kelas = k.id_kelas
      JOIN guru g ON m.id_guru = g.id_guru
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
        WHERE ks.kelas = ? AND ks.kelas_minor = ? AND s.id_sekolah = ?
        GROUP BY s.nis
      `, [id, id, ujian.kelas, ujian.minor_kelas, ujian.id_sekolah], (err, jawaban) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Server error');
            }

            res.render('guru/nilai_ujian', { user: req.session.user, ujian: ujian, jawaban: jawaban });
        });
    });
});

router.get('/ujian/:id_ujian/nilai/:nis', (req, res) => {
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

                    // Calculate scores
                    const scores = soal.map(s => {
                        const jawabanSiswa = jawabanObj[s.id_soal] || '';
                        if (s.jenis_soal === 'pilihan_ganda') {
                            return s.kunci_jawaban === jawabanSiswa ? s.nilai : 0;
                        } else if (s.jenis_soal === 'essay') {
                            const kataKunci = s.kunci_jawaban.split(',').map(k => k.trim().toLowerCase());
                            const jawabanKata = jawabanSiswa.toLowerCase().split(' ');
                            const matchedKata = kataKunci.filter(k => jawabanKata.includes(k));
                            return Math.round((matchedKata.length / kataKunci.length) * s.nilai);
                        }
                        return 0;
                    });

                    res.render('guru/nilai_siswa', {
                        user: req.session.user,
                        ujian: ujian,
                        siswa: siswa,
                        soal: soal,
                        jawaban: jawabanObj,
                        scores: scores
                    });
                });
            });
        });
    });
});

router.post('/ujian/:id_ujian/nilai/:nis', (req, res) => {
    if (!req.session.user || req.session.user.type !== 'guru') {
        return res.redirect('/');
    }
    const { id_ujian, nis } = req.params;
    const { nilai, status, soal_ids } = req.body;


    if (!soal_ids) {
        console.error('soal_ids is missing from form submission');
        return res.status(400).send('Missing required question IDs');
    }

    // Convert nilai object keys to match soal_ids
    const nilaiValues = Object.values(nilai);

    // Calculate total score
    const totalNilai = nilaiValues.reduce((sum, nilai) => sum + parseInt(nilai), 0);

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
        const nilaiSoalPromises = Object.entries(nilai).map(([index, nilai_soal]) => {
            id_soal = soal_ids[index]
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

router.get('/ujian/edit/:id_kelas/:id_mapel', (req, res) => {
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

router.post('/ujian/edit/:id_kelas/:id_mapel', (req, res) => {
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

router.get('/ujian/delete/:id_kelas/:id_mapel', (req, res) => {
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

// Export router
module.exports = router;
