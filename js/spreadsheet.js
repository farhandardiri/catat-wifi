// Google Sheets API Integration - READ WITHOUT LOGIN, WRITE NEEDS LOGIN
const spreadsheet = {
  SHEET_ID: "1OvdL0kYrqepcIeTsTs5k2oTvWHxpCgr9JcMFDBpzRpc",
  API_KEY: "AIzaSyDEif5uDoVmYUxrthp8AT1v3aurWdJgLfo", // API Key untuk read-only access
  accessToken: null,

  setAccessToken(token) {
    this.accessToken = token;
    // console.log("Write access enabled with OAuth token");
  },

  // Method untuk READ operations (tanpa login)
  async makeReadRequest(url) {
    // console.log("Making READ request to:", url);

    // Coba dengan API Key dulu (tanpa login)
    const urlWithKey = `${url}?key=${this.API_KEY}`;

    try {
      const response = await fetch(urlWithKey);

      if (response.ok) {
        // console.log("READ success with API Key");
        return response;
      }

      // Jika gagal dengan API Key, throw error
      const errorData = await response.json();
      throw new Error(
        `API Error: ${errorData.error?.message || "Unknown error"}`
      );
    } catch (error) {
      // console.log("READ with API Key failed:", error.message);
      throw error;
    }
  },

  // Method untuk WRITE operations (butuh login)
  async makeWriteRequest(url, options = {}) {
    if (!this.accessToken) {
      throw new Error(
        "Login required untuk menyimpan data. Silakan login dengan Google."
      );
    }

    // console.log("Making WRITE request with OAuth token");

    const defaultOptions = {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
    };

    const mergedOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers,
      },
    };

    const response = await fetch(url, mergedOptions);

    if (response.status === 401) {
      throw new Error("Session expired. Silakan login ulang.");
    }

    return response;
  },

  // READ: Get transactions (tanpa login)
  async getTransactions() {
    try {
      // console.log("Getting transactions (READ operation)...");
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.SHEET_ID}/values/Transaksi`;

      const response = await this.makeReadRequest(url);
      const data = await response.json();

      // console.log("Raw transactions data:", data);

      if (!data.values) {
        // console.log("No transactions data found");
        return [];
      }

      const headers = data.values[0];
      const transactions = data.values.slice(1).map((row) => {
        const transaction = {};
        headers.forEach((header, index) => {
          transaction[header.toLowerCase()] = row[index] || "";
        });
        return transaction;
      });

      // console.log("Processed transactions count:", transactions.length);
      return transactions;
    } catch (error) {
      console.error("Error getTransactions:", error);
      // Fallback ke sample data
      return this.getSampleData().transactions;
    }
  },

  // READ: Get customers (tanpa login)
  async getCustomers() {
    try {
      // console.log("Getting customers (READ operation)...");
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.SHEET_ID}/values/Customers`;

      const response = await this.makeReadRequest(url);
      const data = await response.json();

      if (!data.values) {
        // console.log("No customers data found");
        return [];
      }

      const headers = data.values[0];
      const customers = data.values.slice(1).map((row) => {
        const customer = {};
        headers.forEach((header, index) => {
          customer[header.toLowerCase()] = row[index] || "";
        });
        return customer;
      });

      // console.log("Processed customers count:", customers.length);
      return customers;
    } catch (error) {
      // console.error("Error getCustomers:", error);
      return this.getSampleData().customers;
    }
  },

  // WRITE: Save transaction (butuh login)
  async saveTransaction(data) {
    try {
      if (!this.isValidTransaction(data)) {
        throw new Error("Data transaksi tidak valid");
      }

      const values = [
        data.tanggal,
        data.jenis,
        data.kategori,
        data.deskripsi,
        this.formatAmount(data.jumlah),
        "", // Saldo
        new Date().toISOString(),
      ];

      const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.SHEET_ID}/values/Transaksi:append?valueInputOption=USER_ENTERED`;

      const response = await this.makeWriteRequest(url, {
        method: "POST",
        body: JSON.stringify({
          values: [values],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Google Sheets Error: ${errorData.error?.message || "Unknown error"}`
        );
      }

      const result = await response.json();
      // console.log("Data tersimpan:", result);
      return result;
    } catch (error) {
      // console.error("Error saveTransaction:", error);
      throw error; // Re-throw agar bisa ditangani di UI
    }
  },

  // WRITE: Save customer (butuh login)
  async saveCustomer(customerData) {
    try {
      if (!this.isValidCustomer(customerData)) {
        throw new Error("Data customer tidak valid");
      }

      const values = [
        customerData.name,
        customerData.phone,
        customerData.package,
        this.formatAmount(customerData.price),
        customerData.startDate,
        customerData.endDate,
        "Active",
        new Date().toISOString(),
      ];

      const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.SHEET_ID}/values/Customers:append?valueInputOption=USER_ENTERED`;

      const response = await this.makeWriteRequest(url, {
        method: "POST",
        body: JSON.stringify({
          values: [values],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Google Sheets Error: ${errorData.error?.message || "Unknown error"}`
        );
      }

      const result = await response.json();
      // console.log("Customer tersimpan:", result);
      return result;
    } catch (error) {
      // console.error("Error saveCustomer:", error);
      throw error;
    }
  },

  // Di spreadsheet.js - tambahkan method ini
  // Di spreadsheet.js - tambahkan method ini
  async updateCustomer(rowIndex, updatedData) {
    try {
      if (!this.accessToken) {
        throw new Error("Login required untuk update data");
      }

      // Data yang akan diupdate
      const values = [
        updatedData.name,
        updatedData.phone,
        updatedData.package,
        this.formatAmount(updatedData.price),
        updatedData.startDate,
        updatedData.endDate,
        "Active", // Status
        new Date().toISOString(), // Timestamp update
      ];

      // Range yang akan diupdate (rowIndex + 2 karena header + 1-based index)
      const range = `Customers!A${rowIndex + 2}:H${rowIndex + 2}`;

      const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.SHEET_ID}/values/${range}?valueInputOption=USER_ENTERED`;

      const response = await this.makeWriteRequest(url, {
        method: "PUT",
        body: JSON.stringify({
          values: [values],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Update Error: ${errorData.error?.message || "Unknown error"}`
        );
      }

      const result = await response.json();
      // console.log("Customer updated:", result);
      return result;
    } catch (error) {
      // console.error("Error updateCustomer:", error);
      throw error;
    }
  },

  async deleteCustomer(rowIndex) {
    try {
      if (!this.accessToken) {
        throw new Error("Login required untuk hapus data");
      }

      // Untuk delete, kita perlu menggunakan BatchUpdate
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.SHEET_ID}:batchUpdate`;

      const requestBody = {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: await this.getSheetId("Customers"),
                dimension: "ROWS",
                startIndex: rowIndex + 1, // +1 untuk skip header
                endIndex: rowIndex + 2,
              },
            },
          },
        ],
      };

      const response = await this.makeWriteRequest(url, {
        method: "POST",
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Delete Error: ${errorData.error?.message || "Unknown error"}`
        );
      }

      const result = await response.json();
      // console.log("Customer deleted:", result);
      return result;
    } catch (error) {
      // console.error("Error deleteCustomer:", error);
      throw error;
    }
  },

  // Helper method untuk mendapatkan sheet ID
  async getSheetId(sheetName) {
    // Ini perlu disesuaikan dengan setup Google Sheets Anda
    // Biasanya sheet ID untuk "Customers" adalah 0 untuk sheet pertama, dst.
    const sheetIds = {
      Transaksi: 0,
      Customers: 123456789, // Ganti dengan sheet ID yang benar
    };
    return sheetIds[sheetName] || 0;
  },

  // Helper methods
  isValidTransaction(data) {
    const required = ["tanggal", "jenis", "kategori", "deskripsi", "jumlah"];
    return required.every(
      (field) => data[field] && data[field].toString().trim() !== ""
    );
  },

  isValidCustomer(data) {
    const required = [
      "name",
      "phone",
      "package",
      "price",
      "startDate",
      "endDate",
    ];
    return required.every(
      (field) => data[field] && data[field].toString().trim() !== ""
    );
  },

  formatAmount(amount) {
    return amount.toString().replace(/[^\d]/g, "");
  },

  // Sample data untuk fallback
  getSampleData() {
    return {
      transactions: [
        {
          tanggal: "2024-01-15",
          jenis: "Pemasukan",
          kategori: "WIFI",
          deskripsi: "Pembayaran Budi - 20Mbps",
          jumlah: "250000",
          saldo: "",
          timestamp: "2024-01-15T10:30:00.000Z",
        },
      ],
      customers: [
        {
          nama: "Budi Santoso",
          nohp: "628123456789",
          paket: "20Mbps",
          harga: "250000",
          mulai: "2024-01-01",
          berakhir: "2024-01-31",
          status: "Active",
          timestamp: "2024-01-15T10:30:00.000Z",
        },
      ],
    };
  },
};
