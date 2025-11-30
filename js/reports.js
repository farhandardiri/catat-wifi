// Reports Management - COMPLETE VERSION
const reports = {
  currentData: {
    transactions: [],
    customers: [],
  },

  async init() {
    // console.log("Initializing reports...");
    await this.loadData();
    this.renderReports();
    this.setupEventListeners();
  },

  async loadData() {
    try {
      //   console.log("Loading data for reports...");
      const [transactions, customers] = await Promise.all([
        spreadsheet.getTransactions(),
        spreadsheet.getCustomers(),
      ]);

      this.currentData = {
        transactions: transactions,
        customers: customers,
      };

      //   console.log(
      //     "Reports data loaded - Transactions:",
      //     transactions.length,
      //     "Customers:",
      //     customers.length
      //   );
    } catch (error) {
      console.error("Error loading reports data:", error);
      app.showToast("Gagal memuat data laporan", "error");
    }
  },

  setupEventListeners() {
    // Date range filter
    const dateRangeSelect = document.getElementById("dateRange");
    if (dateRangeSelect) {
      dateRangeSelect.addEventListener("change", (e) => {
        this.handleDateRangeChange(e.target.value);
      });
    }

    // Export buttons
    const exportPdfBtn = document.getElementById("exportPdf");
    const exportExcelBtn = document.getElementById("exportExcel");

    if (exportPdfBtn) {
      exportPdfBtn.addEventListener("click", () => this.exportToPDF());
    }
    if (exportExcelBtn) {
      exportExcelBtn.addEventListener("click", () => this.exportToExcel());
    }

    // Refresh button
    const refreshBtn = document.getElementById("refreshReports");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => this.refreshReports());
    }
  },

  handleDateRangeChange(selectedValue) {
    if (selectedValue === "custom") {
      this.showCustomDateRange();
    } else {
      this.hideCustomDateRange();
      this.applyFilters();
    }
  },

  showCustomDateRange() {
    const customRangeContainer = document.getElementById("customDateRange");
    if (!customRangeContainer) return;

    // Set default dates (30 hari terakhir sampai hari ini)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const customRangeHTML = `
        <div class="custom-range-container bg-light p-2 rounded">
            <div class="row g-2 align-items-center">
                <div class="col-md-4">
                    <label class="form-label small mb-0 text-dark">Dari Tanggal:</label>
                    <input type="date" class="form-control form-control-sm" id="startDateCustom" 
                           value="${startDate.toISOString().split("T")[0]}">
                </div>
                <div class="col-md-4">
                    <label class="form-label small mb-0 text-dark">Sampai Tanggal:</label>
                    <input type="date" class="form-control form-control-sm" id="endDateCustom"
                           value="${endDate.toISOString().split("T")[0]}">
                </div>
                <div class="col-md-4">
                    <label class="form-label small mb-0 text-dark">&nbsp;</label>
                    <div class="d-flex gap-1">
                        <button class="btn btn-primary btn-sm flex-fill" onclick="reports.applyCustomDateRange()">
                            <i class="bi bi-check"></i> Terapkan
                        </button>
                        <button class="btn btn-secondary btn-sm" onclick="reports.hideCustomDateRange()">
                            <i class="bi bi-x"></i>
                        </button>
                    </div>
                </div>
            </div>
            <div class="row mt-1">
                <div class="col-12">
                    <small class="text-muted">
                        <i class="bi bi-info-circle"></i> Pilih rentang tanggal custom
                    </small>
                </div>
            </div>
        </div>
    `;

    customRangeContainer.innerHTML = customRangeHTML;
    customRangeContainer.style.display = "block";
  },

  // TAMBAHKAN method hideCustomDateRange
  hideCustomDateRange() {
    const customRangeContainer = document.getElementById("customDateRange");
    const dateRangeSelect = document.getElementById("dateRange");

    if (customRangeContainer) {
      customRangeContainer.style.display = "none";
      customRangeContainer.innerHTML = "";
    }

    if (dateRangeSelect) {
      dateRangeSelect.value = "all"; // Kembali ke semua waktu
    }

    this.applyFilters(); // Refresh dengan filter default
  },

  // TAMBAHKAN method applyCustomDateRange
  applyCustomDateRange() {
    const startDateInput = document.getElementById("startDateCustom");
    const endDateInput = document.getElementById("endDateCustom");

    if (!startDateInput || !endDateInput) {
      app.showToast("Input tanggal tidak ditemukan", "error");
      return;
    }

    const startDate = new Date(startDateInput.value);
    const endDate = new Date(endDateInput.value);

    // Validasi input
    if (!startDateInput.value || !endDateInput.value) {
      app.showToast("Harap pilih kedua tanggal", "warning");
      return;
    }

    if (startDate > endDate) {
      app.showToast(
        "Tanggal mulai tidak boleh setelah tanggal akhir",
        "warning"
      );
      return;
    }

    if (startDate > new Date()) {
      app.showToast("Tanggal mulai tidak boleh di masa depan", "warning");
      return;
    }

    // Add 1 day to endDate untuk include seluruh hari terakhir
    const endDateInclusive = new Date(endDate);
    endDateInclusive.setDate(endDateInclusive.getDate() + 1);

    // console.log(
    //   `Custom filter: ${startDateInput.value} to ${endDateInput.value}`
    // );

    // Filter data berdasarkan custom range
    const filteredTransactions = this.currentData.transactions.filter(
      (transaction) => {
        try {
          const transactionDate = new Date(
            transaction.tanggal || transaction.Tanggal
          );
          return (
            transactionDate >= startDate && transactionDate < endDateInclusive
          );
        } catch (error) {
          console.error("Error filtering transaction:", transaction, error);
          return false;
        }
      }
    );

    const filteredData = {
      transactions: filteredTransactions,
      customers: this.currentData.customers,
    };

    // console.log(`Custom filtered transactions: ${filteredTransactions.length}`);

    // Render reports dengan data filtered
    this.renderFilteredReports(filteredData);

    // Update filter info dengan custom range
    this.updateCustomFilterInfo(startDateInput.value, endDateInput.value);

    app.showToast(
      `Filter custom diterapkan: ${this.formatCustomDateRange(
        startDateInput.value,
        endDateInput.value
      )}`,
      "success"
    );
  },

  // TAMBAHKAN method updateCustomFilterInfo
  updateCustomFilterInfo(startDate, endDate) {
    const filterInfo = document.getElementById("filterInfo");
    if (!filterInfo) return;

    const formattedStart = this.formatDateForDisplay(startDate);
    const formattedEnd = this.formatDateForDisplay(endDate);

    filterInfo.innerHTML = `
        <small class="text-muted">
            <i class="bi bi-funnel"></i> Filter: ${formattedStart} - ${formattedEnd}
        </small>
    `;
  },

  // TAMBAHKAN helper methods
  formatCustomDateRange(startDate, endDate) {
    const start = this.formatDateForDisplay(startDate);
    const end = this.formatDateForDisplay(endDate);
    return `${start} s/d ${end}`;
  },

  formatDateForDisplay(dateString) {
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

  applyFilters() {
    const dateRange = document.getElementById("dateRange")?.value || "all";

    // Jika custom range, jangan apply filter biasa
    if (dateRange !== "custom") {
      const filteredData = this.filterDataByDateRange(dateRange);
      this.renderFilteredReports(filteredData);
      this.updateFilterInfo();
    }
  },

  // Di reports.js - UPDATE method filterDataByDateRange
  filterDataByDateRange(dateRange) {
    const now = new Date();
    let startDate, endDate;

    switch (dateRange) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() + 1
        );
        break;
      case "week":
        startDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 7
        );
        endDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() + 1
        );
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        break;
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear() + 1, 0, 1);
        break;
      default: // 'all'
        return this.currentData;
    }

    // console.log(`Filtering data from ${startDate} to ${endDate}`); // Debug

    const filteredTransactions = this.currentData.transactions.filter(
      (transaction) => {
        try {
          const transactionDate = new Date(
            transaction.tanggal || transaction.Tanggal
          );
          return transactionDate >= startDate && transactionDate < endDate;
        } catch (error) {
          console.error("Error filtering transaction:", transaction, error);
          return false;
        }
      }
    );

    // console.log(
    //   `Filtered transactions: ${filteredTransactions.length} from ${this.currentData.transactions.length}`
    // ); // Debug

    return {
      transactions: filteredTransactions,
      customers: this.currentData.customers, // Customers tetap semua karena tidak terkait tanggal
    };
  },

  renderReports() {
    this.renderSummaryCards(this.currentData);
    this.renderIncomeExpenseChart(this.currentData);
    this.renderTransactionHistory(this.currentData.transactions);
    this.renderCustomerStats(this.currentData.customers);
    this.renderPackageDistribution(this.currentData.customers);
  },

  renderFilteredReports(filteredData) {
    // Update summary cards dengan data filtered
    this.renderSummaryCards(filteredData);

    // Update chart dengan data filtered
    this.renderIncomeExpenseChart(filteredData);

    // Update transaction history dengan data filtered
    this.renderTransactionHistory(filteredData.transactions);

    // Customer stats dan package distribution tetap pakai semua data (karena tidak terkait date range)
    this.renderCustomerStats(this.currentData.customers);
    this.renderPackageDistribution(this.currentData.customers);

    // Update filter info
    this.updateFilterInfo();
  },

  // Di reports.js - TAMBAHKAN method updateFilterInfo
  updateFilterInfo() {
    const dateRange = document.getElementById("dateRange")?.value || "all";
    const filterInfo = document.getElementById("filterInfo");

    if (!filterInfo) return;

    const filterTexts = {
      all: "Semua Waktu",
      today: "Hari Ini",
      week: "7 Hari Terakhir",
      month: "Bulan Ini",
      year: "Tahun Ini",
    };

    filterInfo.innerHTML = `
        <small class="text-muted">
            <i class="bi bi-funnel"></i> Filter: ${filterTexts[dateRange]}
        </small>
    `;
  },

  // Di reports.js - PERBAIKI method renderSummaryCards
  renderSummaryCards(data) {
    const { transactions, customers } = data;

    // console.log("Transactions for calculation:", transactions); // Debug log

    // Calculate totals - PERBAIKI LOGIKA INI
    const wifiIncome = this.calculateCategoryTotal(
      transactions,
      "WIFI",
      "Pemasukan"
    );
    const otherIncome = this.calculateCategoryTotal(
      transactions,
      "BRG",
      "Pemasukan"
    );
    const serviceIncome = this.calculateCategoryTotal(
      transactions,
      "LAY",
      "Pemasukan"
    );
    const totalIncome = wifiIncome + otherIncome + serviceIncome;

    // PERBAIKI: Hitung semua pengeluaran tanpa filter kategori spesifik
    const totalExpenses = transactions
      .filter((t) => {
        const tJenis = t.jenis || t.Jenis;
        return tJenis === "Pengeluaran";
      })
      .reduce((sum, t) => {
        const amount = parseInt(t.jumlah || t.Jumlah || 0);
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);

    // Atau jika ingin detail per kategori pengeluaran:
    const electricityExpense = this.calculateCategoryTotal(
      transactions,
      "LIST",
      "Pengeluaran"
    );
    const internetExpense = this.calculateCategoryTotal(
      transactions,
      "INT",
      "Pengeluaran"
    );
    const maintenanceExpense = this.calculateCategoryTotal(
      transactions,
      "PER",
      "Pengeluaran"
    );

    // // Debug logging
    // console.log("Calculation results:", {
    //   wifiIncome,
    //   otherIncome,
    //   serviceIncome,
    //   totalIncome,
    //   totalExpenses,
    //   electricityExpense,
    //   internetExpense,
    //   maintenanceExpense,
    // });

    const netProfit = totalIncome - totalExpenses;

    // Active customers
    const activeCustomers = customers.filter((customer) => {
      const endDate = new Date(customer.endDate || customer.berakhir);
      return (
        endDate > new Date() &&
        (customer.status === "Active" || !customer.status)
      );
    }).length;

    // Late payments
    const latePayments = customers.filter((customer) => {
      const endDate = new Date(customer.endDate || customer.berakhir);
      return (
        endDate < new Date() &&
        (customer.status === "Active" || !customer.status)
      );
    }).length;

    // Update summary cards
    this.updateElement("totalWifi", app.formatCurrency(wifiIncome));
    this.updateElement("totalBarang", app.formatCurrency(otherIncome));
    this.updateElement("totalLayanan", app.formatCurrency(serviceIncome));
    this.updateElement("totalPengeluaran", app.formatCurrency(totalExpenses));
    this.updateElement("saldoBersih", app.formatCurrency(netProfit));
    this.updateElement("activeCustomers", activeCustomers);
    this.updateElement("latePaymentsCount", latePayments);

    // Update detailed breakdown (jika ada element-nya)
    this.updateElement(
      "electricityExpense",
      app.formatCurrency(electricityExpense)
    );
    this.updateElement("internetExpense", app.formatCurrency(internetExpense));
    this.updateElement(
      "maintenanceExpense",
      app.formatCurrency(maintenanceExpense)
    );
  },

  calculateCategoryTotal(transactions, category, type) {
    return transactions
      .filter((t) => {
        const tKategori = t.kategori || t.Kategori;
        const tJenis = t.jenis || t.Jenis;
        return tKategori === category && tJenis === type;
      })
      .reduce((sum, t) => {
        const amount = parseInt(t.jumlah || t.Jumlah || 0);
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);
  },

  // Di reports.js - PERBAIKI method renderIncomeExpenseChart
  // Di reports.js - UPDATE method renderIncomeExpenseChart untuk support filter
  renderIncomeExpenseChart(data) {
    const { transactions } = data;
    const chartContainer = document.getElementById("incomeExpenseChart");

    if (!chartContainer) {
      console.error("Income expense chart container not found");
      return;
    }

    // console.log(
    //   "Rendering chart with filtered transactions:",
    //   transactions.length
    // );

    // Group by month - method ini sudah otomatis pakai data yang difilter
    const monthlyData = this.groupTransactionsByMonth(transactions);
    const months = Object.keys(monthlyData);

    // console.log("Filtered monthly data for chart:", monthlyData);

    if (months.length === 0) {
      chartContainer.innerHTML = `
            <div class="text-center text-muted py-5">
                <i class="bi bi-bar-chart display-4 d-block mb-2"></i>
                Tidak ada data transaksi dalam periode yang dipilih
                <br>
                <small class="text-muted">Coba pilih rentang waktu yang berbeda</small>
            </div>
        `;
      return;
    }

    // Prepare chart data dari data yang sudah difilter
    const incomeData = months.map((month) => monthlyData[month].income);
    const expenseData = months.map((month) => monthlyData[month].expense);

    // console.log("Filtered chart data:", { months, incomeData, expenseData });

    // Generate chart dengan data filtered
    chartContainer.innerHTML = this.generateInteractiveChart(
      months,
      incomeData,
      expenseData
    );
  },

  // PERBAIKI method groupTransactionsByMonth
  groupTransactionsByMonth(transactions) {
    const monthlyData = {};

    transactions.forEach((transaction) => {
      try {
        const dateStr = transaction.tanggal || transaction.Tanggal;
        if (!dateStr) return;

        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return;

        const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1)
          .toString()
          .padStart(2, "0")}`;
        const monthName = date.toLocaleDateString("id-ID", {
          month: "long",
          year: "numeric",
        });

        if (!monthlyData[monthName]) {
          monthlyData[monthName] = {
            income: 0,
            expense: 0,
            monthKey: monthKey,
          };
        }

        const amount = parseInt(transaction.jumlah || transaction.Jumlah || 0);
        const jenis = transaction.jenis || transaction.Jenis;

        if (jenis === "Pemasukan") {
          monthlyData[monthName].income += amount;
        } else if (jenis === "Pengeluaran") {
          monthlyData[monthName].expense += amount;
        }
      } catch (error) {
        console.error(
          "Error processing transaction for chart:",
          transaction,
          error
        );
      }
    });

    // Sort by monthKey untuk urutan kronologis
    const sortedEntries = Object.entries(monthlyData).sort((a, b) =>
      a[1].monthKey.localeCompare(b[1].monthKey)
    );

    return Object.fromEntries(sortedEntries);
  },

  getFilterDisplayText(dateRange) {
    const texts = {
      all: "Semua Waktu",
      today: "Hari Ini",
      week: "7 Hari Terakhir",
      month: "Bulan Ini",
      year: "Tahun Ini",
      custom: "Rentang Custom",
    };
    return texts[dateRange] || "Semua Waktu";
  },

  // BUAT method generateInteractiveChart yang lebih baik
  generateInteractiveChart(months, incomeData, expenseData) {
    const maxValue = Math.max(...incomeData, ...expenseData);
    const chartHeight = 200;
    const barWidth = 100; // Lebar setiap group bar
    const dateRange = document.getElementById("dateRange")?.value || "all";

    // Hitung net profit untuk setiap bulan
    const netProfitData = incomeData.map(
      (income, index) => income - expenseData[index]
    );
    const hasProfit = netProfitData.some((profit) => profit > 0);
    const hasLoss = netProfitData.some((profit) => profit < 0);

    return `
        <div class="chart-container">

         <div class="filter-info mb-3 text-center">
                <span class="badge bg-info">
                    <i class="bi bi-calendar"></i> 
                    ${this.getFilterDisplayText(dateRange)}
                </span>
                <span class="badge bg-secondary ms-2">
                    ${months.length} Bulan
                </span>
            </div>

            <!-- Chart Bars -->
            <div class="chart-bars-container position-relative" style="height: ${chartHeight}px;">
                ${months
                  .map((month, index) => {
                    const incomeHeight =
                      maxValue > 0
                        ? (incomeData[index] / maxValue) * chartHeight
                        : 0;
                    const expenseHeight =
                      maxValue > 0
                        ? (expenseData[index] / maxValue) * chartHeight
                        : 0;
                    const netProfit = netProfitData[index];
                    const isProfit = netProfit > 0;

                    return `
                        <div class="chart-group position-absolute d-flex align-items-end" 
                             style="left: ${
                               (index * 100) / months.length
                             }%; width: ${100 / months.length}%; height: 100%;">
                            
                            <!-- Income Bar -->
                            <div class="income-bar position-relative me-1 flex-fill"
                                 style="height: ${incomeHeight}px; max-width: 45%;"
                                 title="Pemasukan ${month}: ${app.formatCurrency(
                      incomeData[index]
                    )}">
                                <div class="bar-fill bg-success h-100 rounded-top"></div>
                                <div class="bar-value position-absolute top-0 start-50 translate-middle-x text-white fw-bold" style="font-size: 10px;">
                                    ${this.formatShortCurrency(
                                      incomeData[index]
                                    )}
                                </div>
                            </div>
                            
                            <!-- Expense Bar -->
                            <div class="expense-bar position-relative flex-fill"
                                 style="height: ${expenseHeight}px; max-width: 45%;"
                                 title="Pengeluaran ${month}: ${app.formatCurrency(
                      expenseData[index]
                    )}">
                                <div class="bar-fill bg-danger h-100 rounded-top"></div>
                                <div class="bar-value position-absolute top-0 start-50 translate-middle-x text-white fw-bold" style="font-size: 10px;">
                                    ${this.formatShortCurrency(
                                      expenseData[index]
                                    )}
                                </div>
                            </div>
                            
                            <!-- Net Profit Indicator -->
                            ${
                              netProfit !== 0
                                ? `
                                <div class="net-indicator position-absolute ${
                                  isProfit ? "text-success" : "text-danger"
                                }" 
                                     style="bottom: -20px; left: 50%; transform: translateX(-50%); font-size: 10px;">
                                    <i class="bi ${
                                      isProfit ? "bi-arrow-up" : "bi-arrow-down"
                                    }"></i>
                                    ${app.formatCurrency(Math.abs(netProfit))}
                                </div>
                            `
                                : ""
                            }
                        </div>
                    `;
                  })
                  .join("")}
                
                <!-- Horizontal Grid Lines -->
                <div class="grid-lines position-absolute w-100 h-100 top-0 start-0">
                    ${[0, 0.25, 0.5, 0.75, 1]
                      .map(
                        (percent) => `
                        <div class="position-absolute w-100 border-top border-light" 
                             style="top: ${chartHeight * (1 - percent)}px;">
                            <small class="position-absolute text-muted" style="right: 100%; margin-right: 5px; font-size: 8px;">
                                ${app.formatCurrency(maxValue * percent)}
                            </small>
                        </div>
                    `
                      )
                      .join("")}
                </div>
            </div>
            
            <!-- Month Labels -->
            <div class="month-labels d-flex justify-content-between mt-4">
                ${months
                  .map(
                    (month) => `
                    <div class="text-center" style="width: ${
                      100 / months.length
                    }%">
                        <small class="text-muted">${month.split(" ")[0]}</small>
                    </div>
                `
                  )
                  .join("")}
            </div>
            
            <!-- Chart Legend -->
            <div class="chart-legend mt-4 text-center">
                <span class="badge bg-success me-3">
                    <i class="bi bi-square-fill"></i> Pemasukan
                </span>
                <span class="badge bg-danger me-3">
                    <i class="bi bi-square-fill"></i> Pengeluaran
                </span>
                ${
                  hasProfit
                    ? `<span class="badge bg-success me-2"><i class="bi bi-arrow-up"></i> Profit</span>`
                    : ""
                }
                ${
                  hasLoss
                    ? `<span class="badge bg-danger me-2"><i class="bi bi-arrow-down"></i> Loss</span>`
                    : ""
                }
            </div>
            
            <!-- Summary -->
            <div class="chart-summary mt-3 p-2 bg-light rounded text-center">
                <small class="text-muted">
                    <strong>Total:</strong> 
                    Pemasukan ${app.formatCurrency(
                      incomeData.reduce((a, b) => a + b, 0)
                    )} • 
                    Pengeluaran ${app.formatCurrency(
                      expenseData.reduce((a, b) => a + b, 0)
                    )} •
                    <span class="${
                      netProfitData.reduce((a, b) => a + b, 0) >= 0
                        ? "text-success"
                        : "text-danger"
                    }">
                        Net ${app.formatCurrency(
                          netProfitData.reduce((a, b) => a + b, 0)
                        )}
                    </span>
                </small>
            </div>
        </div>
    `;
  },

  // TAMBAHKAN helper method untuk format currency pendek
  formatShortCurrency(amount) {
    if (amount >= 1000000) {
      return "Rp" + (amount / 1000000).toFixed(1) + "Jt";
    } else if (amount >= 1000) {
      return "Rp" + (amount / 1000).toFixed(0) + "Rb";
    } else {
      return "Rp" + amount;
    }
  },

  generateSimpleChart(months, incomeData, expenseData) {
    if (months.length === 0) {
      return `
                <div class="text-center text-muted py-5">
                    <i class="bi bi-bar-chart display-4 d-block mb-2"></i>
                    Tidak ada data untuk ditampilkan dalam grafik
                </div>
            `;
    }

    const maxValue = Math.max(...incomeData, ...expenseData);
    const chartHeight = 200;

    return `
            <div class="chart-container">
                <div class="d-flex justify-content-between align-items-end chart-bars" style="height: ${chartHeight}px;">
                    ${months
                      .map(
                        (month, index) => `
                        <div class="d-flex flex-column align-items-center" style="width: ${
                          100 / months.length
                        }%">
                            <div class="d-flex align-items-end justify-content-center" style="height: ${chartHeight}px;">
                                <div class="income-bar me-1" 
                                     style="height: ${
                                       (incomeData[index] / maxValue) *
                                       chartHeight
                                     }px;"
                                     title="Pemasukan: ${app.formatCurrency(
                                       incomeData[index]
                                     )}">
                                </div>
                                <div class="expense-bar" 
                                     style="height: ${
                                       (expenseData[index] / maxValue) *
                                       chartHeight
                                     }px;"
                                     title="Pengeluaran: ${app.formatCurrency(
                                       expenseData[index]
                                     )}">
                                </div>
                            </div>
                            <small class="text-muted mt-2 text-center">${
                              month.split(" ")[0]
                            }</small>
                        </div>
                    `
                      )
                      .join("")}
                </div>
                <div class="chart-legend mt-3 text-center">
                    <span class="badge bg-success me-3"><i class="bi bi-circle-fill"></i> Pemasukan</span>
                    <span class="badge bg-danger"><i class="bi bi-circle-fill"></i> Pengeluaran</span>
                </div>
            </div>
        `;
  },

  renderTransactionHistory(transactions) {
    const tbody = document.getElementById("transactionBody");
    if (!tbody) return;

    // Sort by date descending
    const sortedTransactions = [...transactions].sort((a, b) => {
      return (
        new Date(b.tanggal || b.Tanggal) - new Date(a.tanggal || a.Tanggal)
      );
    });

    if (sortedTransactions.length === 0) {
      tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted py-4">
                        <i class="bi bi-receipt display-4 d-block mb-2"></i>
                        Belum ada transaksi
                    </td>
                </tr>`;
      return;
    }

    tbody.innerHTML = sortedTransactions
      .map((transaction) => {
        const isIncome =
          transaction.jenis === "Pemasukan" ||
          transaction.Jenis === "Pemasukan";
        const amount = parseInt(transaction.jumlah || transaction.Jumlah || 0);

        return `
                <tr>
                    <td>${this.formatDate(
                      transaction.tanggal || transaction.Tanggal
                    )}</td>
                    <td>
                        <span class="badge ${
                          isIncome ? "bg-success" : "bg-danger"
                        }">
                            ${transaction.jenis || transaction.Jenis}
                        </span>
                    </td>
                    <td>${transaction.kategori || transaction.Kategori}</td>
                    <td>${transaction.deskripsi || transaction.Deskripsi}</td>
                    <td class="fw-bold text-end ${
                      isIncome ? "text-success" : "text-danger"
                    }">
                        ${isIncome ? "+" : "-"} ${app.formatCurrency(amount)}
                    </td>
                    <td class="text-end">
                        <small class="text-muted">${this.formatDateTime(
                          transaction.timestamp
                        )}</small>
                    </td>
                </tr>
            `;
      })
      .join("");

    // Update transaction count
    this.updateElement("transactionCount", sortedTransactions.length);
  },

  renderCustomerStats(customers) {
    const statsContainer = document.getElementById("customerStats");
    if (!statsContainer) return;

    const activeCustomers = customers.filter((c) => {
      const endDate = new Date(c.endDate || c.berakhir);
      return endDate > new Date();
    }).length;

    const expiredCustomers = customers.filter((c) => {
      const endDate = new Date(c.endDate || c.berakhir);
      return endDate < new Date();
    }).length;

    const totalRevenue = customers.reduce((sum, customer) => {
      return sum + parseInt(customer.price || customer.harga || 0);
    }, 0);

    statsContainer.innerHTML = `
            <div class="row text-center">
                <div class="col-md-4">
                    <div class="card bg-primary text-white">
                        <div class="card-body">
                            <h3>${activeCustomers}</h3>
                            <p>Konsumen Aktif</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card bg-warning text-dark">
                        <div class="card-body">
                            <h3>${expiredCustomers}</h3>
                            <p>Konsumen Expired</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card bg-success text-white">
                        <div class="card-body">
                            <h3>${app.formatCurrency(totalRevenue)}</h3>
                            <p>Total Pendapatan</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
  },

  addCustomDateRange() {
    const customRangeHTML = `
        <div class="row mt-2">
            <div class="col-md-5">
                <input type="date" class="form-control form-control-sm" id="startDateCustom">
            </div>
            <div class="col-md-5">
                <input type="date" class="form-control form-control-sm" id="endDateCustom">
            </div>
            <div class="col-md-2">
                <button class="btn btn-primary btn-sm w-100" onclick="reports.applyCustomDateRange()">
                    <i class="bi bi-check"></i>
                </button>
            </div>
        </div>
    `;
    const customRangeContainer = document.getElementById("customDateRange");
    if (customRangeContainer) {
      customRangeContainer.innerHTML = customRangeHTML;
    }
  },

  renderPackageDistribution(customers) {
    const distributionContainer = document.getElementById(
      "packageDistribution"
    );
    if (!distributionContainer) return;

    const packageCounts = {};
    customers.forEach((customer) => {
      const packageName = customer.package || customer.paket;
      packageCounts[packageName] = (packageCounts[packageName] || 0) + 1;
    });

    const totalCustomers = customers.length;

    distributionContainer.innerHTML = `
            <div class="package-distribution">
                ${Object.entries(packageCounts)
                  .map(([pkg, count]) => {
                    const percentage =
                      totalCustomers > 0
                        ? ((count / totalCustomers) * 100).toFixed(1)
                        : 0;
                    return `
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <span>${pkg}</span>
                            <div class="d-flex align-items-center">
                                <div class="progress me-2" style="width: 100px; height: 8px;">
                                    <div class="progress-bar" style="width: ${percentage}%"></div>
                                </div>
                                <small class="text-muted">${count} (${percentage}%)</small>
                            </div>
                        </div>
                    `;
                  })
                  .join("")}
            </div>
        `;
  },

  // Utility methods
  updateElement(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = value;
    }
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

  formatDateTime(dateTimeString) {
    if (!dateTimeString) return "N/A";
    try {
      return new Date(dateTimeString).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return dateTimeString;
    }
  },

  // Export functionality
  exportToPDF() {
    app.showToast("Fitur export PDF akan segera tersedia", "info");
    // Implementasi PDF export bisa menggunakan jsPDF atau library lainnya
  },

  exportToExcel() {
    app.showToast("Fitur export Excel akan segera tersedia", "info");
    // Implementasi Excel export bisa menggunakan SheetJS atau library lainnya
  },

  async refreshReports() {
    try {
      app.showToast("Memperbarui laporan...", "info");
      await this.loadData();
      this.renderReports();
      app.showToast("Laporan berhasil diperbarui", "success");
    } catch (error) {
      console.error("Error refreshing reports:", error);
      app.showToast("Gagal memperbarui laporan", "error");
    }
  },

  // Method untuk dipanggil dari app.js ketika tab laporan dibuka
  loadReports() {
    this.init();
  },
};

// Initialize reports when tab is opened
document.addEventListener("DOMContentLoaded", function () {
  // Reports akan di-initialize ketika tab laporan dibuka
  //   console.log("Reports module loaded");
});
