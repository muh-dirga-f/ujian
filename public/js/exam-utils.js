// Fungsi untuk mengelola mode fullscreen
const FullscreenManager = {
  async checkExamStatus() {
    try {
      const examId = window.location.pathname.split('/').pop();
      const response = await fetch(`/siswa/ujian/${examId}/status`);
      const data = await response.json();
      return data.status;
    } catch (e) {
      console.error('Error checking exam status:', e);
      return null;
    }
  },

  async enable() {
    const examStatus = await this.checkExamStatus();
    if (examStatus === 'selesai') {
      this.showNavigationElements();
      return; // Jangan aktifkan fullscreen jika ujian sudah selesai
    }

    try {
      const el = document.documentElement;
      const rfs = el.requestFullscreen
        || el.webkitRequestFullScreen
        || el.mozRequestFullScreen
        || el.msRequestFullscreen;

      await rfs.call(el);
      this.hideNavigationElements();
      await this.lockOrientation();
    } catch (e) {
      console.error('Error enabling fullscreen:', e);
      this.showFullscreenError();
    }
  },

  hideNavigationElements() {
    document.querySelector('.main-header').style.display = 'none';
    document.querySelector('.main-sidebar').style.display = 'none';
    document.querySelector('.main-footer').style.display = 'none';
    document.querySelector('.content-wrapper').style.marginLeft = '0';
  },

  showNavigationElements() {
    document.querySelector('.main-header').style.display = 'block';
    document.querySelector('.main-sidebar').style.display = 'block';
    document.querySelector('.main-footer').style.display = 'block';
    document.querySelector('.content-wrapper').style.marginLeft = '250px';
  },

  async lockOrientation() {
    if (window.screen?.orientation?.lock) {
      try {
        await window.screen.orientation.lock('landscape');
      } catch (e) {
        console.error('Failed to lock orientation:', e);
      }
    }
  },

  showFullscreenError() {
    NotificationManager.show('Mohon izinkan mode fullscreen untuk melanjutkan ujian');
  },

  async setupFullscreenListeners() {
    const examStatus = await this.checkExamStatus();
    if (examStatus === 'selesai') {
      this.showNavigationElements();
      return; // Jangan setup listener jika ujian sudah selesai
    }

    ['', 'webkit', 'moz', 'MS'].forEach(prefix => {
      document.addEventListener(`${prefix}fullscreenchange`, async () => {
        const currentStatus = await this.checkExamStatus();
        if (currentStatus === 'selesai') {
          this.showNavigationElements();
          return;
        }

        if (!document.fullscreenElement && 
            !document.webkitFullscreenElement && 
            !document.mozFullscreenElement && 
            !document.msFullscreenElement) {
          NotificationManager.show('Mohon tetap dalam mode fullscreen selama ujian berlangsung!');
          this.enable();
        }
      });
    });
  }
};

// Fungsi untuk mengelola notifikasi
const NotificationManager = {
  show(message) {
    alert(message); // Bisa diganti dengan notifikasi yang lebih menarik
  }
};

// Fungsi untuk mengelola keamanan ujian
const ExamSecurity = {
  async setup() {
    const examStatus = await FullscreenManager.checkExamStatus();
    if (examStatus === 'selesai') {
      return; // Jangan setup security jika ujian sudah selesai
    }

    // Mencegah navigasi keluar
    window.onbeforeunload = () => {
      return "Anda yakin ingin meninggalkan halaman ujian?";
    };

    // Nonaktifkan tombol kembali browser
    history.pushState(null, null, location.href);
    window.onpopstate = () => {
      history.go(1);
    };

    // Nonaktifkan klik kanan
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    // Nonaktifkan shortcut keyboard
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey && e.key === 'w') || 
          (e.altKey && e.key === 'Tab') ||
          (e.altKey && e.key === 'F4') ||
          (e.key === 'F11') ||
          (e.ctrlKey && e.key === 'r') ||
          (e.ctrlKey && e.key === 'R')) {
        e.preventDefault();
        return false;
      }
    });

    // Deteksi perpindahan tab/window
    document.addEventListener('visibilitychange', async () => {
      const currentStatus = await FullscreenManager.checkExamStatus();
      if (currentStatus === 'selesai') return;

      if (document.visibilityState !== 'visible') {
        NotificationManager.show('Mohon jangan berpindah tab/window selama ujian berlangsung!');
      }
    });
  }
};
