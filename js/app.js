// Main Application Controller - NO LOGIN REQUIRED FOR READ
const app = {
  init() {
    console.log("App initialization started - Read operations only");
    this.setupEventListeners();
    this.updateDashboard(); // Langsung load data tanpa login
  },

  setupEventListeners() {
    console.log("Setting up event listeners");

    // Transaction form - butuh login untuk submit
    const transactionForm = document.getElementById("transactionForm");
    if (transactionForm) {
      transactionForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.saveTransaction();
      });
    }

    // Tab change event
    document.querySelectorAll("#mainTabs button").forEach((tab) => {
      tab.addEventListener("shown.bs.tab", (event) => {
        const target = event.target.getAttribute("data-bs-target");
        this.onTabChange(target);
      });
    });

    // Set default date
    this.resetTransactionForm();

    // Update login UI status
    this.updateLoginStatus();
  },

  updateLoginStatus() {
    const loginStatus = document.getElementById("loginStatus");
    const logoutBtn = document.getElementById("logoutBtn");
    const loginBtn = document.querySelector(
      '[onclick="auth.showLoginModal()"]'
    );

    if (spreadsheet.accessToken) {
      // Sudah login - bisa write
      if (loginStatus) {
        loginStatus.textContent = "Logged In";
        loginStatus.className = "badge bg-success me-2";
      }
      if (logoutBtn) logoutBtn.style.display = "block";
      if (loginBtn) loginBtn.style.display = "none";
    } else {
      // Belum login - read only
      if (loginStatus) {
        loginStatus.textContent = "Read Only";
        loginStatus.className = "badge bg-warning me-2";
      }
      if (logoutBtn) logoutBtn.style.display = "none";
      if (loginBtn) loginBtn.style.display = "block";
    }
  },

  onTabChange(tabId) {
    console.log("Tab changed to:", tabId);
    switch (tabId) {
      case "#customers":
        customers.loadCustomers();
        break;
      case "#latepayments":
        customers.loadLatePayments();
        break;
      case "#reports":
        reports.loadReports();
        break;
    }
  },

  async saveTransaction() {
    // Cek login status untuk write operation
    if (!spreadsheet.accessToken) {
      this.showToast(
        "Login required untuk menyimpan data. Silakan login dengan Google.",
        "warning"
      );
      this.showLoginModal();
      return;
    }

    const formData = {
      tanggal: document.getElementById("tanggal").value,
      jenis: document.getElementById("jenis").value,
      kategori: document.getElementById("kategori").value,
      deskripsi: document.getElementById("deskripsi").value,
      jumlah: document.getElementById("jumlah").value,
    };

    try {
      await spreadsheet.saveTransaction(formData);
      this.showToast("Transaksi berhasil disimpan!", "success");
      this.resetTransactionForm();
      this.updateDashboard(); // Refresh data setelah save
    } catch (error) {
      this.showToast("Error menyimpan transaksi: " + error.message, "error");
    }
  },

  showLoginModal() {
    // Show login modal untuk write operations
    if (typeof auth !== "undefined" && auth.showLoginModal) {
      auth.showLoginModal();
    } else {
      this.showToast("Sistem login belum siap. Refresh halaman.", "error");
    }
  },

  resetTransactionForm() {
    const form = document.getElementById("transactionForm");
    if (form) {
      form.reset();
      const today = new Date().toISOString().split("T")[0];
      const dateInput = document.getElementById("tanggal");
      if (dateInput) {
        dateInput.value = today;
      }
    }
  },

  async updateDashboard() {
    console.log("Updating dashboard (READ operation - no login required)...");

    try {
      const [transactions, customers] = await Promise.all([
        spreadsheet.getTransactions(),
        spreadsheet.getCustomers(),
      ]);

      console.log(
        "Data received - Transactions:",
        transactions.length,
        "Customers:",
        customers.length
      );

      this.updateSummaryCards(transactions, customers);
      this.updateRecentTransactions(transactions);
    } catch (error) {
      console.error("Error updating dashboard:", error);
      this.showSampleData();
    }
  },

  // ... (sisanya sama: updateSummaryCards, updateRecentTransactions, formatCurrency, dll)
  updateSummaryCards(transactions, customers) {
    try {
      const wifiIncome = transactions
        .filter((t) => t.kategori === "WIFI" && t.jenis === "Pemasukan")
        .reduce((sum, t) => sum + parseInt(t.jumlah || 0), 0);

      const otherIncome = transactions
        .filter((t) => t.kategori === "BRG" && t.jenis === "Pemasukan")
        .reduce((sum, t) => sum + parseInt(t.jumlah || 0), 0);

      const totalExpenses = transactions
        .filter((t) => t.jenis === "Pengeluaran")
        .reduce((sum, t) => sum + parseInt(t.jumlah || 0), 0);

      const totalIncome = wifiIncome + otherIncome;
      const netBalance = totalIncome - totalExpenses;

      this.updateElement("totalWifi", this.formatCurrency(wifiIncome));
      this.updateElement("totalBarang", this.formatCurrency(otherIncome));
      this.updateElement(
        "totalPengeluaran",
        this.formatCurrency(totalExpenses)
      );
      this.updateElement("saldoBersih", this.formatCurrency(netBalance));

      const lateCustomers = customers.filter((c) => {
        const endDate = new Date(c.berakhir || c.endDate);
        const today = new Date();
        return endDate < today && (c.status === "Active" || !c.status);
      });
      this.updateElement("lateBadge", lateCustomers.length);
    } catch (error) {
      console.error("Error updating summary cards:", error);
    }
  },

  updateElement(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = value;
    }
  },

  updateRecentTransactions(transactions) {
    const tbody = document.getElementById("recentTransactions");
    if (!tbody) return;

    const recent = transactions.slice(-5).reverse();

    if (recent.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Belum ada transaksi</td></tr>`;
      return;
    }

    tbody.innerHTML = recent
      .map(
        (transaction) => `
            <tr>
                <td>${transaction.tanggal || transaction.Tanggal || ""}</td>
                <td>${transaction.jenis || transaction.Jenis || ""}</td>
                <td>${transaction.kategori || transaction.Kategori || ""}</td>
                <td>${transaction.deskripsi || transaction.Deskripsi || ""}</td>
                <td class="text-end">${this.formatCurrency(
                  transaction.jumlah || transaction.Jumlah || 0
                )}</td>
            </tr>
        `
      )
      .join("");
  },

  formatCurrency(amount) {
    const num = parseInt(amount) || 0;
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(num);
  },

  showSampleData() {
    console.log("Showing sample data");
    const sampleData = spreadsheet.getSampleData();
    this.updateSummaryCards(sampleData.transactions, sampleData.customers);
    this.updateRecentTransactions(sampleData.transactions);
  },

  showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `position-fixed top-0 end-0 p-3`;
    toast.style.zIndex = "9999";
    toast.innerHTML = `
            <div class="toast show align-items-center text-bg-${type} border-0" role="alert">
                <div class="d-flex">
                    <div class="toast-body">${message}</div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>
        `;

    document.body.appendChild(toast);
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 4000);
  },

  loadReports() {
    this.updateDashboard();
  },

  exportData() {
    this.showToast("Fitur export akan segera tersedia", "info");
  },
};

// Initialize app - langsung tanpa tunggu login
document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM fully loaded - Starting app in READ-ONLY mode");
  app.init();
});
