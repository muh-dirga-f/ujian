const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { checkAuth, checkUserType } = require('../middleware/auth');

// Admin sekolah dashboard
router.get('/dashboard', checkAuth, checkUserType('admin_sekolah'), (req, res) => {
    db.get('SELECT * FROM sekolah WHERE id_sekolah = ?', [req.session.user.id_sekolah], (err, sekolah) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Server error');
        }
        res.render('admin_sekolah/dashboard', { user: req.session.user, sekolah: sekolah });
    });
});

// Rute untuk menampilkan daftar guru
router.get('/guru', checkAuth, checkUserType('admin_sekolah'), (req, res) => {
    db.all('SELECT * FROM guru', [], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Server error');
        }
        res.render('admin_sekolah/guru', { user: req.session.user, guru: rows });
    });
});

// Rute untuk menambah guru
router.get('/guru/add', checkAuth, checkUserType('admin_sekolah'), (req, res) => {
    res.render('admin_sekolah/add_guru', { user: req.session.user });
});

router.post('/guru/add', checkAuth, checkUserType('admin_sekolah'), (req, res) => {
    const { fullname, username, password, nip } = req.body;
    db.run('INSERT INTO guru (fullname, username, password, id_sekolah, nip) VALUES (?, ?, ?, ?, ?)',
        [fullname, username, password, req.session.user.id_sekolah, nip],
        function (err) {
            if (err) {
                console.error(err);
                return res.status(500).send('Server error');
            }
            res.redirect('/admin_sekolah/guru');
        });
});

// Route for editing a guru
router.get('/guru/edit/:id', checkAuth, checkUserType('admin_sekolah'), (req, res) => {
    const { id } = req.params;
    db.get('SELECT * FROM guru WHERE id_guru = ? AND id_sekolah = ?', [id, req.session.user.id_sekolah], (err, row) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Server error');
        }
        if (!row) {
            return res.status(404).send('Guru tidak ditemukan');
        }
        res.render('admin_sekolah/edit_guru', { user: req.session.user, guru: row });
    });
});

// Route for processing the edit form
router.post('/guru/edit/:id', checkAuth, checkUserType('admin_sekolah'), (req, res) => {
    const { id } = req.params;
    const { fullname, username, password, nip } = req.body;
    let query, params;
    if (password) {
        query = 'UPDATE guru SET fullname = ?, username = ?, password = ?, nip = ? WHERE id_guru = ? AND id_sekolah = ?';
        params = [fullname, username, password, nip, id, req.session.user.id_sekolah];
    } else {
        query = 'UPDATE guru SET fullname = ?, username = ?, nip = ? WHERE id_guru = ? AND id_sekolah = ?';
        params = [fullname, username, nip, id, req.session.user.id_sekolah];
    }
    db.run(query, params, function (err) {
        if (err) {
            console.error(err);
            return res.status(500).send('Server error');
        }
        res.redirect('/admin_sekolah/guru');
    });
});

// Rute untuk menampilkan daftar siswa
router.get('/siswa', checkAuth, checkUserType('admin_sekolah'), (req, res) => {
    db.all('SELECT * FROM siswa WHERE id_sekolah = ?', [req.session.user.id_sekolah], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Server error');
        }
        res.render('admin_sekolah/siswa', { user: req.session.user, siswa: rows });
    });
});

// Rute untuk menambah siswa
router.get('/siswa/add', checkAuth, checkUserType('admin_sekolah'), (req, res) => {
    res.render('admin_sekolah/add_siswa', { user: req.session.user });
});

router.post('/siswa/add', checkAuth, checkUserType('admin_sekolah'), (req, res) => {
    const { fullname, nis, password } = req.body;
    db.run('INSERT INTO siswa (fullname, nis, password, id_sekolah) VALUES (?, ?, ?, ?)',
        [fullname, nis, password, req.session.user.id_sekolah],
        function (err) {
            if (err) {
                console.error(err);
                return res.status(500).send('Server error');
            }
            res.redirect('/admin_sekolah/siswa');
        });
});

// Rute untuk mengedit siswa
router.get('/siswa/edit/:id', checkAuth, checkUserType('admin_sekolah'), (req, res) => {
    const { id } = req.params;
    db.get('SELECT * FROM siswa WHERE id_siswa = ? AND id_sekolah = ?', [id, req.session.user.id_sekolah], (err, row) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Server error');
        }
        if (!row) {
            return res.status(404).send('Siswa tidak ditemukan');
        }
        res.render('admin_sekolah/edit_siswa', { user: req.session.user, siswa: row });
    });
});

