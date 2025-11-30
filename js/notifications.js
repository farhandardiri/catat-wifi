// Notifications Management
const notifications = {
  templates: {},

  init() {
    this.loadTemplates();
  },

  loadTemplates() {
    const saved = localStorage.getItem("notificationTemplates");
    this.templates = saved ? JSON.parse(saved) : { ...defaultTemplates };

    // Apply to form
    document.getElementById("templateGentle").value = this.templates.gentle;
    document.getElementById("templateUrgent").value = this.templates.urgent;
    document.getElementById("templateFinal").value = this.templates.final;

    this.updatePreviews();
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
    app.showToast("Template pesan berhasil disimpan!", "success");
    this.updatePreviews();
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

  logNotification(phone, message, status, response) {
    const logContainer = document.getElementById("notificationLog");
    const timestamp = new Date().toLocaleString();

    const logEntry = document.createElement("div");
    logEntry.className = "message-bubble";
    logEntry.innerHTML = `
            <strong>${timestamp} - ${status.toUpperCase()}</strong><br>
            <strong>To:</strong> ${phone}<br>
            <strong>Pesan:</strong> ${message}<br>
            ${
              response
                ? `<strong>Response:</strong> ${JSON.stringify(response)}`
                : ""
            }
        `;

    logContainer.prepend(logEntry);
  },

  clearLog() {
    if (confirm("Apakah Anda yakin ingin membersihkan log notifikasi?")) {
      document.getElementById("notificationLog").innerHTML = "";
      app.showToast("Log notifikasi dibersihkan", "info");
    }
  },

  saveSettings() {
    const settings = {
      autoReminder: document.getElementById("autoReminder").value,
      scheduleTime: document.getElementById("scheduleTime").value,
    };

    localStorage.setItem("notificationSettings", JSON.stringify(settings));
    app.showToast("Pengaturan notifikasi berhasil disimpan!", "success");
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

// Event listeners untuk real-time preview
document.addEventListener("DOMContentLoaded", function () {
  document
    .getElementById("templateGentle")
    .addEventListener("input", () => notifications.updatePreviews());
  document
    .getElementById("templateUrgent")
    .addEventListener("input", () => notifications.updatePreviews());
  document
    .getElementById("templateFinal")
    .addEventListener("input", () => notifications.updatePreviews());
});
