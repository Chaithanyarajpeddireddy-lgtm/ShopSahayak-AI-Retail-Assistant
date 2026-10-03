/* ==========================================================================
   ShopSahayak - UI Controllers, Modals, Drawers & Security UX
   Role-Based Permissions, Confirmation Dialogs, Exports, Toasts
   ========================================================================== */

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
window.escapeHtml = escapeHtml;

class UIController {
  constructor(store, aiEngine) {
    this.store = store;
    this.aiEngine = aiEngine;
    this.initEventListeners();
  }

  initEventListeners() {
    // Top bar language selector
    document.querySelectorAll(".lang-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const lang = e.target.getAttribute("data-lang");
        this.store.setLanguage(lang);
      });
    });

    // Sidebar navigation clicks
    document.querySelectorAll(".nav-item, .mobile-nav-item").forEach(item => {
      item.addEventListener("click", (e) => {
        const view = item.getAttribute("data-view");
        if (view) {
          this.switchView(view);
        }
      });
    });

    // Quick AI button in topbar
    const topbarAiBtn = document.getElementById("topbarAiBtn");
    if (topbarAiBtn) {
      topbarAiBtn.addEventListener("click", () => {
        this.switchView("ai-assistant");
      });
    }

    // Global keyboard shortcut Ctrl+K or Cmd+K
    window.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        const search = document.getElementById("globalSearchInput");
        if (search) search.focus();
      }
    });
  }

  switchView(viewName) {
    // Check role permission
    if (this.store.currentUserRole === "viewer" && (viewName === "settings")) {
      this.showToast("Viewer role does not have permission to modify store settings", "alert");
      return;
    }

    // Update active nav items
    document.querySelectorAll(".nav-item, .mobile-nav-item").forEach(item => {
      if (item.getAttribute("data-view") === viewName) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });

    // Update view panels
    document.querySelectorAll(".page-view").forEach(panel => {
      if (panel.id === `view-${viewName}`) {
        panel.classList.add("active");
      } else {
        panel.classList.remove("active");
      }
    });

    this.store.setView(viewName);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  showToast(message, type = "info") {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    
    let icon = "✦";
    if (type === "success") icon = "✓";
    if (type === "alert") icon = "⚠";
    if (type === "ai") icon = "✦";

    const iconSpan = document.createElement("span");
    iconSpan.style.fontWeight = "700";
    iconSpan.textContent = icon;

    const msgSpan = document.createElement("span");
    msgSpan.style.flex = "1";
    msgSpan.textContent = message;

    toast.appendChild(iconSpan);
    toast.appendChild(msgSpan);

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(10px)";
      toast.style.transition = "all 200ms ease";
      setTimeout(() => toast.remove(), 250);
    }, 3500);
  }

  // ------------------------------------------------------------------------
  // SECURITY CONFIRMATION DIALOG (High-Impact Financial Actions)
  // ------------------------------------------------------------------------
  showSecurityConfirmDialog({ title, message, amount, details, onConfirm }) {
    const modalBackdrop = document.getElementById("securityConfirmModal");
    if (!modalBackdrop) return;

    document.getElementById("secConfirmTitle").textContent = title;
    document.getElementById("secConfirmMsg").textContent = message;
    document.getElementById("secConfirmAmount").textContent = `₹${Number(amount).toLocaleString('en-IN')}`;
    document.getElementById("secConfirmDetails").textContent = details || "";

    const confirmBtn = document.getElementById("secConfirmBtn");
    const cancelBtn = document.getElementById("secCancelBtn");

    const handleConfirm = () => {
      modalBackdrop.classList.remove("active");
      confirmBtn.onclick = null;
      if (onConfirm) onConfirm();
    };

    confirmBtn.onclick = handleConfirm;
    cancelBtn.onclick = () => {
      modalBackdrop.classList.remove("active");
    };

    modalBackdrop.classList.add("active");
  }

  // ------------------------------------------------------------------------
  // UNIFIED PURCHASE ORDER APPROVAL PIPELINE
  // ------------------------------------------------------------------------
  requestPurchaseOrderApproval({ productId, quantity, supplierName, actionCardId, autoConfirmDelayMs, onConfirmed }) {
    if (this.store.currentUserRole === "viewer" || this.store.currentUserRole === "staff") {
      this.showToast("Only Store Owner or Manager can approve purchase orders.", "alert");
      return;
    }

    const prod = this.store.products.find(p => p.id === productId);
    if (!prod) return;

    const numQty = Number(quantity) || (prod.id === "PROD-001" ? 100 : Math.max(20, (prod.minStock * 2) - prod.stock));
    const finalCost = numQty * prod.purchasePrice;
    const finalSupplier = supplierName || prod.supplierName;

    this.showSecurityConfirmDialog({
      title: "Confirm Purchase Order",
      message: `Are you sure you want to approve purchase order for ${prod.name} from ${finalSupplier}?`,
      amount: finalCost,
      details: `Quantity: ${numQty} ${prod.unit} • Terms: Net 7 Days Credit`,
      onConfirm: () => {
        const poNumber = this.store.getNextPONumber();
        this.store.restockProduct(prod.id, numQty, finalSupplier, poNumber);

        if (actionCardId && this.aiEngine) {
          this.aiEngine.finalizeActionCardApproval(actionCardId, poNumber, numQty, finalCost);
        }

        this.showToast(`Purchase order ${poNumber} approved! Added ${numQty} ${prod.unit} of ${prod.name}.`, "success");
        if (onConfirmed) onConfirmed(poNumber);
      }
    });

    if (autoConfirmDelayMs) {
      setTimeout(() => {
        const confirmBtn = document.getElementById("secConfirmBtn");
        if (confirmBtn) confirmBtn.click();
      }, autoConfirmDelayMs);
    }
  }

  // ------------------------------------------------------------------------
  // ADD PRODUCT MODAL
  // ------------------------------------------------------------------------
  openAddProductModal() {
    // Role check
    if (this.store.currentUserRole === "viewer" || this.store.currentUserRole === "staff") {
      this.showToast("Only Store Owner or Manager can add new product catalogue entries.", "alert");
      return;
    }

    const modal = document.getElementById("addProductModal");
    if (modal) modal.classList.add("active");
  }

  closeAddProductModal() {
    const modal = document.getElementById("addProductModal");
    if (modal) modal.classList.remove("active");
  }

  handleSaveProduct() {
    const name = document.getElementById("prodNameInput")?.value.trim();
    const category = document.getElementById("prodCategorySelect")?.value;
    const purchasePrice = document.getElementById("prodPurchasePrice")?.value;
    const sellingPrice = document.getElementById("prodSellingPrice")?.value;
    const stock = document.getElementById("prodStockInput")?.value;
    const minStock = document.getElementById("prodMinStockInput")?.value;
    const unit = document.getElementById("prodUnitInput")?.value;
    const supplierName = document.getElementById("prodSupplierSelect")?.value;

    if (!name) {
      this.showToast("Please enter a valid product name", "alert");
      return;
    }

    const item = this.store.addProduct({
      name,
      category,
      purchasePrice,
      sellingPrice,
      stock,
      minStock,
      unit,
      supplierName
    });

    this.closeAddProductModal();
    this.showToast(`Product "${item.name}" successfully added to catalogue!`, "success");
    
    // Clear fields
    if (document.getElementById("prodNameInput")) document.getElementById("prodNameInput").value = "";
  }

  // ------------------------------------------------------------------------
  // RESTOCK RECOMMENDATION MODAL
  // ------------------------------------------------------------------------
  openRestockModal(productId) {
    const prod = this.store.products.find(p => p.id === productId);
    if (!prod) return;

    const modal = document.getElementById("restockModal");
    if (!modal) return;

    document.getElementById("restockProdName").innerText = prod.name;
    document.getElementById("restockProdSku").innerText = prod.sku;
    document.getElementById("restockCurrentStock").innerText = `${prod.stock} ${prod.unit}`;
    document.getElementById("restockMinStock").innerText = `${prod.minStock} ${prod.unit}`;
    document.getElementById("restockVelocity").innerText = `${prod.velocityDaily} ${prod.unit}/day`;
    
    // Recommended quantity calculation: (minStock * 2) - currentStock or standard 100 for rice
    const recQty = prod.id === "PROD-001" ? 100 : Math.max(20, (prod.minStock * 2) - prod.stock);
    const estCost = recQty * prod.purchasePrice;

    const qtyInput = document.getElementById("restockRecommendedQty");
    const costDisplay = document.getElementById("restockEstCost");
    
    qtyInput.value = recQty;
    document.getElementById("restockSupplier").innerText = prod.supplierName;
    costDisplay.innerText = `₹${estCost.toLocaleString('en-IN')}`;

    qtyInput.oninput = () => {
      const q = Number(qtyInput.value) || 0;
      costDisplay.innerText = `₹${(q * prod.purchasePrice).toLocaleString('en-IN')}`;
    };

    const approveBtn = document.getElementById("restockApproveBtn");
    approveBtn.onclick = () => {
      const finalQty = Number(qtyInput.value) || recQty;
      modal.classList.remove("active");
      this.requestPurchaseOrderApproval({
        productId: prod.id,
        quantity: finalQty,
        supplierName: prod.supplierName
      });
    };

    modal.classList.add("active");
  }

  closeRestockModal() {
    const modal = document.getElementById("restockModal");
    if (modal) modal.classList.remove("active");
  }

  // ------------------------------------------------------------------------
  // CUSTOMER PROFILE DRAWER
  // ------------------------------------------------------------------------
  openCustomerDrawer(customerId) {
    const cust = this.store.customers.find(c => c.id === customerId);
    if (!cust) return;

    const drawer = document.getElementById("customerDrawer");
    if (!drawer) return;

    document.getElementById("custDrawerInitials").innerText = cust.name.slice(0, 2).toUpperCase();
    document.getElementById("custDrawerName").innerText = cust.name;
    document.getElementById("custDrawerPhone").innerText = cust.phone;
    document.getElementById("custDrawerType").innerText = cust.type;
    document.getElementById("custDrawerOrders").innerText = cust.ordersCount;
    document.getElementById("custDrawerSpend").innerText = `₹${cust.totalSpend.toLocaleString('en-IN')}`;
    document.getElementById("custDrawerKhata").innerText = `₹${(cust.khataBalance || 0).toLocaleString('en-IN')}`;
    document.getElementById("custDrawerLastPurchase").innerText = cust.lastPurchase;
    document.getElementById("custDrawerInsight").innerText = cust.aiInsight;

    drawer.classList.add("active");
  }

  closeCustomerDrawer() {
    const drawer = document.getElementById("customerDrawer");
    if (drawer) drawer.classList.remove("active");
  }

  // ------------------------------------------------------------------------
  // RECORD SALE / POS QUICK BILLING MODAL
  // ------------------------------------------------------------------------
  openNewSaleModal() {
    const modal = document.getElementById("newSaleModal");
    if (modal) modal.classList.add("active");
  }

  closeNewSaleModal() {
    const modal = document.getElementById("newSaleModal");
    if (modal) modal.classList.remove("active");
  }

  handleSaveSale() {
    const custName = document.getElementById("saleCustomerInput")?.value.trim() || "Walk-in Customer";
    const amount = Number(document.getElementById("saleAmountInput")?.value);
    const summary = document.getElementById("saleItemsSummary")?.value.trim() || "Groceries & Provisions";
    const method = document.getElementById("salePaymentSelect")?.value || "UPI (PhonePe)";

    if (!amount || amount <= 0) {
      this.showToast("Please enter a valid sale amount in ₹", "alert");
      return;
    }

    const tx = this.store.addSaleTransaction({
      customer: custName,
      amount: amount,
      itemsSummary: summary,
      paymentMethod: method,
      itemsCount: 2
    });

    this.closeNewSaleModal();
    this.showToast(`Sale of ₹${amount} recorded successfully! Order #${tx.id}`, "success");
  }

  // ------------------------------------------------------------------------
  // EXPORT REPORTS (CSV, EXCEL, PRINTABLE PDF)
  // ------------------------------------------------------------------------
  exportReport(format) {
    const BOM = "\uFEFF";
    if (format === "csv") {
      let csv = BOM + "Product Name,SKU,Category,Current Stock,Minimum Stock,Unit Price,Supplier,Status\n";
      this.store.products.forEach(p => {
        csv += `"${p.name}","${p.sku}","${p.category}",${p.stock},${p.minStock},${p.sellingPrice},"${p.supplierName}","${p.status}"\n`;
      });
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `ShopSahayak_Inventory_Report_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      this.showToast("Inventory CSV report downloaded (opens in Excel)!", "success");
    } else if (format === "excel" || format === "sales_csv") {
      let csv = BOM + "Order ID,Time,Customer,Items,Amount,Payment Method,Status\n";
      this.store.transactions.forEach(t => {
        csv += `"${t.id}","${t.time}","${t.customer}","${t.itemsSummary}",${t.amount},"${t.paymentMethod}","${t.status}"\n`;
      });
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `ShopSahayak_Sales_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      this.showToast("Sales CSV report downloaded (opens in Excel)!", "success");
    } else if (format === "pdf") {
      this.showToast("Preparing printable report...", "info");
      setTimeout(() => {
        window.print();
      }, 300);
    }
  }
}

window.shopUI = new UIController(window.shopStore, window.shopAiEngine);
