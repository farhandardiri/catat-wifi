// Customers Management - COMPLETE VERSION WITH EDIT & DELETE
const customers = {
  currentCustomers: [],
  selectedCustomers: new Set(),
  editingIndex: -1,
  editingCustomerId: null,

  showCustomerModal(customerData = null) {
    try {
      const modalElement = document.getElementById("customerModal");
      if (!modalElement) {
        throw new Error("Modal element not found");
      }

      const modal = new bootstrap.Modal(modalElement);

      // Set modal title based on mode
      const modalTitle = modalElement.querySelector(".modal-title");
      const saveButton = modalElement.querySelector(".btn-primary");

      if (customerData) {
        // Edit mode
        modalTitle.textContent = "Edit Konsumen";
        saveButton.innerHTML =
          '<i class="bi bi-check-circle"></i> Update Konsumen';
        this.populateEditForm(customerData);
      } else {
        // Add mode
        modalTitle.textContent = "Tambah Konsumen Baru";
        saveButton.innerHTML = '<i class="bi bi-save"></i> Simpan Konsumen';
        this.resetCustomerForm();
      }

      modal.show();
      this.setupPackagePriceListener();

      console.log(
        "Customer modal shown in",
        customerData ? "EDIT" : "ADD",
        "mode"
      );
    } catch (error) {
      console.error("Error showing customer modal:", error);
      app.showToast("Gagal membuka form konsumen", "error");
    }
  },

  populateEditForm(customerData) {
    this.editingIndex = customerData.index;
    this.editingCustomerId =
      customerData.id || `customer-${customerData.index}`;

    document.getElementById("customerName").value =
      customerData.name || customerData.nama || "";
    document.getElementById("customerPhone").value =
      customerData.phone || customerData.nohp || "";
    document.getElementById("customerPackage").value =
      customerData.package || customerData.paket || "";
    document.getElementById("customerPrice").value =
      customerData.price || customerData.harga || "";
    document.getElementById("startDate").value =
      customerData.startDate || customerData.mulai || "";
    document.getElementById("endDate").value =
      customerData.endDate || customerData.berakhir || "";
  },

  resetCustomerForm() {
    const form = document.getElementById("addCustomerForm");
    if (form) {
      form.reset();

      // Set default dates
      const today = new Date();
      const nextMonth = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        today.getDate()
      );

      document.getElementById("startDate").value = today
        .toISOString()
        .split("T")[0];
      document.getElementById("endDate").value = nextMonth
        .toISOString()
        .split("T")[0];
    }

    this.editingIndex = -1;
    this.editingCustomerId = null;
  },

  setupPackagePriceListener() {
    const packageSelect = document.getElementById("customerPackage");
    if (!packageSelect) return;

    // Remove existing listener to avoid duplicates
    const newPackageSelect = packageSelect.cloneNode(true);
    packageSelect.parentNode.replaceChild(newPackageSelect, packageSelect);

    newPackageSelect.addEventListener("change", function () {
      const prices = {
        "10Mbps": 150000,
        "20Mbps": 250000,
        "50Mbps": 400000,
      };
      const priceInput = document.getElementById("customerPrice");
      if (priceInput) {
        priceInput.value = prices[this.value] || "";
      }
    });
  },

  validateCustomerData(formData) {
    const errors = [];

    if (!formData.name || formData.name.trim().length < 2) {
      errors.push("Nama konsumen harus diisi (minimal 2 karakter)");
    }

    if (!formData.phone || !/^[0-9+-\s()]{10,}$/.test(formData.phone)) {
      errors.push("Nomor HP harus diisi dengan format yang valid");
    }

    if (!formData.package) {
      errors.push("Paket WiFi harus dipilih");
    }

    if (!formData.price || formData.price <= 0) {
      errors.push("Harga harus diisi dan lebih dari 0");
    }

    if (!formData.startDate) {
      errors.push("Tanggal mulai harus diisi");
    }

    if (!formData.endDate) {
      errors.push("Tanggal berakhir harus diisi");
    }

    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (end <= start) {
        errors.push("Tanggal berakhir harus setelah tanggal mulai");
      }
    }

    return errors;
  },

  async saveCustomer() {
    const formData = {
      name: document.getElementById("customerName")?.value.trim() || "",
      phone: document.getElementById("customerPhone")?.value.trim() || "",
      package: document.getElementById("customerPackage")?.value || "",
      price: document.getElementById("customerPrice")?.value || "",
      startDate: document.getElementById("startDate")?.value || "",
      endDate: document.getElementById("endDate")?.value || "",
    };

    // Validasi data
    const validationErrors = this.validateCustomerData(formData);
    if (validationErrors.length > 0) {
      app.showToast("Error validasi: " + validationErrors.join(", "), "error");
      return;
    }

    // Cek login untuk write operation
    if (!spreadsheet.accessToken) {
      app.showToast(
        "Login diperlukan untuk menyimpan data konsumen",
        "warning"
      );
      auth.showLoginModal();
      return;
    }

    try {
      // Show loading state
      const saveButton = document.querySelector("#customerModal .btn-primary");
      const originalText = saveButton?.innerHTML;
      if (saveButton) {
        saveButton.innerHTML =
          this.editingIndex !== -1
            ? '<i class="bi bi-hourglass-split"></i> Mengupdate...'
            : '<i class="bi bi-hourglass-split"></i> Menyimpan...';
        saveButton.disabled = true;
      }

      if (this.editingIndex !== -1) {
        // Update existing customer
        await this.updateCustomer(this.editingIndex, formData);
      } else {
        // Add new customer
        await spreadsheet.saveCustomer(formData);
      }

      // Hide modal
      const modal = bootstrap.Modal.getInstance(
        document.getElementById("customerModal")
      );
      if (modal) {
        modal.hide();
      }

      // Refresh data
      await this.loadCustomers();
    } catch (error) {
      console.error("Error saving customer:", error);
      app.showToast("Error menyimpan konsumen: " + error.message, "error");
    } finally {
      // Reset button state
      const saveButton = document.querySelector("#customerModal .btn-primary");
      if (saveButton) {
        saveButton.innerHTML =
          this.editingIndex !== -1
            ? '<i class="bi bi-check-circle"></i> Update Konsumen'
            : '<i class="bi bi-save"></i> Simpan Konsumen';
        saveButton.disabled = false;
      }
    }
  },
  async updateCustomer(index, updatedData) {
    try {
      const customer = this.currentCustomers[index];
      if (!customer) {
        throw new Error("Data konsumen tidak ditemukan");
      }

      // Panggil API update yang sebenarnya
      await spreadsheet.updateCustomer(index, updatedData);

      app.showToast("Konsumen berhasil diupdate!", "success");
      this.editingIndex = -1;
      this.editingCustomerId = null;
    } catch (error) {
      console.error("Error updating customer:", error);
      throw error;
    }
  },

  async deleteCustomerFromSheet(index) {
    try {
      const customer = this.currentCustomers[index];
      if (!customer) {
        throw new Error("Data konsumen tidak ditemukan");
      }

      // Panggil API delete yang sebenarnya
      await spreadsheet.deleteCustomer(index);
      return true;
    } catch (error) {
      console.error("Error deleting customer from sheet:", error);
      throw error;
    }
  },

  async loadCustomers() {
    try {
      console.log("Loading customers data...");
      this.currentCustomers = await spreadsheet.getCustomers();
      console.log("Customers loaded:", this.currentCustomers.length);
      this.renderCustomersTable();
      this.updateLatePaymentsTable(); // Auto update late payments juga
    } catch (error) {
      console.error("Error loading customers:", error);
      app.showToast("Gagal memuat data konsumen", "error");
    }
  },

  async loadLatePayments() {
    try {
      console.log("Loading late payments data...");
      // Jika customers belum diload, load dulu
      if (this.currentCustomers.length === 0) {
        await this.loadCustomers();
      } else {
        // Jika sudah ada data, cukup update table late payments
        this.updateLatePaymentsTable();
      }
    } catch (error) {
      console.error("Error loading late payments:", error);
      app.showToast("Gagal memuat data keterlambatan", "error");
    }
  },

  renderCustomersTable() {
    const tbody = document.getElementById("customersTableBody");
    if (!tbody) {
      console.error("Customers table body not found");
      return;
    }

    if (this.currentCustomers.length === 0) {
      tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-muted py-4">
                        <i class="bi bi-people display-4 d-block mb-2"></i>
                        Belum ada data konsumen
                        <br>
                        <small class="text-muted">Klik "Tambah Konsumen" untuk menambah data</small>
                    </td>
                </tr>`;
      return;
    }

    tbody.innerHTML = this.currentCustomers
      .map(
        (customer, index) => `
            <tr>
                <td>
                    <div class="fw-semibold">${this.escapeHtml(
                      customer.name || customer.nama || "N/A"
                    )}</div>
                    ${
                      customer.phone
                        ? `<small class="text-muted">${this.escapeHtml(
                            customer.phone
                          )}</small>`
                        : ""
                    }
                </td>
                <td>${this.formatPhoneNumber(
                  customer.phone || customer.nohp
                )}</td>
                <td>
                    <span class="badge bg-info">${this.escapeHtml(
                      customer.package || customer.paket || "N/A"
                    )}</span>
                </td>
                <td class="fw-bold">${app.formatCurrency(
                  customer.price || customer.harga || 0
                )}</td>
                <td>
                    <div>${this.formatDate(
                      customer.startDate || customer.mulai
                    )}</div>
                    <small class="text-muted">${this.getDaysFromDate(
                      customer.startDate || customer.mulai
                    )}</small>
                </td>
                <td>
                    <div class="${
                      this.isDatePassed(customer.endDate || customer.berakhir)
                        ? "text-danger fw-bold"
                        : ""
                    }">
                        ${this.formatDate(
                          customer.endDate || customer.berakhir
                        )}
                    </div>
                    <small class="text-muted">${this.getDaysUntilDate(
                      customer.endDate || customer.berakhir
                    )}</small>
                </td>
                <td>${this.renderStatusBadge(customer)}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="customers.editCustomer(${index})" title="Edit">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="customers.deleteCustomer(${index})" title="Hapus">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `
      )
      .join("");
  },

  editCustomer(index) {
    if (!spreadsheet.accessToken) {
      app.showToast("Login diperlukan untuk mengedit data", "warning");
      auth.showLoginModal();
      return;
    }

    const customer = this.currentCustomers[index];
    if (!customer) {
      app.showToast("Data konsumen tidak ditemukan", "error");
      return;
    }

    // Add index to customer data for reference
    const customerData = {
      ...customer,
      index: index,
    };

    this.showCustomerModal(customerData);
  },

  async deleteCustomer(index) {
    if (!spreadsheet.accessToken) {
      app.showToast("Login diperlukan untuk menghapus data", "warning");
      auth.showLoginModal();
      return;
    }

    const customer = this.currentCustomers[index];
    if (!customer) {
      app.showToast("Data konsumen tidak ditemukan", "error");
      return;
    }

    const customerName = customer.name || customer.nama || "Konsumen ini";

    // Confirmation dialog with customer details
    const confirmationMessage = `
Yakin ingin menghapus konsumen ini?
            
• Nama: ${customerName}
• Paket: ${customer.package || customer.paket}
• Telepon: ${customer.phone || customer.nohp}
            
Data yang dihapus tidak dapat dikembalikan.
        `.trim();

    if (!confirm(confirmationMessage)) {
      return;
    }

    try {
      // Show loading
      app.showToast("Menghapus konsumen...", "info");

      // Delete from Google Sheets (simulated for now)
      await this.deleteCustomerFromSheet(index);

      // Remove from local array
      this.currentCustomers.splice(index, 1);

      // Update UI
      this.renderCustomersTable();
      this.updateLatePaymentsTable();

      app.showToast(`Konsumen ${customerName} berhasil dihapus`, "success");
    } catch (error) {
      console.error("Error deleting customer:", error);
      app.showToast("Error menghapus konsumen: " + error.message, "error");
    }
  },

  // Bulk operations
  async deleteSelectedCustomers() {
    const selectedCustomers = this.getSelectedCustomers();
    if (selectedCustomers.length === 0) {
      app.showToast("Tidak ada konsumen yang dipilih", "warning");
      return;
    }

    const confirmationMessage = `
Yakin ingin menghapus ${selectedCustomers.length} konsumen?
            
Konsumen yang akan dihapus:
${selectedCustomers.map((c) => `• ${c.name || c.nama}`).join("\n")}
            
Data yang dihapus tidak dapat dikembalikan.
        `.trim();

    if (!confirm(confirmationMessage)) {
      return;
    }

    try {
      app.showToast(
        `Menghapus ${selectedCustomers.length} konsumen...`,
        "info"
      );

      // Delete in reverse order to maintain correct indices
      const indices = Array.from(this.selectedCustomers).sort((a, b) => b - a);

      for (const index of indices) {
        await this.deleteCustomerFromSheet(index);
        this.currentCustomers.splice(index, 1);
      }

      // Clear selection
      this.selectedCustomers.clear();
      this.updateSelectionUI();

      // Update UI
      this.renderCustomersTable();
      this.updateLatePaymentsTable();

      app.showToast(
        `${selectedCustomers.length} konsumen berhasil dihapus`,
        "success"
      );
    } catch (error) {
      console.error("Error deleting selected customers:", error);
      app.showToast("Error menghapus konsumen: " + error.message, "error");
    }
  },

  async extendSelectedCustomers(days = 30) {
    const selectedCustomers = this.getSelectedCustomers();
    if (selectedCustomers.length === 0) {
      app.showToast("Tidak ada konsumen yang dipilih", "warning");
      return;
    }

    try {
      app.showToast(
        `Memperpanjang ${selectedCustomers.length} konsumen...`,
        "info"
      );

      for (const index of this.selectedCustomers) {
        const customer = this.currentCustomers[index];
        if (customer) {
          const currentEndDate = new Date(
            customer.endDate || customer.berakhir
          );
          currentEndDate.setDate(currentEndDate.getDate() + days);

          const updatedData = {
            name: customer.name || customer.nama,
            phone: customer.phone || customer.nohp,
            package: customer.package || customer.paket,
            price: customer.price || customer.harga,
            startDate: customer.startDate || customer.mulai,
            endDate: currentEndDate.toISOString().split("T")[0],
          };

          await this.updateCustomer(index, updatedData);
        }
      }

      // Clear selection
      this.selectedCustomers.clear();
      this.updateSelectionUI();

      // Update UI
      this.renderCustomersTable();
      this.updateLatePaymentsTable();

      app.showToast(
        `${selectedCustomers.length} konsumen diperpanjang ${days} hari`,
        "success"
      );
    } catch (error) {
      console.error("Error extending customers:", error);
      app.showToast("Error memperpanjang konsumen: " + error.message, "error");
    }
  },

  // Helper methods (tetap sama seperti sebelumnya)
  renderStatusBadge(customer) {
    const status = customer.status || "Active";
    const endDate = customer.endDate || customer.berakhir;

    if (this.isDatePassed(endDate)) {
      return '<span class="badge bg-danger">Expired</span>';
    } else if (this.isDateNearExpiry(endDate)) {
      return '<span class="badge bg-warning">Akan Expired</span>';
    } else {
      return '<span class="badge bg-success">Active</span>';
    }
  },

  isDatePassed(dateString) {
    if (!dateString) return false;
    const date = new Date(dateString);
    const today = new Date();
    return date < today;
  },

  isDateNearExpiry(dateString, days = 7) {
    if (!dateString) return false;
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = date - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= days && diffDays > 0;
  },

  formatDate(dateString) {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch (error) {
      return dateString;
    }
  },

  formatPhoneNumber(phone) {
    if (!phone) return "N/A";
    return phone.replace(/(\d{3})(\d{4})(\d{4})/, "$1-$2-$3");
  },

  getDaysFromDate(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = today - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return `${diffDays} hari lalu`;
  },

  getDaysUntilDate(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = date - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return `${Math.abs(diffDays)} hari lewat`;
    } else if (diffDays === 0) {
      return "Hari ini";
    } else {
      return `${diffDays} hari lagi`;
    }
  },

  escapeHtml(unsafe) {
    if (!unsafe) return "";
    return unsafe
      .toString()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  },

  toggleCustomerSelection(index) {
    if (this.selectedCustomers.has(index)) {
      this.selectedCustomers.delete(index);
    } else {
      this.selectedCustomers.add(index);
    }
    this.updateSelectionUI();
  },

  updateSelectionUI() {
    const selectedCount = this.selectedCustomers.size;
    const selectedCountElement = document.getElementById("selectedCount");

    if (selectedCountElement) {
      selectedCountElement.textContent = selectedCount;
      selectedCountElement.style.display =
        selectedCount > 0 ? "inline" : "none";
    }
  },

  getSelectedCustomers() {
    return Array.from(this.selectedCustomers)
      .map((index) => this.currentCustomers[index])
      .filter((customer) => customer);
  },

  // Late payments management
  updateLatePaymentsTable() {
    const latePayments = this.getLatePayments();
    this.renderLatePaymentsTable(latePayments);
  },

  // Di customers.js - SOLUSI LEBIH ROBUST
  getLatePayments() {
    return this.currentCustomers
      .map((customer, index) => ({
        ...customer,
        originalIndex: index, // Simpan index asli
      }))
      .filter((customer) => {
        const endDate = customer.endDate || customer.berakhir;
        return (
          this.isDatePassed(endDate) &&
          (customer.status === "Active" || !customer.status)
        );
      });
  },

  determineReminderType(daysLate) {
    if (daysLate >= 7) {
      return "final";
    } else if (daysLate >= 3) {
      return "urgent";
    } else {
      return "gentle";
    }
  },
  renderLatePaymentsTable(latePayments) {
    const tbody = document.getElementById("latePaymentsTableBody");
    if (!tbody) return;

    // Update summary counts
    document.getElementById("totalLate").textContent = latePayments.length;

    const totalTunggakan = latePayments.reduce((sum, customer) => {
      return sum + parseInt(customer.price || customer.harga || 0);
    }, 0);
    document.getElementById("totalTunggakan").textContent =
      app.formatCurrency(totalTunggakan);

    if (latePayments.length === 0) {
      tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center text-muted py-4">
                    <i class="bi bi-check-circle display-4 d-block mb-2 text-success"></i>
                    Tidak ada konsumen yang telat bayar
                </td>
            </tr>`;
      return;
    }

    tbody.innerHTML = latePayments
      .map((customer) => {
        const endDate = new Date(customer.endDate || customer.berakhir);
        const today = new Date();
        const daysLate = Math.floor((today - endDate) / (1000 * 60 * 60 * 24));
        const amountDue = customer.price || customer.harga || 0;
        const originalIndex = customer.originalIndex;

        // Rekomendasi otomatis berdasarkan hari keterlambatan
        const recommendedType = this.determineReminderType(daysLate);
        const recommendedText = {
          gentle: "RINGAN",
          urgent: "MENDESAK",
          final: "AKHIR",
        }[recommendedType];

        return `
            <tr class="${
              daysLate > 7
                ? "table-danger"
                : daysLate > 3
                ? "table-warning"
                : ""
            }">
                <td>
                    <div class="fw-semibold">${this.escapeHtml(
                      customer.name || customer.nama
                    )}</div>
                    <small class="text-muted">${this.formatPhoneNumber(
                      customer.phone || customer.nohp
                    )}</small>
                </td>
                <td>${this.formatPhoneNumber(
                  customer.phone || customer.nohp
                )}</td>
                <td><span class="badge bg-secondary">${this.escapeHtml(
                  customer.package || customer.paket
                )}</span></td>
                <td>${this.formatDate(
                  customer.endDate || customer.berakhir
                )}</td>
                <td><span class="badge bg-danger">${daysLate} hari</span></td>
                <td class="fw-bold text-danger">${app.formatCurrency(
                  amountDue
                )}</td>
                <td><small class="text-muted">Belum pernah</small></td>
                <td>
                    <div class="btn-group-vertical btn-group-sm" role="group">
                        <button type="button" class="btn btn-outline-primary btn-sm mb-1" 
                                onclick="notifications.sendSingleReminder(${originalIndex}, 'gentle')">
                            <i class="bi bi-chat-text"></i> Gentle
                        </button>
                        <button type="button" class="btn btn-outline-warning btn-sm mb-1" 
                                onclick="notifications.sendSingleReminder(${originalIndex}, 'urgent')">
                            <i class="bi bi-exclamation-triangle"></i> Urgent
                        </button>
                        <button type="button" class="btn btn-outline-danger btn-sm" 
                                onclick="notifications.sendSingleReminder(${originalIndex}, 'final')">
                            <i class="bi bi-exclamation-octagon"></i> Final
                        </button>
                        <button type="button" class="btn btn-outline-success btn-sm mt-1" onclick="customers.extendCustomer(${originalIndex}, 30)" title="Perpanjang 30 hari">
                               <i class="bi bi-calendar-plus"></i>
                           </button>
                           <button type="button" class="btn btn-outline-danger btn-sm mt-1" onclick="customers.deleteCustomer(${originalIndex})" title="Hapus">
                               <i class="bi bi-trash"></i>
                           </button>
                    </div>
                    <div class="mt-1 small text-center">
                        <span class="badge bg-info">Rekomendasi: ${recommendedText}</span>
                    </div>

                </td>
            </tr>`;
      })
      .join("");
  },

  async extendCustomer(index, days = 30) {
    if (!spreadsheet.accessToken) {
      app.showToast(
        "Login diperlukan untuk memperpanjang masa aktif",
        "warning"
      );
      auth.showLoginModal();
      return;
    }

    const customer = this.currentCustomers[index];
    if (!customer) {
      app.showToast("Data konsumen tidak ditemukan", "error");
      return;
    }

    try {
      const currentEndDate = new Date(customer.endDate || customer.berakhir);
      currentEndDate.setDate(currentEndDate.getDate() + days);

      const updatedData = {
        name: customer.name || customer.nama,
        phone: customer.phone || customer.nohp,
        package: customer.package || customer.paket,
        price: customer.price || customer.harga,
        startDate: customer.startDate || customer.mulai,
        endDate: currentEndDate.toISOString().split("T")[0],
      };

      await this.updateCustomer(index, updatedData);

      app.showToast(
        `Masa aktif ${
          customer.name || customer.nama
        } diperpanjang ${days} hari`,
        "success"
      );
    } catch (error) {
      console.error("Error extending customer:", error);
      app.showToast(
        "Error memperpanjang masa aktif: " + error.message,
        "error"
      );
    }
  },
};

