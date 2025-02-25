const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { checkAuth, checkUserType } = require('../middleware/auth');

// Siswa dashboard
router.get('/dashboard', checkAuth, checkUserType('siswa'), async (req, res) => {
    if (!req.session.user || req.session.user.type !== 'siswa') {
        return res.redirect('/');
    }

    // Cek apakah ada ujian yang sedang aktif
    const now = new Date();
    db.get(`
        SELECT u.id_ujian 
        FROM ujian u
        JOIN kelas k ON u.id_kelas = k.id_kelas
        JOIN kelas_siswa ks ON k.kelas = ks.kelas AND k.minor_kelas = ks.kelas_minor
        WHERE ks.nis = ? 
        AND u.waktu_mulai <= ?
        AND u.waktu_selesai >= ?
        AND NOT EXISTS (
            SELECT 1 FROM ujian_siswa us 
            WHERE us.id_ujian = u.id_ujian 
            AND us.nis = ?
            AND us.status = 'selesai'
        )
        LIMIT 1
    `, [req.session.user.username, now, now, req.session.user.username], (err, activeExam) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Server error');
        }

        if (activeExam) {
            return res.redirect(`/siswa/ujian/${activeExam.id_ujian}`);
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

router.get('/jadwal-ujian', (req, res) => {
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

router.get('/nilai', checkAuth, checkUserType('siswa'), (req, res) => {
    if (!req.session.user || req.session.user.type !== 'siswa') {
        return res.redirect('/');
    }

    db.all(`
      SELECT u.judul_ujian, m.nama_mapel, k.kelas, k.minor_kelas, nu.nilai_total, nu.status, u.waktu_mulai
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

router.get('/ujian/:id', (req, res) => {
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

        // Fungsi untuk mengacak array menggunakan Fisher-Yates Shuffle
        // function fisherYatesShuffle(array) {
        //     for (let i = array.length - 1; i > 0; i--) {
        //         const j = Math.floor(Math.random() * (i + 1));
        //         [array[i], array[j]] = [array[j], array[i]];
        //     }
        //     return array;
        // }

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

                // Gunakan urutan soal yang tersimpan di session jika ada
                // if (!req.session.soalOrder || req.session.soalOrder.ujianId !== ujianId) {
                //     // Acak soal menggunakan Fisher-Yates Shuffle
                //     const shuffledSoal = fisherYatesShuffle([...soal]);
                //     req.session.soalOrder = {
                //         ujianId: ujianId,
                //         order: shuffledSoal.map(s => s.id_soal)
                //     };
                //     soal = shuffledSoal;
                // } else {
                //     // Urutkan soal sesuai urutan yang tersimpan
                //     soal.sort((a, b) => {
                //         return req.session.soalOrder.order.indexOf(a.id_soal) -
                //             req.session.soalOrder.order.indexOf(b.id_soal);
                //     });
                // }

                res.render('siswa/ujian', { user: req.session.user, ujian: ujian, soal: soal, jawaban: jawabanObj });
            });
        });
    });
});

// Rute untuk menyimpan jawaban siswa
router.post('/ujian/:id/jawab', (req, res) => {
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
const PDFDocument = require('pdfkit');

// Rute untuk mengunduh hasil ujian
router.get('/nilai/download/:id', checkAuth, checkUserType('siswa'), (req, res) => {
    const ujianId = req.params.id;
    const nis = req.session.user.username;

    // Ambil data ujian
    db.get(`
        SELECT u.judul_ujian, u.waktu_mulai, m.nama_mapel, k.kelas, k.minor_kelas
        FROM ujian u
        JOIN mata_pelajaran m ON u.id_mapel = m.id_mapel
        JOIN kelas k ON u.id_kelas = k.id_kelas
        WHERE u.id_ujian = ?
    `, [ujianId], (err, ujian) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Server error');
        }

        // Ambil soal dan jawaban
        db.all(`
            SELECT s.soal, s.jenis_soal, s.pilihan_ganda, s.kunci_jawaban,
                   js.jawaban, 
                   CASE WHEN js.jawaban = s.kunci_jawaban THEN 1 ELSE 0 END as is_correct
            FROM soal s
            LEFT JOIN jawaban_siswa js ON s.id_soal = js.id_soal AND js.nis = ?
            WHERE s.id_ujian = ?
        `, [nis, ujianId], (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Server error');
            }

            // Buat PDF
            const doc = new PDFDocument();
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=hasil-ujian-${ujianId}.pdf`);
            doc.pipe(res);

            // Header
            doc.fontSize(16).text('HASIL UJIAN', {align: 'center'});
            doc.moveDown();
            doc.fontSize(12).text(`Ujian: ${ujian.judul_ujian}`);
            doc.text(`Mata Pelajaran: ${ujian.nama_mapel}`);
            doc.text(`Kelas: ${ujian.kelas} ${ujian.minor_kelas}`);
            doc.text(`Tanggal: ${new Date(ujian.waktu_mulai).toLocaleDateString('id-ID')}`);
            doc.moveDown();

            // Soal dan Jawaban
            results.forEach((row, index) => {
                doc.fontSize(12).text(`Soal ${index + 1}: ${row.soal}`);
                
                if (row.jenis_soal === 'pilihan_ganda') {
                    const options = JSON.parse(row.pilihan_ganda);
                    doc.fontSize(10).text('Pilihan Jawaban:');
                    Object.entries(options).forEach(([key, value]) => {
                        doc.text(`${key}. ${value}`);
                    });
                }

                doc.fontSize(10)
                   .fillColor(row.is_correct ? 'green' : 'red')
                   .text(`Jawaban Anda: ${row.jawaban || '-'}`)
                   .text(`Kunci Jawaban: ${row.kunci_jawaban}`)
                   .text(`Status: ${row.is_correct ? 'Benar' : 'Salah'}`)
                   .fillColor('black');
                
                doc.moveDown();
            });

            // Hitung total nilai
            const totalSoal = results.length;
            const benar = results.filter(r => r.is_correct).length;
            const nilai = (benar / totalSoal) * 100;

            doc.moveDown()
               .fontSize(12)
               .text(`Total Soal: ${totalSoal}`)
               .text(`Jawaban Benar: ${benar}`)
               .text(`Nilai: ${nilai.toFixed(2)}`);

            doc.end();
        });
    });
});

router.post('/ujian/:id/selesai', (req, res) => {
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
router.get('/ujian/:id/status', (req, res) => {
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

router.post('/update-kelas', (req, res) => {
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
                function (err) {
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
                function (err) {
                    if (err) {
                        console.error(err);
                        return res.status(500).send('Server error');
                    }
                    res.redirect('/siswa/dashboard');
                });
        }
    });
});

// Export router
module.exports = router;
