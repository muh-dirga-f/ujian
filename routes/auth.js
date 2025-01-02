const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { checkAuth, checkUserType } = require('../middleware/auth');

router.get('/', (req, res) => {
    db.all('SELECT id_sekolah, nama_sekolah FROM sekolah', [], (err, schools) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Server error');
        }
        res.render('login', { schools: schools });
    });
});

router.post('/login', (req, res) => {
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
        case 'admin_sekolah':
            table = 'admin_sekolah';
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
                id: row.id_guru || row.id_admin || row.id_admin_sekolah || row.id_siswa,
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

router.post('/register', (req, res) => {
    const { fullname, nis, password, id_sekolah } = req.body;

    db.run('INSERT INTO siswa (fullname, nis, password, id_sekolah) VALUES (?, ?, ?, ?)',
        [fullname, nis, password, id_sekolah],
        function (err) {
            if (err) {
                console.error(err);
                return res.status(500).send('Server error');
            }
            res.redirect('/');
        }
    );
});

router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        }
        res.clearCookie('connect.sid');
        res.redirect('/');
    });
});

module.exports = router;
