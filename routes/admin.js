const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { checkAuth, checkUserType } = require('../middleware/auth');

// Admin dashboard
router.get('/dashboard', checkAuth, checkUserType('admin'), (req, res) => {
    res.render('admin/dashboard', { user: req.session.user });
});

// Rute untuk manajemen pengguna
router.get('/users', checkAuth, checkUserType('admin'), (req, res) => {
    if (!req.session.user || req.session.user.type !== 'admin') {
        return res.redirect('/');
    }
    db.all(`
      SELECT id_guru AS id, fullname, username, 'guru' AS user_type, id_sekolah, nip, NULL AS nis, 'guru' AS id_type FROM guru
      UNION ALL
      SELECT id_siswa AS id, fullname, nis AS username, 'siswa' AS user_type, id_sekolah, NULL AS nip, nis, 'siswa' AS id_type FROM siswa
      UNION ALL
      SELECT id_admin AS id, fullname, username, 'admin' AS user_type, NULL AS id_sekolah, NULL AS nip, NULL AS nis, 'admin' AS id_type FROM admin
      UNION ALL
      SELECT id_admin_sekolah AS id, fullname, username, 'admin_sekolah' AS user_type, id_sekolah, NULL AS nip, NULL AS nis, 'admin_sekolah' AS id_type FROM admin_sekolah
    `, [], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Server error');
        }
        res.render('admin/users', { users: rows, user: req.session.user });
    });
});

router.get('/users/add', (req, res) => {
    if (!req.session.user || req.session.user.type !== 'admin') {
        return res.redirect('/');
    }
    db.all('SELECT id_sekolah, nama_sekolah FROM sekolah', [], (err, schools) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Server error');
        }
        res.render('admin/add_user', { user: req.session.user, schools: schools });
    });
});

router.post('/users/add', (req, res) => {
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
        case 'admin_sekolah':
            query = 'INSERT INTO admin_sekolah (fullname, username, password, id_sekolah) VALUES (?, ?, ?, ?)';
            params = [fullname, username, password, id_sekolah];
            break;
        default:
            return res.status(400).send('Invalid user type');
    }

    db.run(query, params, function (err) {
        if (err) {
            console.error(err);
            return res.status(500).send('Server error');
        }
        res.redirect('/admin/users');
    });
});

router.get('/users/edit/:id/:type', (req, res) => {
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

router.post('/users/edit/:id/:type', (req, res) => {
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

    db.run(query, params, function (err) {
        if (err) {
            console.error(err);
            return res.status(500).send('Server error');
        }
        res.redirect('/admin/users');
    });
});

router.get('/users/delete/:id/:type', (req, res) => {
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
        case 'admin_sekolah':
            query = 'DELETE FROM admin_sekolah WHERE id_admin_sekolah = ?';
            break;
        default:
            return res.status(400).send('Invalid user type');
    }
    db.run(query, [id], function (err) {
        if (err) {
            console.error(err);
            return res.status(500).send('Server error');
        }
        res.redirect('/admin/users');
    });
});

// Rute untuk manajemen sekolah
router.get('/sekolah', (req, res) => {
    if (!req.session.user || req.session.user.type !== 'admin') {
        return res.redirect('/');
    }
    db.all('SELECT * FROM sekolah', [], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Server error');
        }
        res.render('admin/sekolah', { sekolah: rows, user: req.session.user });
    });
});

router.get('/sekolah/add', (req, res) => {
    if (!req.session.user || req.session.user.type !== 'admin') {
        return res.redirect('/');
    }
    res.render('admin/add_school', { user: req.session.user });
});

router.post('/sekolah/add', (req, res) => {
    if (!req.session.user || req.session.user.type !== 'admin') {
        return res.redirect('/');
    }
    const { npsn, nama_sekolah, alamat, kab_kota, provinsi } = req.body;
    db.run('INSERT INTO sekolah (npsn, nama_sekolah, alamat, kab_kota, provinsi) VALUES (?, ?, ?, ?, ?)',
        [npsn, nama_sekolah, alamat, kab_kota, provinsi],
        function (err) {
            if (err) {
                console.error(err);
                return res.status(500).send('Server error');
            }
            res.redirect('/admin/sekolah');
        });
});

router.get('/sekolah/edit/:id', (req, res) => {
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

router.post('/sekolah/edit/:id', (req, res) => {
    if (!req.session.user || req.session.user.type !== 'admin') {
        return res.redirect('/');
    }
    const { id } = req.params;
    const { npsn, nama_sekolah, alamat, kab_kota, provinsi } = req.body;
    db.run('UPDATE sekolah SET npsn = ?, nama_sekolah = ?, alamat = ?, kab_kota = ?, provinsi = ? WHERE id_sekolah = ?',
        [npsn, nama_sekolah, alamat, kab_kota, provinsi, id],
        function (err) {
            if (err) {
                console.error(err);
                return res.status(500).send('Server error');
            }
            res.redirect('/admin/sekolah');
        });
});

router.get('/sekolah/delete/:id', (req, res) => {
    if (!req.session.user || req.session.user.type !== 'admin') {
        return res.redirect('/');
    }
    const { id } = req.params;
    db.run('DELETE FROM sekolah WHERE id_sekolah = ?', [id], function (err) {
        if (err) {
            console.error(err);
            return res.status(500).send('Server error');
        }
        res.redirect('/admin/sekolah');
    });
});

// Export router
module.exports = router;
