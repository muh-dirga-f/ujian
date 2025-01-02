const express = require('express');
const session = require('express-session');
const path = require('path');
const crypto = require('crypto');
const db = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const adminSekolahRoutes = require('./routes/admin_sekolah');
const guruRoutes = require('./routes/guru');
const siswaRoutes = require('./routes/siswa');

const app = express();
const port = process.env.PORT || 3000;

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

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/', authRoutes);
app.use('/admin', adminRoutes);
app.use('/admin_sekolah', adminSekolahRoutes);
app.use('/guru', guruRoutes);
app.use('/siswa', siswaRoutes);

// Error handlers
app.use((req, res, next) => {
  res.status(404).render('error', {
    message: 'Page not found',
    error: {},
    user: req.session.user || null
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).render('error', {
    message: err.message,
    error: process.env.NODE_ENV === 'development' ? err : {},
    user: req.session.user || null
  });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
