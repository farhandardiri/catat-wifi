// Fixed Auth for Write Operations Only
const auth = {
  accessToken: null,
  tokenClient: null,

  init() {
    // console.log("Auth initialized for write operations");
    this.checkExistingLogin();
    // Google Auth akan di-init ketika dibutuhkan
  },

  initializeGoogleAuth() {
    return new Promise((resolve, reject) => {
      try {
        // console.log("Initializing Google Auth...");

        // Pastikan GSI sudah loaded
        if (
          typeof google === "undefined" ||
          !google.accounts ||
          !google.accounts.oauth2
        ) {
          throw new Error("Google Identity Services not loaded");
        }

        this.tokenClient = google.accounts.oauth2.initTokenClient({
          client_id:
            "1060874294167-ns49dcu2q2il6cp04miccvgti82duf0v.apps.googleusercontent.com", // GANTI dengan Client ID Anda
          scope: "https://www.googleapis.com/auth/spreadsheets",
          callback: (response) => {
            // console.log("Token response received");
            this.handleTokenResponse(response);
            resolve();
          },
          error_callback: (error) => {
            console.error("Google Auth error:", error);
            reject(error);
          },
        });

        // console.log("Google Auth initialized successfully");
        resolve();
      } catch (error) {
        console.error("Failed to initialize Google Auth:", error);
        reject(error);
      }
    });
  },

  async handleTokenResponse(response) {
    try {
      // console.log("Processing token response:", response);

      if (response.error) {
        throw new Error(response.error);
      }

      if (!response.access_token) {
        throw new Error("No access token received");
      }

      this.accessToken = response.access_token;

      // Simpan ke localStorage
      localStorage.setItem("googleAccessToken", this.accessToken);

      // Update spreadsheet
      spreadsheet.setAccessToken(this.accessToken);

      // Update UI
      app.updateLoginStatus();

      // Hide modal jika ada
      const modal = bootstrap.Modal.getInstance(
        document.getElementById("loginModal")
      );
      if (modal) {
        modal.hide();
      }

      app.showToast("Login berhasil! Sekarang bisa menyimpan data.", "success");
    } catch (error) {
      console.error("Login error:", error);
      app.showToast("Login gagal: " + error.message, "error");
    }
  },

  checkExistingLogin() {
    const savedToken = localStorage.getItem("googleAccessToken");
    if (savedToken) {
      this.accessToken = savedToken;
      spreadsheet.setAccessToken(this.accessToken);
      app.updateLoginStatus();
      // console.log("Existing login found and restored");
    }
  },

  async showLoginModal() {
    try {
      // Initialize Google Auth jika belum
      if (!this.tokenClient) {
        await this.initializeGoogleAuth();
      }

      const modal = new bootstrap.Modal(document.getElementById("loginModal"));
      modal.show();
    } catch (error) {
      console.error("Failed to show login modal:", error);
      app.showToast("Gagal memuat sistem login: " + error.message, "error");
    }
  },

  async login() {
    try {
      // console.log("Login initiated");

      // Initialize Google Auth jika belum
      if (!this.tokenClient) {
        await this.initializeGoogleAuth();
      }

      // Request token
      this.tokenClient.requestAccessToken();
    } catch (error) {
      console.error("Login failed:", error);
      app.showToast("Login gagal: " + error.message, "error");
    }
  },

  logout() {
    // console.log("Logout initiated");

    // Revoke token jika ada
    if (this.accessToken) {
      google.accounts.oauth2.revoke(this.accessToken, () => {
        // console.log("Token revoked");
      });
    }

    // Clear local data
    this.accessToken = null;
    this.tokenClient = null;
    localStorage.removeItem("googleAccessToken");
    spreadsheet.setAccessToken(null);

    // Update UI
    app.updateLoginStatus();
    app.showToast("Logout berhasil. Mode baca-saja.", "info");
  },
};

// Global functions
function logout() {
  auth.logout();
}

// Initialize auth when DOM is ready
document.addEventListener("DOMContentLoaded", function () {
  // Tunggu sedikit untuk memastikan GSI loaded
  setTimeout(() => {
    auth.init();
  }, 1000);
});
