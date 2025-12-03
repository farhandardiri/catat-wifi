// Notifications Management - DIRECT FONNTE VERSION
const notifications = {
  templates: {},
  settings: {},
  isSending: false,
  fonnteApiUrl: "https://api.fonnte.com",
  lastNotification: null,

  init() {
    this.loadTemplates();
    this.loadSettings();
    this.setupEventListeners();
    this.loadLastNotificationFromStorage(); // ✅ Load last notification
    // console.log("Notifications system initialized - Direct Fonnte API");
  },

  setupEventListeners() {
    // Auto-save templates - PERBAIKI: gunakan 'change' event juga
    document.getElementById("templateGentle")?.addEventListener("input", () => {
      this.updatePreviews();
      this.autoSaveTemplates();
    });
    document
      .getElementById("templateGentle")
      ?.addEventListener("change", () => {
        this.saveTemplates(); // Langsung save ketika selesai edit
      });

    document.getElementById("templateUrgent")?.addEventListener("input", () => {
      this.updatePreviews();
      this.autoSaveTemplates();
    });
    document
      .getElementById("templateUrgent")
      ?.addEventListener("change", () => {
        this.saveTemplates();
      });

    document.getElementById("templateFinal")?.addEventListener("input", () => {
      this.updatePreviews();
      this.autoSaveTemplates();
    });
    document.getElementById("templateFinal")?.addEventListener("change", () => {
      this.saveTemplates();
    });

    // Tambahkan button manual save templates
    document.getElementById("saveTemplates")?.addEventListener("click", () => {
      this.saveTemplates();
      app.showToast("Template pesan berhasil disimpan!", "success");
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
    try {
      const saved = localStorage.getItem("notificationTemplates");
      // console.log("Loading templates from localStorage:", saved);

      this.templates = saved ? JSON.parse(saved) : { ...defaultTemplates };

      // Apply to form - PASTIKAN element ada sebelum set value
      const gentleEl = document.getElementById("templateGentle");
      const urgentEl = document.getElementById("templateUrgent");
      const finalEl = document.getElementById("templateFinal");

      if (gentleEl)
        gentleEl.value = this.templates.gentle || defaultTemplates.gentle;
      if (urgentEl)
        urgentEl.value = this.templates.urgent || defaultTemplates.urgent;
      if (finalEl)
        finalEl.value = this.templates.final || defaultTemplates.final;

      this.updatePreviews();
      // console.log("Templates loaded:", this.templates);
    } catch (error) {
      // console.error("Error loading templates:", error);
      this.templates = { ...defaultTemplates };
    }
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
    try {
      // PASTIKAN ambil value terbaru dari textarea
      const gentleEl = document.getElementById("templateGentle");
      const urgentEl = document.getElementById("templateUrgent");
      const finalEl = document.getElementById("templateFinal");

      if (!gentleEl || !urgentEl || !finalEl) {
        console.error("Template elements not found!");
        return;
      }

      this.templates = {
        gentle: gentleEl.value,
        urgent: urgentEl.value,
        final: finalEl.value,
      };

      localStorage.setItem(
        "notificationTemplates",
        JSON.stringify(this.templates)
      );
      // console.log("Templates saved successfully:", this.templates);

      // Update preview setelah save
      this.updatePreviews();
    } catch (error) {
      console.error("Error saving templates:", error);
    }
  },

  saveSettings() {
    this.settings = {
      autoReminder: document.getElementById("autoReminder").value,
      scheduleTime: document.getElementById("scheduleTime").value,
      fonnteToken: document.getElementById("fonnteToken").value.trim(),
    };

    localStorage.setItem("notificationSettings", JSON.stringify(this.settings));
    app.showToast("Pengaturan notifikasi berhasil disimpan!", "success");
    // console.log("Settings saved:", this.settings);
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
    // PASTIKAN menggunakan template terbaru dari property templates
    let template = this.templates[type];

    // Fallback ke default template jika tidak ada
    if (!template) {
      template = defaultTemplates[type];
      console.warn(`Template ${type} not found, using default`);
    }

    // console.log(`Generating message for ${type}:`, template);

    // Gunakan nullish coalescing untuk handle undefined values
    template = template.replace(/{name}/g, customer.name || "");
    template = template.replace(/{package}/g, customer.package || "");
    template = template.replace(/{price}/g, customer.price || "");
    template = template.replace(/{due_date}/g, customer.due_date || "");
    template = template.replace(/{days_late}/g, customer.days_late || "");

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
          due_date: this.formatDate(customer.Berakhir || customer.berakhir),
          days_late: this.calculateDaysLate(
            customer.Berakhir || customer.berakhir
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
          delay: "2",
        }),
      });

      const result = await response.json();
      // Tentukan status
      let status;
      let logMessage = message;
      let responseData = result;

      if (
        result.status === "sent" ||
        result.status === true ||
        result.messageId
      ) {
        status = "success";
        app.showToast(
          `✅ Notifikasi terkirim ke ${customer.name || customer.nama}`,
          "success"
        );
      } else {
        status = "failed";
        app.showToast(
          `❌ Gagal mengirim ke ${customer.name || customer.nama}: ${
            result.message || result.error
          }`,
          "error"
        );
      }

      // ✅ SIMPAN LOG KE GOOGLE SHEET
      await this.saveLogToGoogleSheet({
        nama: customer.name || customer.nama || "",
        phone: phone,
        message: logMessage,
        status: status,
        response: responseData,
        jenisNotif: type,
        customerName: customer.name || customer.nama,
      });

      // ✅ TAMPILKAN DI UI
      this.logNotification(phone, logMessage, status, responseData);

      // ✅ SIMPAN DATA TERAKHIR
      this.lastNotification = {
        customer: {
          name: customer.name || customer.nama,
          phone: phone,
          package: customer.package || customer.paket,
          days_late: this.calculateDaysLate(
            customer.Berakhir || customer.berakhir
          ),
        },
        message: logMessage,
        type: type,
        status: status,
        timestamp: new Date().toISOString(),
        response: result,
      };

      this.saveLastNotificationToStorage();
      this.showLastNotification();

      // // ✅ SIMPAN DATA TERAKHIR
      // this.lastNotification = {
      //   customer: {
      //     name: customer.name || customer.nama,
      //     phone: phone,
      //     package: customer.package || customer.paket,
      //     days_late: this.calculateDaysLate(
      //       customer.Berakhir || customer.berakhir
      //     ),
      //   },
      //   message: message,
      //   type: type,
      //   status:
      //     result.status === "sent" || result.status === true || result.messageId
      //       ? "success"
      //       : "failed",
      //   timestamp: new Date().toISOString(),
      //   response: result,
      // };

      // // ✅ TAMPILKAN DATA TERAKHIR DI UI
      // this.showLastNotification();

      // if (
      //   result.status === "sent" ||
      //   result.status === true ||
      //   result.messageId
      // ) {
      //   app.showToast(
      //     `✅ Notifikasi terkirim ke ${customer.name || customer.nama}`,
      //     "success"
      //   );
      //   this.logNotification(phone, message, "success", result);
      // } else {
      //   app.showToast(
      //     `❌ Gagal mengirim ke ${customer.name || customer.nama}: ${
      //       result.message || result.error
      //     }`,
      //     "error"
      //   );
      //   this.logNotification(phone, message, "failed", result);
      // }

      // this.saveLastNotificationToStorage(); // ✅ Simpan ke localStorage
      // this.showLastNotification(); // ✅ Tampilkan di UI
      // this.showLastNotificationToast(); // ✅ Tampilkan toast (optional)
    } catch (error) {
      console.error("Send message error:", error);
      app.showToast(`❌ Error mengirim notifikasi: ${error.message}`, "error");
      // ✅ SIMPAN LOG ERROR KE GOOGLE SHEET
      await this.saveLogToGoogleSheet({
        nama: customer?.nama || customer?.name || "UNKNOWN",
        phone: customer?.phone || "UNKNOWN",
        message: "Error sending notification: " + error.message,
        status: "error",
        response: error.toString(),
        jenisNotif: "WhatsApp",
        customerName: customer?.name || "Unknown",
      });

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

  // Fungsi untuk menyimpan log ke Google Sheet
  async saveLogToGoogleSheet(logData) {
    try {
      // Prepare data untuk Google Sheet
      const logsData = {
        nama: logData.name || logData.customerName || "UNKNOWN",
        tanggal: new Date().toISOString(),
        jenisNotif: logData.jenisNotif || "WhatsApp",
        message: logData.message,
        status: logData.status,
        response: logData.response,
        phone: logData.phone,
      };

      // Panggil fungsi dari spreadsheet.js
      if (typeof spreadsheet !== "undefined" && spreadsheet.saveLogsNotif) {
        const result = await spreadsheet.saveLogsNotif(logsData);
        console.log("Log berhasil disimpan ke Google Sheet:", result);
        return true;
      } else {
        console.warn(
          "Spreadsheet module tidak ditemukan, simpan ke localStorage"
        );
        // this.saveLogToLocalFallback(logsData);
        return false;
      }
    } catch (error) {
      console.error("Gagal menyimpan log ke Google Sheet:", error);

      // Fallback: simpan ke localStorage untuk dikirim ulang nanti
      // this.saveLogToLocalFallback({
      //   ...logData,
      //   error: error.message,
      //   retryCount: 0,
      // });

      return false;
    }
  },

  // // Fallback: simpan ke localStorage
  // saveLogToLocalFallback(logData) {
  //   try {
  //     const pendingLogs = JSON.parse(
  //       localStorage.getItem("pendingLogs") || "[]"
  //     );
  //     pendingLogs.push({
  //       ...logData,
  //       timestamp: new Date().toISOString(),
  //       savedLocally: true,
  //     });

  //     localStorage.setItem("pendingLogs", JSON.stringify(pendingLogs));

  //     // Tampilkan notifikasi
  //     this.showOfflineNotification();

  //     // Coba sync otomatis setelah 30 detik
  //     setTimeout(() => this.retryPendingLogs(), 30000);
  //   } catch (e) {
  //     console.error("Gagal menyimpan ke localStorage:", e);
  //   }
  // },

  // // Coba kirim ulang log yang pending
  // async retryPendingLogs() {
  //   try {
  //     const pendingLogs = JSON.parse(
  //       localStorage.getItem("pendingLogs") || "[]"
  //     );

  //     if (pendingLogs.length === 0) return;

  //     console.log(`Mencoba sync ${pendingLogs.length} log yang pending...`);

  //     const successfulLogs = [];
  //     const failedLogs = [];

  //     for (const log of pendingLogs) {
  //       try {
  //         // Hapus properti internal sebelum dikirim
  //         const { savedLocally, retryCount, ...cleanLog } = log;

  //         if (spreadsheet && spreadsheet.saveLogsNotif) {
  //           await spreadsheet.saveLogsNotif(cleanLog);
  //           successfulLogs.push(log);
  //         }
  //       } catch (error) {
  //         failedLogs.push(log);
  //       }
  //     }

  //     // Update localStorage
  //     localStorage.setItem("pendingLogs", JSON.stringify(failedLogs));

  //     if (successfulLogs.length > 0) {
  //       console.log(`Berhasil sync ${successfulLogs.length} log`);
  //       this.showSyncSuccessNotification(successfulLogs.length);
  //     }
  //   } catch (error) {
  //     console.error("Error retryPendingLogs:", error);
  //   }
  // },

  // // Tampilkan notifikasi offline
  // showOfflineNotification() {
  //   const notification = document.getElementById("offlineNotification");
  //   if (notification) {
  //     notification.style.display = "block";
  //     setTimeout(() => {
  //       notification.style.display = "none";
  //     }, 5000);
  //   }
  // },

  // showSyncSuccessNotification(count) {
  //   app.showToast(
  //     `Berhasil sinkronisasi ${count} log ke Google Sheet`,
  //     "success"
  //   );
  // },

  // ✅ METHOD BARU: Tampilkan data notifikasi terakhir
  showLastNotification() {
    if (!this.lastNotification) return;

    const container = document.getElementById("lastNotificationContainer");
    if (!container) return;

    const notif = this.lastNotification;
    const statusClass = notif.status === "success" ? "bg-success" : "bg-danger";
    const statusIcon =
      notif.status === "success" ? "bi-check-circle" : "bi-x-circle";

    container.innerHTML = `
      <div class="card border-0 shadow-sm">
        <div class="card-header ${statusClass} text-white">
          <div class="d-flex justify-content-between align-items-center">
            <h6 class="mb-0">
              <i class="bi ${statusIcon} me-2"></i>
              Notifikasi Terakhir
            </h6>
            <small>${new Date(notif.timestamp).toLocaleString("id-ID")}</small>
          </div>
        </div>
        <div class="card-body">
          <div class="row">
            <div class="col-md-6">
              <strong>Pelanggan:</strong> ${notif.customer.name}<br>
              <strong>No HP:</strong> ${notif.customer.phone}<br>
              <strong>Paket:</strong> ${notif.customer.package}
            </div>
            <div class="col-md-6">
              <strong>Jenis:</strong> <span class="badge ${this.getTypeBadgeClass(
                notif.type
              )}">${notif.type.toUpperCase()}</span><br>
              <strong>Status:</strong> <span class="badge ${
                notif.status === "success" ? "bg-success" : "bg-danger"
              }">${notif.status === "success" ? "BERHASIL" : "GAGAL"}</span><br>
              <strong>Telat:</strong> <span class="badge bg-warning">${
                notif.customer.days_late
              } hari</span>
            </div>
          </div>
          <div class="mt-3">
            <strong>Pesan:</strong>
            <div class="alert alert-light mt-2">
              ${notif.message}
            </div>
          </div>
          ${
            notif.response
              ? `
          <div class="mt-2">
            <strong>Response API:</strong>
            <pre class="bg-dark text-light p-2 rounded small mt-2">${JSON.stringify(
              notif.response,
              null,
              2
            )}</pre>
          </div>
          `
              : ""
          }
        </div>
      </div>
    `;

    // Auto-scroll ke notifikasi terakhir
    container.scrollIntoView({ behavior: "smooth", block: "nearest" });
  },

  // ✅ METHOD BARU: Dapatkan class badge berdasarkan jenis notifikasi
  getTypeBadgeClass(type) {
    const classes = {
      gentle: "bg-primary",
      urgent: "bg-warning",
      final: "bg-danger",
    };
    return classes[type] || "bg-secondary";
  },

  // ✅ METHOD BARU: Dapatkan data notifikasi terakhir
  getLastNotification() {
    return this.lastNotification;
  },

  // ✅ METHOD BARU: Clear data notifikasi terakhir
  clearLastNotification() {
    this.lastNotification = null;
    const container = document.getElementById("lastNotificationContainer");
    if (container) {
      container.innerHTML = "";
    }
  },

  showLastNotificationToast() {
    if (!this.lastNotification) return;

    const notif = this.lastNotification;

    // Buat custom toast
    const toastHtml = `
    <div class="toast show" role="alert" style="position: fixed; top: 20px; right: 20px; z-index: 9999; min-width: 350px;">
      <div class="toast-header ${
        notif.status === "success"
          ? "bg-success text-white"
          : "bg-danger text-white"
      }">
        <i class="bi ${
          notif.status === "success" ? "bi-check-circle" : "bi-x-circle"
        } me-2"></i>
        <strong class="me-auto">Notifikasi Terkirim</strong>
        <small>${new Date(notif.timestamp).toLocaleTimeString("id-ID")}</small>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
      </div>
      <div class="toast-body">
        <strong>${notif.customer.name}</strong><br>
        <small>${notif.customer.phone} • ${notif.type.toUpperCase()}</small>
        <div class="mt-2 small bg-light p-2 rounded">
          ${notif.message.substring(0, 100)}...
        </div>
      </div>
    </div>
  `;

    // Tambahkan ke body
    const toastContainer =
      document.getElementById("notificationToasts") || document.body;
    const toastElement = document.createElement("div");
    toastElement.innerHTML = toastHtml;
    toastContainer.appendChild(toastElement);

    // Auto remove setelah 5 detik
    setTimeout(() => {
      toastElement.remove();
    }, 5000);
  },

  // ✅ METHOD BARU: Simpan last notification ke localStorage
  saveLastNotificationToStorage() {
    if (this.lastNotification) {
      localStorage.setItem(
        "lastNotification",
        JSON.stringify(this.lastNotification)
      );
    }
  },

  // ✅ METHOD BARU: Load last notification dari localStorage
  loadLastNotificationFromStorage() {
    try {
      const saved = localStorage.getItem("lastNotification");
      if (saved) {
        this.lastNotification = JSON.parse(saved);
        this.showLastNotification();
      }
    } catch (error) {
      console.error("Error loading last notification:", error);
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
              due_date: this.formatDate(customer.Berakhir || customer.berakhir),
              days_late: this.calculateDaysLate(
                customer.Berakhir || customer.berakhir
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

  calculateDaysLate(Berakhir) {
    try {
      const dueDate = new Date(Berakhir);
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
    // console.log("Auto reminder started");
  },

  stopAutoReminder() {
    // console.log("Auto reminder stopped");
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