router.post('/siswa/edit/:id', checkAuth, checkUserType('admin_sekolah'), (req, res) => {
    const { id } = req.params;
    const { fullname, nis, password } = req.body;
    let query, params;
    if (password) {
        query = 'UPDATE siswa SET fullname = ?, nis = ?, password = ? WHERE id_siswa = ? AND id_sekolah = ?';
        params = [fullname, nis, password, id, req.session.user.id_sekolah];
    } else {
        query = 'UPDATE siswa SET fullname = ?, nis = ? WHERE id_siswa = ? AND id_sekolah = ?';
        params = [fullname, nis, id, req.session.user.id_sekolah];
    }
    db.run(query, params, function (err) {
        if (err) {
            console.error(err);
            return res.status(500).send('Server error');
        }
        res.redirect('/admin_sekolah/siswa');
    });
});

// Rute untuk menghapus siswa
router.get('/siswa/delete/:id', checkAuth, checkUserType('admin_sekolah'), (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM siswa WHERE id_siswa = ? AND id_sekolah = ?', [id, req.session.user.id_sekolah], function (err) {
        if (err) {
            console.error(err);
            return res.status(500).send('Server error');
        }
        res.redirect('/admin_sekolah/siswa');
    });
});

// Rute untuk manajemen kelas
router.get('/kelas', checkAuth, checkUserType('admin_sekolah'), (req, res) => {
    db.all('SELECT k.* FROM kelas k WHERE k.id_sekolah = ?', [req.session.user.id_sekolah], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Server error');
        }
        res.render('admin_sekolah/kelas', { user: req.session.user, kelas: rows });
    });
});

router.get('/kelas/add', checkAuth, checkUserType('admin_sekolah'), (req, res) => {
    res.render('admin_sekolah/add_kelas', { user: req.session.user });
});

router.post('/kelas/add', checkAuth, checkUserType('admin_sekolah'), (req, res) => {
    const { kelas, minor_kelas, tahun } = req.body;
    db.run('INSERT INTO kelas (kelas, minor_kelas, tahun, id_sekolah) VALUES (?, ?, ?, ?)',
        [kelas, minor_kelas, tahun, req.session.user.id_sekolah],
        function (err) {
            if (err) {
                console.error(err);
                return res.status(500).send('Server error');
            }
        });
    res.redirect('/admin_sekolah/kelas');
});

router.get('/kelas/edit/:id', checkAuth, checkUserType('admin_sekolah'), (req, res) => {
    const { id } = req.params;
    db.get('SELECT * FROM kelas WHERE id_kelas = ? AND id_sekolah = ?', [id, req.session.user.id_sekolah], (err, kelas) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Server error');
        }
        res.render('admin_sekolah/edit_kelas', { user: req.session.user, kelas: kelas });
    });
});

router.post('/kelas/edit/:id', checkAuth, checkUserType('admin_sekolah'), (req, res) => {
    const { id } = req.params;
    const { kelas, minor_kelas, tahun, id_guru } = req.body;
    db.run('UPDATE kelas SET kelas = ?, minor_kelas = ?, tahun = ? WHERE id_kelas = ? AND id_sekolah = ?',
        [kelas, minor_kelas, tahun, id, req.session.user.id_sekolah],
        function (err) {
            if (err) {
                console.error(err);
                return res.status(500).send('Server error');
            }
        });
    res.redirect('/admin_sekolah/kelas');
});

router.get('/kelas/delete/:id', checkAuth, checkUserType('admin_sekolah'), (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM kelas WHERE id_kelas = ? AND id_sekolah = ?', [id, req.session.user.id_sekolah], function (err) {
        if (err) {
            console.error(err);
            return res.status(500).send('Server error');
        }
        res.redirect('/admin_sekolah/kelas');
    });
});

// Rute untuk melihat daftar mata pelajaran dalam kelas
router.get('/kelas/:id/mapel', checkAuth, checkUserType('admin_sekolah'), (req, res) => {
    const { id } = req.params;
    db.get('SELECT kelas, minor_kelas FROM kelas WHERE id_kelas = ?', [id], (err, kelas) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Server error');
        }
        if (!kelas) {
            return res.status(404).send('Kelas tidak ditemukan');
        }
        db.all(`
        SELECT m.*, g.fullname AS nama_guru
        FROM mata_pelajaran m
        LEFT JOIN guru g ON m.id_guru = g.id_guru
        WHERE m.id_kelas = ?
      `, [id], (err, mapel) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Server error');
            }
            res.render('admin_sekolah/mapel', {
                user: req.session.user,
                mapel: mapel,
                id_kelas: id,
                kelas: kelas.kelas,
                minor_kelas: kelas.minor_kelas
            });
        });
    });
});

router.get('/kelas/:id/mapel/add', checkAuth, checkUserType('admin_sekolah'), (req, res) => {
    const { id } = req.params;
    db.all('SELECT id_guru, fullname FROM guru WHERE id_sekolah = ?', [req.session.user.id_sekolah], (err, guru) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Server error');
        }
        res.render('admin_sekolah/add_mapel', { user: req.session.user, id_kelas: id, guru: guru });
    });
});

