// Notifications Management - DIRECT FONNTE VERSION
const notifications = {
  templates: {},
  settings: {},
  isSending: false,
  fonnteApiUrl: "https://api.fonnte.com",

  init() {
    this.loadTemplates();
    this.loadSettings();
    this.setupEventListeners();
    console.log("Notifications system initialized - Direct Fonnte API");
  },

  setupEventListeners() {
    // Auto-save templates
    document.getElementById("templateGentle")?.addEventListener("input", () => {
      this.updatePreviews();
      this.autoSaveTemplates();
    });
    document.getElementById("templateUrgent")?.addEventListener("input", () => {
      this.updatePreviews();
      this.autoSaveTemplates();
    });
    document.getElementById("templateFinal")?.addEventListener("input", () => {
      this.updatePreviews();
      this.autoSaveTemplates();
    });

    // Test connection button
    document.getElementById("testConnection")?.addEventListener("click", () => {
      this.testConnection();
    });

    // Auto-reminder toggle
    document.getElementById("autoReminder")?.addEventListener("change", (e) => {
      this.toggleAutoReminder(e.target.value === "enabled");
    });

    // Save settings button
    document
      .getElementById("saveNotificationSettings")
      ?.addEventListener("click", () => {
        this.saveSettings();
      });
  },

  loadTemplates() {
    const saved = localStorage.getItem("notificationTemplates");
    this.templates = saved ? JSON.parse(saved) : { ...defaultTemplates };

    document.getElementById("templateGentle").value = this.templates.gentle;
    document.getElementById("templateUrgent").value = this.templates.urgent;
    document.getElementById("templateFinal").value = this.templates.final;

    this.updatePreviews();
  },

  loadSettings() {
    const saved = localStorage.getItem("notificationSettings");
    this.settings = saved
      ? JSON.parse(saved)
      : {
          autoReminder: "disabled",
          scheduleTime: "09:00",
          fonnteToken: "DP85E5FN9HnDogvNAe78",
        };

    document.getElementById("autoReminder").value = this.settings.autoReminder;
    document.getElementById("scheduleTime").value = this.settings.scheduleTime;
    document.getElementById("fonnteToken").value =
      this.settings.fonnteToken || "";
  },

  autoSaveTemplates() {
    clearTimeout(this.autoSaveTimeout);
    this.autoSaveTimeout = setTimeout(() => {
      this.saveTemplates();
    }, 1000);
  },

  saveTemplates() {
    this.templates = {
      gentle: document.getElementById("templateGentle").value,
      urgent: document.getElementById("templateUrgent").value,
      final: document.getElementById("templateFinal").value,
    };

    localStorage.setItem(
      "notificationTemplates",
      JSON.stringify(this.templates)
    );
    console.log("Templates saved successfully");
  },

  saveSettings() {
    this.settings = {
      autoReminder: document.getElementById("autoReminder").value,
      scheduleTime: document.getElementById("scheduleTime").value,
      fonnteToken: document.getElementById("fonnteToken").value.trim(),
    };

    localStorage.setItem("notificationSettings", JSON.stringify(this.settings));
    app.showToast("Pengaturan notifikasi berhasil disimpan!", "success");
    console.log("Settings saved:", this.settings);
  },

  updatePreviews() {
    const sampleCustomer = {
      name: "Budi Santoso",
      package: "20Mbps",
      price: "250.000",
      due_date: "15 Des 2024",
      days_late: "5",
    };

    document.getElementById("previewGentle").textContent = this.generateMessage(
      sampleCustomer,
      "gentle"
    );
    document.getElementById("previewUrgent").textContent = this.generateMessage(
      sampleCustomer,
      "urgent"
    );
    document.getElementById("previewFinal").textContent = this.generateMessage(
      sampleCustomer,
      "final"
    );
  },

  generateMessage(customer, type) {
    let template = this.templates[type];

    template = template.replace(/{name}/g, customer.name);
    template = template.replace(/{package}/g, customer.package);
    template = template.replace(/{price}/g, customer.price);
    template = template.replace(/{due_date}/g, customer.due_date);
    template = template.replace(/{days_late}/g, customer.days_late);

    return template;
  },

  // TEST CONNECTION LANGSUNG KE FONNTE
  async testConnection() {
    const token = document.getElementById("fonnteToken").value.trim();

    if (!token) {
      app.showToast("Masukkan token Fonnte terlebih dahulu", "warning");
      return;
    }

    try {
      app.showToast("Menguji koneksi ke Fonnte API...", "info");

      // Test dengan endpoint device info
      const response = await fetch(`${this.fonnteApiUrl}/device`, {
        method: "GET",
        headers: {
          Authorization: token,
        },
      });

      if (response.ok) {
        const result = await response.json();
        app.showToast("✅ Koneksi Fonnte BERHASIL!", "success");
        this.logNotification(
          "TEST",
          "Test connection direct",
          "success",
          result
        );

        // Simpan token yang berhasil
        this.settings.fonnteToken = token;
        this.saveSettings();
      } else {
        const errorResult = await response.json();
        app.showToast(
          `❌ Koneksi GAGAL: ${errorResult.message || "Unknown error"}`,
          "error"
        );
        this.logNotification(
          "TEST",
          "Test connection direct",
          "failed",
          errorResult
        );
      }
    } catch (error) {
      console.error("Connection test error:", error);
      app.showToast(`❌ Error: ${error.message}`, "error");
      this.logNotification(
        "TEST",
        "Test connection direct",
        "error",
        error.toString()
      );
    }
  },

  // KIRIM PESAN SINGLE LANGSUNG
  async sendSingleReminder(customerIndex, type) {
    if (this.isSending) {
      app.showToast(
        "Sedang mengirim notifikasi, tunggu sebentar...",
        "warning"
      );
      return;
    }

    const customer = customers.currentCustomers[customerIndex];
    if (!customer) {
      app.showToast("Data konsumen tidak ditemukan", "error");
      return;
    }

    const token = document.getElementById("fonnteToken").value.trim();
    if (!token) {
      app.showToast("Token Fonnte belum diatur", "warning");
      return;
    }

    this.isSending = true;

    try {
      const message = this.generateMessage(
        {
          name: customer.name || customer.nama,
          package: customer.package || customer.paket,
          price: this.formatCurrencyForMessage(
            customer.price || customer.harga
          ),
          due_date: this.formatDate(customer.endDate || customer.berakhir),
          days_late: this.calculateDaysLate(
            customer.endDate || customer.berakhir
          ),
        },
        type
      );

      const phone = this.formatPhoneNumber(customer.phone || customer.nohp);

      if (!this.isValidPhoneNumber(phone)) {
        app.showToast(`Nomor HP tidak valid: ${phone}`, "error");
        return;
      }

      app.showToast(
        `Mengirim notifikasi ke ${customer.name || customer.nama}...`,
        "info"
      );

      // KIRIM LANGSUNG KE FONNTE API
      const response = await fetch(`${this.fonnteApiUrl}/send`, {
        method: "POST",
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          target: phone,
          message: message,
          delay: "2", // Delay 2 detik
        }),
      });

      const result = await response.json();

      if (
        result.status === "sent" ||
        result.status === true ||
        result.messageId
      ) {
        app.showToast(
          `✅ Notifikasi terkirim ke ${customer.name || customer.nama}`,
          "success"
        );
        this.logNotification(phone, message, "success", result);
      } else {
        app.showToast(
          `❌ Gagal mengirim ke ${customer.name || customer.nama}: ${
            result.message || result.error
          }`,
          "error"
        );
        this.logNotification(phone, message, "failed", result);
      }
    } catch (error) {
      console.error("Send message error:", error);
      app.showToast(`❌ Error mengirim notifikasi: ${error.message}`, "error");
      this.logNotification(
        "UNKNOWN",
        "Error sending",
        "error",
        error.toString()
      );
    } finally {
      this.isSending = false;
    }
  },

  // KIRIM BULK LANGSUNG
  async sendBulkReminder(type) {
    if (this.isSending) {
      app.showToast(
        "Sedang mengirim notifikasi, tunggu sebentar...",
        "warning"
      );
      return;
    }

    const selectedCustomers = customers.getSelectedCustomers();
    if (selectedCustomers.length === 0) {
      app.showToast("Pilih minimal 1 konsumen!", "warning");
      return;
    }

    const token = document.getElementById("fonnteToken").value.trim();
    if (!token) {
      app.showToast("Token Fonnte belum diatur!", "error");
      return;
    }

    this.isSending = true;
    let successCount = 0;
    let failCount = 0;

    try {
      app.showToast(
        `Mengirim ${selectedCustomers.length} notifikasi langsung ke Fonnte...`,
        "info"
      );

      for (const customer of selectedCustomers) {
        try {
          const message = this.generateMessage(
            {
              name: customer.name || customer.nama,
              package: customer.package || customer.paket,
              price: this.formatCurrencyForMessage(
                customer.price || customer.harga
              ),
              due_date: this.formatDate(customer.endDate || customer.berakhir),
              days_late: this.calculateDaysLate(
                customer.endDate || customer.berakhir
              ),
            },
            type
          );

          const phone = this.formatPhoneNumber(customer.phone || customer.nohp);

          if (!this.isValidPhoneNumber(phone)) {
            console.warn(`Nomor tidak valid: ${phone}`);
            failCount++;
            continue;
          }

          const response = await fetch(`${this.fonnteApiUrl}/send`, {
            method: "POST",
            headers: {
              Authorization: token,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              target: phone,
              message: message,
              delay: "2",
            }),
          });

          const result = await response.json();

          if (
            result.status === "sent" ||
            result.status === true ||
            result.messageId
          ) {
            successCount++;
            this.logNotification(phone, message, "success", result);
          } else {
            failCount++;
            this.logNotification(phone, message, "failed", result);
          }

          // Delay antara pengiriman (2 detik)
          await new Promise((resolve) => setTimeout(resolve, 2000));
        } catch (error) {
          failCount++;
          console.error(
            `Error sending to ${customer.name || customer.nama}:`,
            error
          );
          this.logNotification(
            customer.phone || customer.nohp,
            "Error sending",
            "error",
            error.toString()
          );
        }
      }

      const message = `Notifikasi terkirim: ${successCount} sukses, ${failCount} gagal`;
      if (failCount === 0) {
        app.showToast(`✅ ${message}`, "success");
      } else if (successCount === 0) {
        app.showToast(`❌ ${message}`, "error");
      } else {
        app.showToast(`⚠️ ${message}`, "warning");
      }
    } catch (error) {
      console.error("Bulk send error:", error);
      app.showToast(
        "❌ Error mengirim notifikasi bulk: " + error.message,
        "error"
      );
    } finally {
      this.isSending = false;
    }
  },

  // HELPER METHODS (sama seperti sebelumnya)
  formatCurrencyForMessage(amount) {
    const num = parseInt(amount) || 0;
    return new Intl.NumberFormat("id-ID").format(num);
  },

  formatPhoneNumber(phone) {
    if (!phone) return "";
    let cleaned = phone.replace(/\D/g, "");
    if (cleaned.startsWith("0")) {
      cleaned = "62" + cleaned.substring(1);
    }
    if (cleaned.startsWith("8")) {
      cleaned = "62" + cleaned;
    }
    return cleaned;
  },

  isValidPhoneNumber(phone) {
    if (!phone) return false;
    const phoneRegex = /^62[0-9]{9,13}$/;
    return phoneRegex.test(phone);
  },

  calculateDaysLate(endDate) {
    try {
      const dueDate = new Date(endDate);
      const today = new Date();
      const daysLate = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
      return Math.max(0, daysLate);
    } catch (error) {
      return "0";
    }
  },

  formatDate(dateString) {
    try {
      return new Date(dateString).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    } catch (error) {
      return dateString;
    }
  },

  logNotification(phone, message, status, response) {
    const logContainer = document.getElementById("notificationLog");
    const timestamp = new Date().toLocaleString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    const statusClass =
      {
        success: "text-success",
        failed: "text-danger",
        error: "text-warning",
      }[status] || "text-secondary";

    const logEntry = document.createElement("div");
    logEntry.className = "message-bubble";
    logEntry.innerHTML = `
      <div class="d-flex justify-content-between align-items-start">
        <div class="flex-grow-1">
          <strong class="${statusClass}">${timestamp} - ${status.toUpperCase()}</strong>
          <br>
          <strong>To:</strong> ${phone}
          <br>
          <strong>Pesan:</strong> ${message}
        </div>
        <button class="btn btn-sm btn-outline-secondary ms-2" onclick="this.parentElement.parentElement.remove()">
          <i class="bi bi-x"></i>
        </button>
      </div>
      ${
        response
          ? `<div class="mt-2"><small><strong>Response:</strong> ${JSON.stringify(
              response
            )}</small></div>`
          : ""
      }
    `;

    if (logContainer) {
      logContainer.prepend(logEntry);
      logContainer.scrollTop = 0;
      this.saveLogToStorage();
    }
  },

  saveLogToStorage() {
    const logContainer = document.getElementById("notificationLog");
    if (logContainer) {
      const logHTML = logContainer.innerHTML;
      localStorage.setItem("notificationLog", logHTML);
    }
  },

  loadLogFromStorage() {
    const logContainer = document.getElementById("notificationLog");
    const savedLog = localStorage.getItem("notificationLog");
    if (logContainer && savedLog) {
      logContainer.innerHTML = savedLog;
    }
  },

  clearLog() {
    if (confirm("Apakah Anda yakin ingin membersihkan log notifikasi?")) {
      document.getElementById("notificationLog").innerHTML = "";
      localStorage.removeItem("notificationLog");
      app.showToast("Log notifikasi dibersihkan", "info");
    }
  },

  toggleAutoReminder(enabled) {
    if (enabled) {
      this.startAutoReminder();
      app.showToast("Auto reminder diaktifkan", "success");
    } else {
      this.stopAutoReminder();
      app.showToast("Auto reminder dimatikan", "info");
    }
  },

  startAutoReminder() {
    console.log("Auto reminder started");
  },

  stopAutoReminder() {
    console.log("Auto reminder stopped");
  },
};

// Default templates
const defaultTemplates = {
  gentle:
    "Halo {name} 👋, ini reminder bahwa tagihan WiFi paket {package} akan jatuh tempo pada {due_date}. Total: Rp {price}. Terima kasih! 😊",
  urgent:
    "Halo {name} ⚠️, tagihan WiFi paket {package} sudah JATUH TEMPO. Total: Rp {price}. Mohon segera melakukan pembayaran untuk menghindari gangguan layanan.",
  final:
    "Halo {name} 🔴, TAGIHAN TELAT {days_late} HARI. Layanan WiFi akan DIPUTUS dalam 24 jam jika tidak dibayar. Segera lunasi: Rp {price}. Hubungi kami jika ada kendala.",
};

// Initialize
document.addEventListener("DOMContentLoaded", function () {
  notifications.init();
  notifications.loadLogFromStorage();
});
