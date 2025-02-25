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
    const { username, password } = req.body;
    
    // Cek di tabel admin
    db.get('SELECT *, "admin" as userType FROM admin WHERE username = ?', [username], (err, admin) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Server error');
        }
        
        // Cek di tabel admin_sekolah
        if (!admin) {
            db.get('SELECT *, "admin_sekolah" as userType FROM admin_sekolah WHERE username = ?', [username], (err, adminSekolah) => {
                if (err) {
                    console.error(err);
                    return res.status(500).send('Server error');
                }
                
                // Cek di tabel guru
                if (!adminSekolah) {
                    db.get('SELECT *, "guru" as userType FROM guru WHERE username = ?', [username], (err, guru) => {
                        if (err) {
                            console.error(err);
                            return res.status(500).send('Server error');
                        }
                        
                        // Cek di tabel siswa
                        if (!guru) {
                            db.get('SELECT *, "siswa" as userType FROM siswa WHERE nis = ?', [username], (err, siswa) => {
                                if (err) {
                                    console.error(err);
                                    return res.status(500).send('Server error');
                                }
                                
                                if (!siswa) {
                                    return res.status(401).send('Username/NIS atau password salah');
                                }
                                
                                handleLogin(siswa, password, req, res);
                            });
                        } else {
                            handleLogin(guru, password, req, res);
                        }
                    });
                } else {
                    handleLogin(adminSekolah, password, req, res);
                }
            });
        } else {
            handleLogin(admin, password, req, res);
        }
    });
});

function handleLogin(user, password, req, res) {
    if (password !== user.password) {
        return res.status(401).send('Username/NIS atau password salah');
    }

    req.session.user = {
        id: user.id_guru || user.id_admin || user.id_admin_sekolah || user.id_siswa,
        username: user.username || user.nis,
        fullname: user.fullname,
        type: user.userType,
        id_sekolah: user.id_sekolah
    };
    req.session.isLoggedIn = true;
    res.redirect(`/${user.userType}/dashboard`);
}

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
