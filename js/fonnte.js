// Fonnte API Integration
const fonnte = {
  API_URL: "https://api.fonnte.com/send",
  token: "73Jg14QDEFcUJcULnXuf",

  loadConfig() {
    this.token = localStorage.getItem("fonnteToken") || "";
    document.getElementById("fonnteToken").value = this.token;
  },

  saveConfig() {
    this.token = document.getElementById("fonnteToken").value;
    localStorage.setItem("fonnteToken", this.token);
    app.showToast("Konfigurasi Fonnte berhasil disimpan!", "success");
  },

  async testConnection() {
    if (!this.token) {
      app.showToast("Masukkan token Fonnte terlebih dahulu", "warning");
      return;
    }

    try {
      const response = await fetch("https://api.fonnte.com/device", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: this.token,
        },
        body: JSON.stringify({
          target: "6282334130897", // Test number
          message: "Test connection dari sistem WiFi Management",
          token: this.token,
        }),
      });

      const result = await response.json();
      if (result.status === true) {
        app.showToast("✅ Koneksi Fonnte BERHASIL!", "success");
      } else {
        app.showToast("❌ Koneksi Fonnte GAGAL: " + result.message, "error");
      }
    } catch (error) {
      app.showToast("❌ Error: " + error.toString(), "error");
    }
  },

  async sendMessage(phone, message) {
    if (!this.token) {
      throw new Error("Token Fonnte belum diatur");
    }

    const response = await fetch(this.API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        target: phone,
        message: message,
        token: this.token,
      }),
    });

    const result = await response.json();
    return result;
  },
};