router.post('/kelas/:id/mapel/add', checkAuth, checkUserType('admin_sekolah'), (req, res) => {
    const { id } = req.params;
    const { nama_mapel, id_guru } = req.body;
    db.run('INSERT INTO mata_pelajaran (id_kelas, nama_mapel, id_guru) VALUES (?, ?, ?)',
        [id, nama_mapel, id_guru],
        function (err) {
            if (err) {
                console.error(err);
                return res.status(500).send('Server error');
            }
            res.redirect(`/kelas/${id}/mapel`);
        });
});

router.get('/kelas/:id_kelas/mapel/edit/:id_mapel', checkAuth, checkUserType('admin_sekolah'), (req, res) => {
    const { id_kelas, id_mapel } = req.params;
    db.get('SELECT * FROM mata_pelajaran WHERE id_mapel = ? AND id_kelas = ?', [id_mapel, id_kelas], (err, mapel) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Server error');
        }
        db.all('SELECT id_guru, fullname FROM guru WHERE id_sekolah = ?', [req.session.user.id_sekolah], (err, guru) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Server error');
            }
            res.render('admin_sekolah/edit_mapel', { user: req.session.user, mapel: mapel, id_kelas, guru: guru });
        });
    });
});

router.post('/kelas/:id_kelas/mapel/edit/:id_mapel', checkAuth, checkUserType('admin_sekolah'), (req, res) => {
    const { id_kelas, id_mapel } = req.params;
    const { nama_mapel, id_guru } = req.body;
    db.run('UPDATE mata_pelajaran SET nama_mapel = ?, id_guru = ? WHERE id_mapel = ? AND id_kelas = ?',
        [nama_mapel, id_guru, id_mapel, id_kelas],
        function (err) {
            if (err) {
                console.error(err);
                return res.status(500).send('Server error');
            }
            res.redirect(`/admin_sekolah/kelas/${id_kelas}/mapel`);
        });
});

router.get('/kelas/:id_kelas/mapel/delete/:id_mapel', checkAuth, checkUserType('admin_sekolah'), (req, res) => {
    const { id_kelas, id_mapel } = req.params;
    db.run('DELETE FROM mata_pelajaran WHERE id_mapel = ? AND id_kelas = ?', [id_mapel, id_kelas], function (err) {
        if (err) {
            console.error(err);
            return res.status(500).send('Server error');
        }
        res.redirect(`/kelas/${id_kelas}/mapel`);
    });
});

// Rute untuk menghapus guru
router.get('/guru/delete/:id', checkAuth, checkUserType('admin_sekolah'), (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM guru WHERE id_guru = ? AND id_sekolah = ?', [id, req.session.user.id_sekolah], function (err) {
        if (err) {
            console.error(err);
            return res.status(500).send('Server error');
        }
        res.redirect('/admin_sekolah/guru');
    });
});

// Rute untuk menampilkan daftar guru
router.get('/guru', checkAuth, checkUserType('admin_sekolah'), (req, res) => {
    db.all('SELECT * FROM guru WHERE id_sekolah = ?', [req.session.user.id_sekolah], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Server error');
        }
        res.render('admin_sekolah/guru', { user: req.session.user, guru: rows });
    });
});

// Rute untuk menambah guru
router.get('/guru/add', checkAuth, checkUserType('admin_sekolah'), (req, res) => {
    res.render('admin_sekolah/add_guru', { user: req.session.user });
});

router.post('/guru/add', checkAuth, checkUserType('admin_sekolah'), (req, res) => {
    const { fullname, username, password, nip } = req.body;
    db.run('INSERT INTO guru (fullname, username, password, id_sekolah, nip) VALUES (?, ?, ?, ?, ?)',
        [fullname, username, password, req.session.user.id_sekolah, nip],
        function (err) {
            if (err) {
                console.error(err);
                return res.status(500).send('Server error');
            }
            res.redirect('/admin_sekolah/guru');
        });
});

// Rute untuk menampilkan daftar siswa
router.get('/siswa', checkAuth, checkUserType('admin_sekolah'), (req, res) => {
    db.all('SELECT * FROM siswa WHERE id_sekolah = ?', [req.session.user.id_sekolah], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Server error');
        }
        res.render('admin_sekolah/siswa', { user: req.session.user, siswa: rows });
    });
});

// Rute untuk menambah siswa
router.get('/siswa/add', checkAuth, checkUserType('admin_sekolah'), (req, res) => {
    res.render('admin_sekolah/add_siswa', { user: req.session.user });
});

router.post('/siswa/add', checkAuth, checkUserType('admin_sekolah'), (req, res) => {
    const { fullname, nis, password } = req.body;
    db.run('INSERT INTO siswa (fullname, nis, password, id_sekolah) VALUES (?, ?, ?, ?)',
        [fullname, nis, password, req.session.user.id_sekolah],
        function (err) {
            if (err) {
                console.error(err);
                return res.status(500).send('Server error');
            }
            res.redirect('/admin_sekolah/siswa');
        });
});

// Export router
module.exports = router;
