/* ==========================================================================
   ShopSahayak - Central State Store
   Unified Reactive Store for Products, Inventory, Sales, Customers, Suppliers
   ========================================================================== */

class StoreState {
  constructor() {
    this.profile = { ...INITIAL_STORE_PROFILE };
    this.products = JSON.parse(JSON.stringify(INITIAL_PRODUCTS));
    this.suppliers = JSON.parse(JSON.stringify(INITIAL_SUPPLIERS));
    this.customers = JSON.parse(JSON.stringify(INITIAL_CUSTOMERS));
    this.transactions = JSON.parse(JSON.stringify(INITIAL_TRANSACTIONS));
    this.notifications = JSON.parse(JSON.stringify(INITIAL_NOTIFICATIONS));
    
    this.currentLanguage = "en";
    this.currentUserRole = "owner"; // 'owner' | 'manager' | 'staff' | 'viewer'
    this.currentView = "overview";
    this.listeners = [];

    // Dynamic PO Counter (Starts at PO-8831)
    this.nextPoCounter = 8831;

    // Computed metrics for dashboard
    this.metrics = {
      todayRevenue: 18450,
      todayOrders: 47,
      estimatedProfit: 0,
      activeCustomers: 24,
      lowStockCount: 0,
      healthyStockCount: 0,
      outOfStockCount: 0
    };

    this.recalculateStockCounts();
    this.recalculateProfitMetrics();
  }

  getNextPONumber() {
    const po = `PO-${this.nextPoCounter}`;
    this.nextPoCounter += 1;
    return po;
  }

  getCatalogAverageMargin() {
    if (!this.products || this.products.length === 0) return 0.148;
    const totalMargin = this.products.reduce((acc, p) => {
      const margin = p.sellingPrice > 0 ? (p.sellingPrice - p.purchasePrice) / p.sellingPrice : 0;
      return acc + margin;
    }, 0);
    return totalMargin / this.products.length;
  }

  recalculateProfitMetrics() {
    const avgMargin = this.getCatalogAverageMargin();
    this.metrics.estimatedProfit = Math.round(this.metrics.todayRevenue * avgMargin);
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify(event, payload) {
    this.listeners.forEach(fn => fn(event, payload, this));
  }

  setLanguage(lang) {
    if (TRANSLATIONS[lang]) {
      this.currentLanguage = lang;
      this.notify("language_changed", lang);
    }
  }

  setRole(role) {
    this.currentUserRole = role;
    this.notify("role_changed", role);
  }

  setView(viewName) {
    this.currentView = viewName;
    this.notify("view_changed", viewName);
  }

  recalculateStockCounts() {
    let low = 0;
    let healthy = 0;
    let out = 0;
    this.products.forEach(p => {
      if (p.stock === 0) {
        p.status = "out";
        out++;
      } else if (p.stock <= p.minStock) {
        p.status = "low";
        low++;
      } else {
        p.status = "healthy";
        healthy++;
      }
    });
    this.metrics.lowStockCount = low;
    this.metrics.healthyStockCount = healthy;
    this.metrics.outOfStockCount = out;
    return { low, healthy, out };
  }

  addProduct(newProduct) {
    const id = "PROD-" + String(this.products.length + 1).padStart(3, "0");
    const item = {
      id,
      name: newProduct.name,
      sku: newProduct.sku || `SKU-${Date.now().toString().slice(-4)}`,
      category: newProduct.category || "General Groceries",
      purchasePrice: Number(newProduct.purchasePrice) || 0,
      sellingPrice: Number(newProduct.sellingPrice) || 0,
      stock: Number(newProduct.stock) || 0,
      minStock: Number(newProduct.minStock) || 10,
      unit: newProduct.unit || "units",
      supplierId: newProduct.supplierId || "SUP-001",
      supplierName: newProduct.supplierName || "ABC Distributors",
      velocityDaily: 3.0,
      status: "healthy",
      trend: "New SKU"
    };

    this.products.unshift(item);
    this.recalculateStockCounts();
    this.recalculateProfitMetrics();
    this.notify("product_added", item);
    return item;
  }

  restockProduct(productId, quantity, supplierName, poNumber) {
    const prod = this.products.find(p => p.id === productId);
    if (prod) {
      const oldStock = prod.stock;
      const numQty = Number(quantity);
      prod.stock += numQty;
      this.recalculateStockCounts();

      // Reliable supplier lookup by ID or name
      const supp = this.suppliers.find(s => s.id === prod.supplierId || s.name === (supplierName || prod.supplierName));
      const orderCost = prod.purchasePrice * numQty;
      const assignedPo = poNumber || this.getNextPONumber();

      if (supp) {
        supp.pendingOrders += 1;
        supp.totalPurchased += orderCost;
        supp.lastOrderDate = "Today, " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      }

      // Add a notification
      this.notifications.unshift({
        id: "NOTIF-" + Date.now(),
        category: "Orders",
        severity: "success",
        title: `Purchase Order Dispatched (${assignedPo})`,
        message: `Ordered ${numQty} ${prod.unit} of ${prod.name} from ${prod.supplierName} (₹${orderCost.toLocaleString("en-IN")}, ${assignedPo}). Stock updated to ${prod.stock} ${prod.unit}.`,
        time: "Just now",
        read: false,
        action: "open_inventory",
        target: prod.id
      });

      this.notify("product_restocked", { product: prod, added: numQty, oldStock, poNumber: assignedPo, orderCost });
      return prod;
    }
    return null;
  }

  addSaleTransaction(saleData) {
    const orderId = "ORD-" + Math.floor(9403 + this.transactions.length);
    const amount = Number(saleData.amount);

    const transaction = {
      id: orderId,
      time: "Just now",
      customer: saleData.customer || "Walk-in Customer",
      itemsCount: saleData.itemsCount || 1,
      itemsSummary: saleData.itemsSummary || "Groceries & Provisions",
      amount: amount,
      paymentMethod: saleData.paymentMethod || "UPI (PhonePe)",
      status: "Completed"
    };

    this.transactions.unshift(transaction);
    this.metrics.todayRevenue += amount;
    this.metrics.todayOrders += 1;
    this.metrics.estimatedProfit += Math.round(amount * this.getCatalogAverageMargin());

    this.notify("sale_completed", transaction);
    return transaction;
  }

  markNotificationAsRead(id) {
    const notif = this.notifications.find(n => n.id === id);
    if (notif) {
      notif.read = true;
      this.notify("notification_updated", notif);
    }
  }

  markAllNotificationsRead() {
    this.notifications.forEach(n => n.read = true);
    this.notify("notifications_cleared", null);
  }
}

// Global Store singleton
window.shopStore = new StoreState();