// Add bulk action buttons to your HTML (tambahkan di section keterlambatan)
const bulkActionsHTML = `
<div class="row mb-3" id="bulkActions" style="display: none;">
    <div class="col-12">
        <div class="card">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <span id="selectedCount" class="badge bg-primary me-2" style="display: none;">0</span>
                        <span class="fw-semibold">Konsumen terpilih</span>
                    </div>
                    <div class="btn-group">
                        <button class="btn btn-outline-success btn-sm" onclick="customers.extendSelectedCustomers(30)">
                            <i class="bi bi-calendar-plus"></i> Perpanjang 30 Hari
                        </button>
                        <button class="btn btn-outline-danger btn-sm" onclick="customers.deleteSelectedCustomers()">
                            <i class="bi bi-trash"></i> Hapus Terpilih
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
`;

// Initialize customers when app starts
document.addEventListener("DOMContentLoaded", function () {
  // Add bulk actions HTML to the page
  const latePaymentsSection = document.getElementById("latepayments");
  if (latePaymentsSection) {
    const existingBulkActions = document.getElementById("bulkActions");
    if (!existingBulkActions) {
      latePaymentsSection.insertAdjacentHTML("afterbegin", bulkActionsHTML);
    }
  }

  // Load customers data after a short delay to ensure app is ready
  setTimeout(() => {
    customers.loadCustomers();
  }, 2000);
});
