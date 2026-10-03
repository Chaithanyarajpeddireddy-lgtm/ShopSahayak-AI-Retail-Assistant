/* ==========================================================================
   ShopSahayak - Main Application Bootstrap & Dynamic Multilingual Renderers
   Renders and reactively updates all 11 core SaaS modules with 100% i18n
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  const store = window.shopStore;
  const aiEngine = window.shopAiEngine;
  const ui = window.shopUI;
  const demo = window.shopDemoFlow;

  // Initialize Demo Flow
  if (demo) demo.init();

  // Helper for Category localization
  function getLocalizedCategory(cat, lang) {
    const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
    const map = {
      "Grains & Rice": dict.catGrainsRice || cat,
      "Flours & Atta": dict.catFloursAtta || cat,
      "Edible Oils": dict.catEdibleOils || cat,
      "Pulses & Dal": dict.catPulsesDal || cat,
      "Dairy": dict.catDairy || cat,
      "Home Care": dict.catHomeCare || cat,
      "Personal Care": dict.catPersonalCare || cat,
      "Salt & Sugar": dict.catSaltSugar || cat,
      "Beverages": dict.catBeverages || cat,
      "Snacks & Bakery": dict.catSnacksBakery || cat,
      "Packaged Food": dict.catPackagedFood || cat
    };
    return map[cat] || cat;
  }

  // Helper for Status badge localization
  function getLocalizedStatusBadge(status, lang, stock) {
    const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
    if (status === "healthy") {
      return `<span class="badge badge-success">${dict.healthy}</span>`;
    } else if (status === "low") {
      return `<span class="badge badge-warning">${dict.lowStock}${stock !== undefined ? ` (${stock})` : ''}</span>`;
    } else {
      return `<span class="badge badge-danger">${dict.outOfStock}</span>`;
    }
  }

  // ------------------------------------------------------------------------
  // REACTIVE STORE SUBSCRIPTION
  // ------------------------------------------------------------------------
  store.subscribe((event, payload) => {
    if (event === "product_restocked" || event === "product_added" || event === "sale_completed") {
      renderAllViews();
    } else if (event === "language_changed") {
      applyTranslations(payload);
    } else if (event === "role_changed") {
      updateRoleUI(payload);
    } else if (event === "notification_updated" || event === "notifications_cleared") {
      renderNotificationsView();
      updateNotificationBadge();
    }
  });

  // ------------------------------------------------------------------------
  // AI ENGINE EVENT SUBSCRIPTION
  // ------------------------------------------------------------------------
  aiEngine.onStateChange = (event, payload) => {
    if (event === "message_added" || event === "message_updated") {
      renderAiChatThread(aiEngine.chatHistory);
    } else if (event === "ai_thinking") {
      const thinkingElem = document.getElementById("aiThinkingIndicator");
      if (thinkingElem) thinkingElem.style.display = payload ? "flex" : "none";
    } else if (event === "voice_state") {
      updateVoiceUI(payload);
    }
  };

  // ------------------------------------------------------------------------
  // RENDER ALL SCREENS INITIALLY
  // ------------------------------------------------------------------------
  function renderAllViews() {
    renderDashboardKPIs();
    renderInventoryHealthBar();
    renderTopSellingProductsTable();
    renderUrgentRestockList();
    renderProductsTable();
    renderInventoryTable();
    renderSalesTable();
    renderCustomersTable();
    renderSuppliersView();
    renderReportsView();
    renderNotificationsView();
    renderPromptChips();
  }

  let isAppBootstrapped = false;
  window.shopAppBootstrap = function() {
    if (isAppBootstrapped) return;
    isAppBootstrapped = true;
    document.documentElement.lang = store.currentLanguage || "en";
    renderAllViews();
    renderSalesChart();
    renderAiChatThread(aiEngine.chatHistory);
    initAiChatInput();
    initVoiceControls();
    initFiltersAndSearch();
    initSettingsRoleSwitcher();
    updateNotificationBadge();
  };

  // Initialize Auth & Face Verification Controller (Phase 2)
  if (window.ShopAuth) {
    window.ShopAuth.init();
  } else {
    window.shopAppBootstrap();
  }

  // ------------------------------------------------------------------------
  // DASHBOARD RENDERERS
  // ------------------------------------------------------------------------
  function renderDashboardKPIs() {
    const revElem = document.getElementById("kpiRevenueVal");
    const ordElem = document.getElementById("kpiOrdersVal");
    const profElem = document.getElementById("kpiProfitVal");
    const stockElem = document.getElementById("kpiLowStockVal");
    const custElem = document.getElementById("kpiCustomersVal");

    if (revElem) revElem.innerText = `₹${store.metrics.todayRevenue.toLocaleString('en-IN')}`;
    if (ordElem) ordElem.innerText = store.metrics.todayOrders;
    if (profElem) profElem.innerText = `₹${store.metrics.estimatedProfit.toLocaleString('en-IN')}`;
    if (stockElem) stockElem.innerText = store.metrics.lowStockCount;
    if (custElem) custElem.innerText = store.metrics.activeCustomers;
  }

  function renderInventoryHealthBar() {
    const total = store.products.length;
    const healthyPct = Math.round((store.metrics.healthyStockCount / total) * 100);
    const lowPct = Math.round((store.metrics.lowStockCount / total) * 100);
    const outPct = Math.round((store.metrics.outOfStockCount / total) * 100);

    const barHealthy = document.getElementById("healthBarHealthy");
    const barLow = document.getElementById("healthBarLow");
    const barOut = document.getElementById("healthBarOut");

    if (barHealthy) barHealthy.style.width = `${healthyPct}%`;
    if (barLow) barLow.style.width = `${lowPct}%`;
    if (barOut) barOut.style.width = `${outPct}%`;

    const countHealthy = document.getElementById("healthCountHealthy");
    const countLow = document.getElementById("healthCountLow");
    const countOut = document.getElementById("healthCountOut");

    if (countHealthy) countHealthy.innerText = `${store.metrics.healthyStockCount} SKUs (${healthyPct}%)`;
    if (countLow) countLow.innerText = `${store.metrics.lowStockCount} SKUs (${lowPct}%)`;
    if (countOut) countOut.innerText = `${store.metrics.outOfStockCount} SKUs (${outPct}%)`;

    const pill = document.getElementById("sidebarLowStockPill");
    if (pill) {
      const dict = TRANSLATIONS[store.currentLanguage] || TRANSLATIONS.en;
      pill.innerText = `${store.metrics.lowStockCount} ${dict.lowStock}`;
    }
  }

  function renderSalesChart() {
    const container = document.getElementById("salesChartContainer");
    if (!container) return;

    // SVG Line Chart with gradient fill & interactive points
    container.innerHTML = `
      <svg class="svg-chart" viewBox="0 0 650 200">
        <defs>
          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#2563eb" stop-opacity="0.25"/>
            <stop offset="100%" stop-color="#2563eb" stop-opacity="0.0"/>
          </linearGradient>
        </defs>

        <!-- Horizontal Grid Lines -->
        <line x1="40" y1="30" x2="620" y2="30" class="chart-grid-line" />
        <line x1="40" y1="75" x2="620" y2="75" class="chart-grid-line" />
        <line x1="40" y1="120" x2="620" y2="120" class="chart-grid-line" />
        <line x1="40" y1="165" x2="620" y2="165" class="chart-grid-line" />

        <!-- Y Axis Labels (₹) -->
        <text x="5" y="34" class="chart-axis-label">₹25k</text>
        <text x="5" y="79" class="chart-axis-label">₹18k</text>
        <text x="5" y="124" class="chart-axis-label">₹12k</text>
        <text x="5" y="169" class="chart-axis-label">₹6k</text>

        <!-- Previous Week Comparison (Dashed Gray) -->
        <path d="M 50 140 Q 140 130 230 110 T 410 95 T 500 80 T 600 85" class="chart-line-secondary" />

        <!-- Current Week Area & Line -->
        <path d="M 50 135 C 100 120, 150 145, 200 95 C 260 50, 320 110, 390 70 C 460 30, 520 85, 600 45 L 600 165 L 50 165 Z" class="chart-area-main" />
        <path d="M 50 135 C 100 120, 150 145, 200 95 C 260 50, 320 110, 390 70 C 460 30, 520 85, 600 45" class="chart-line-main" />

        <!-- Data Points & Tooltips -->
        <circle cx="50" cy="135" r="4.5" class="chart-point" data-date="Thu, 17 Oct" data-val="₹11,200" />
        <circle cx="140" cy="125" r="4.5" class="chart-point" data-date="Fri, 18 Oct" data-val="₹13,450" />
        <circle cx="230" cy="85" r="4.5" class="chart-point" data-date="Sat, 19 Oct" data-val="₹19,800" />
        <circle cx="320" cy="100" r="4.5" class="chart-point" data-date="Sun, 20 Oct" data-val="₹17,650" />
        <circle cx="410" cy="70" r="4.5" class="chart-point" data-date="Mon, 21 Oct" data-val="₹16,900" />
        <circle cx="500" cy="78" r="4.5" class="chart-point" data-date="Tue, 22 Oct" data-val="₹15,400" />
        <circle cx="600" cy="45" r="5.5" class="chart-point" data-date="Today (Oct 24)" data-val="₹18,450" style="fill:#2563eb; stroke:#ffffff;" />

        <!-- X Axis Labels -->
        <text x="42" y="185" class="chart-axis-label">Thu</text>
        <text x="132" y="185" class="chart-axis-label">Fri</text>
        <text x="222" y="185" class="chart-axis-label">Sat</text>
        <text x="312" y="185" class="chart-axis-label">Sun</text>
        <text x="402" y="185" class="chart-axis-label">Mon</text>
        <text x="492" y="185" class="chart-axis-label">Tue</text>
        <text x="585" y="185" class="chart-axis-label" style="font-weight:700; fill:#0f172a;">Today</text>
      </svg>
      <div id="chartTooltip" class="chart-tooltip">
        <div id="tooltipDate" class="chart-tooltip-title">Today</div>
        <div id="tooltipVal" class="chart-tooltip-val">₹18,450</div>
      </div>
    `;

    // Tooltip hover interactions
    const tooltip = document.getElementById("chartTooltip");
    container.querySelectorAll(".chart-point").forEach(pt => {
      pt.addEventListener("mouseenter", (e) => {
        const date = pt.getAttribute("data-date");
        const val = pt.getAttribute("data-val");
        document.getElementById("tooltipDate").innerText = date;
        document.getElementById("tooltipVal").innerText = val;
        
        const rect = pt.getBoundingClientRect();
        const parentRect = container.getBoundingClientRect();
        tooltip.style.left = `${rect.left - parentRect.left + 5}px`;
        tooltip.style.top = `${rect.top - parentRect.top - 10}px`;
        tooltip.style.display = "block";
      });

      pt.addEventListener("mouseleave", () => {
        tooltip.style.display = "none";
      });
    });
  }

  function renderTopSellingProductsTable() {
    const tbody = document.getElementById("topSellingTableBody");
    if (!tbody) return;

    const lang = store.currentLanguage;
    const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
    const topItems = store.products.slice(0, 5);

    tbody.innerHTML = topItems.map(p => {
      const statusBadge = getLocalizedStatusBadge(p.status, lang, p.stock);
      const catName = getLocalizedCategory(p.category, lang);

      return `
        <tr>
          <td>
            <div style="display:flex; flex-direction:column;">
              <span style="font-weight:600;">${p.name}</span>
              <span style="font-size:var(--font-size-xs); color:var(--color-text-muted); font-family:var(--font-family-mono);">${p.sku}</span>
            </div>
          </td>
          <td><span class="badge badge-neutral">${catName}</span></td>
          <td>${statusBadge}</td>
          <td class="tabular-nums" style="font-weight:600;">${Math.round(p.velocityDaily * 1.5)} ${p.unit}</td>
          <td class="tabular-nums" style="font-weight:700;">₹${(Math.round(p.velocityDaily * 1.5) * p.sellingPrice).toLocaleString('en-IN')}</td>
          <td><span class="badge badge-ai">${p.trend}</span></td>
          <td class="td-actions">
            <button class="btn btn-sm btn-secondary" onclick="window.shopUI.openRestockModal('${p.id}')">${dict.restockBtn}</button>
          </td>
        </tr>
      `;
    }).join("");
  }

  function renderUrgentRestockList() {
    const container = document.getElementById("urgentRestockList");
    if (!container) return;

    const lang = store.currentLanguage;
    const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
    const urgentItems = store.products.filter(p => p.status === "low" || p.status === "out").slice(0, 3);

    container.innerHTML = urgentItems.map(p => `
      <div class="restock-item-row">
        <div class="restock-item-left">
          <span class="restock-item-name">${p.name}</span>
          <span class="restock-item-sub">${dict.thCurrentStock}: ${p.stock} ${p.unit} • ${dict.thMinLevel}: ${p.minStock}</span>
        </div>
        <button class="btn btn-sm btn-primary" onclick="window.shopUI.openRestockModal('${p.id}')">${dict.restockBtn}</button>
      </div>
    `).join("");
  }

  // ------------------------------------------------------------------------
  // PRODUCTS & INVENTORY RENDERERS
  // ------------------------------------------------------------------------
  function renderProductsTable(filteredProducts = null) {
    const tbody = document.getElementById("productsTableBody");
    if (!tbody) return;

    const lang = store.currentLanguage;
    const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
    const list = filteredProducts || store.products;

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state"><div class="empty-state-title">No products found</div><div class="empty-state-text">Try changing your search terms or filters</div></div></td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(p => {
      const badge = getLocalizedStatusBadge(p.status, lang, p.stock);
      const catName = getLocalizedCategory(p.category, lang);

      return `
        <tr>
          <td>
            <div style="display:flex; flex-direction:column;">
              <span style="font-weight:600;">${p.name}</span>
              <span style="font-size:var(--font-size-xs); color:var(--color-text-muted); font-family:var(--font-family-mono);">${p.sku}</span>
            </div>
          </td>
          <td><span class="badge badge-neutral">${catName}</span></td>
          <td class="tabular-nums">₹${p.purchasePrice}</td>
          <td class="tabular-nums" style="font-weight:600;">₹${p.sellingPrice}</td>
          <td class="tabular-nums" style="font-weight:700;">${p.stock} ${p.unit}</td>
          <td class="tabular-nums" style="color:var(--color-text-muted);">${p.minStock} ${p.unit}</td>
          <td>${p.supplierName}</td>
          <td>${badge}</td>
          <td class="td-actions">
            <button class="btn btn-sm btn-secondary" onclick="window.shopUI.openRestockModal('${p.id}')">${dict.restockBtn}</button>
          </td>
        </tr>
      `;
    }).join("");
  }

  function renderInventoryTable(filteredInventory = null) {
    const tbody = document.getElementById("inventoryTableBody");
    if (!tbody) return;

    const lang = store.currentLanguage;
    const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
    const list = filteredInventory || store.products;

    tbody.innerHTML = list.map(p => {
      const badge = getLocalizedStatusBadge(p.status, lang);

      return `
        <tr>
          <td>
            <div style="display:flex; flex-direction:column;">
              <span style="font-weight:600;">${p.name}</span>
              <span style="font-size:var(--font-size-xs); color:var(--color-text-muted); font-family:var(--font-family-mono);">${p.sku}</span>
            </div>
          </td>
          <td class="tabular-nums" style="font-weight:700;">${p.stock} ${p.unit}</td>
          <td class="tabular-nums" style="color:var(--color-text-muted);">${p.minStock} ${p.unit}</td>
          <td class="tabular-nums" style="color:var(--color-brand-accent); font-weight:600;">${p.velocityDaily} ${p.unit}/day</td>
          <td>${badge}</td>
          <td style="font-size:var(--font-size-xs); color:var(--color-text-muted);">${lang === 'te' ? 'ఈరోజు, 10:45 AM' : (lang === 'hi' ? 'आज, 10:45 AM' : 'Today, 10:45 AM')}</td>
          <td class="td-actions">
            <button class="btn btn-sm btn-ai" onclick="window.shopUI.openRestockModal('${p.id}')">${dict.viewRecBtn}</button>
          </td>
        </tr>
      `;
    }).join("");
  }

  // ------------------------------------------------------------------------
  // SALES RENDERER
  // ------------------------------------------------------------------------
  function renderSalesTable() {
    const tbody = document.getElementById("salesTableBody");
    if (!tbody) return;

    const lang = store.currentLanguage;
    const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;

    tbody.innerHTML = store.transactions.map(t => `
      <tr>
        <td style="font-family:var(--font-family-mono); font-weight:600;">${t.id}</td>
        <td style="color:var(--color-text-muted); font-size:var(--font-size-xs);">${t.time}</td>
        <td style="font-weight:600;">${t.customer}</td>
        <td style="font-size:var(--font-size-sm); color:var(--color-text-secondary);">${t.itemsSummary}</td>
        <td class="tabular-nums" style="font-weight:700;">₹${t.amount.toLocaleString('en-IN')}</td>
        <td><span class="badge badge-neutral">${t.paymentMethod}</span></td>
        <td><span class="badge badge-success">${dict.healthy === 'సరిపడా ఉంది' ? 'పూర్తయింది' : (dict.healthy === 'पर्याप्त' ? 'सफल' : 'Completed')}</span></td>
      </tr>
    `).join("");
  }

  // ------------------------------------------------------------------------
  // CUSTOMERS RENDERER
  // ------------------------------------------------------------------------
  function renderCustomersTable() {
    const tbody = document.getElementById("customersTableBody");
    if (!tbody) return;

    const lang = store.currentLanguage;
    const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;

    tbody.innerHTML = store.customers.map(c => `
      <tr style="cursor:pointer;" onclick="window.shopUI.openCustomerDrawer('${c.id}')">
        <td>
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:32px; height:32px; border-radius:50%; background:#e2e8f0; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:var(--font-size-xs);">
              ${c.name.slice(0, 2).toUpperCase()}
            </div>
            <div style="display:flex; flex-direction:column;">
              <span style="font-weight:600;">${c.name}</span>
              <span style="font-size:var(--font-size-xs); color:var(--color-text-muted);">${c.phone}</span>
            </div>
          </div>
        </td>
        <td><span class="badge badge-neutral">${c.type}</span></td>
        <td class="tabular-nums" style="font-weight:600;">${c.ordersCount}</td>
        <td class="tabular-nums" style="font-weight:700;">₹${c.totalSpend.toLocaleString('en-IN')}</td>
        <td class="tabular-nums" style="font-weight:700; color:${c.khataBalance > 0 ? 'var(--color-danger)' : 'var(--color-text-muted)'};">
          ₹${(c.khataBalance || 0).toLocaleString('en-IN')}
        </td>
        <td style="font-size:var(--font-size-xs); color:var(--color-text-muted);">${c.lastPurchase}</td>
        <td class="td-actions">
          <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); window.shopUI.openCustomerDrawer('${c.id}')">${dict.profileAiBtn}</button>
        </td>
      </tr>
    `).join("");
  }

  // ------------------------------------------------------------------------
  // SUPPLIERS RENDERER
  // ------------------------------------------------------------------------
  function renderSuppliersView() {
    const grid = document.getElementById("suppliersGrid");
    if (!grid) return;

    const lang = store.currentLanguage;
    const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;

    grid.innerHTML = store.suppliers.map(s => `
      <div class="supplier-card">
        <div class="supplier-card-header">
          <div>
            <div class="supplier-name">${s.name}</div>
            <div class="supplier-category">${s.category}</div>
          </div>
          <span class="badge badge-success">${dict.healthy === 'సరిపడా ఉంది' ? 'యాక్టివ్' : (dict.healthy === 'पर्याप्त' ? 'सक्रिय' : 'Active')}</span>
        </div>
        <div class="supplier-contact-row">
          <span>👤 ${s.contactPerson}</span>
          <span>•</span>
          <span>📞 ${s.phone}</span>
        </div>
        <div class="supplier-stats-row">
          <div>
            <div style="font-size:var(--font-size-xs); color:var(--color-text-muted);">${dict.totalPurchasedLabel}</div>
            <div style="font-weight:700; font-size:var(--font-size-base);">₹${s.totalPurchased.toLocaleString('en-IN')}</div>
          </div>
          <div>
            <div style="font-size:var(--font-size-xs); color:var(--color-text-muted);">${dict.pendingOrdersLabel}</div>
            <div style="font-weight:700; font-size:var(--font-size-base); color:var(--color-brand-accent);">${s.pendingOrders}</div>
          </div>
        </div>
        <div style="display:flex; gap:8px; margin-top:4px;">
          <button class="btn btn-sm btn-primary" style="flex:1;" onclick="window.shopUI.openRestockModal('PROD-001')">${dict.createPoBtn}</button>
          <a href="tel:${s.phone}" class="btn btn-sm btn-secondary" style="text-decoration:none;">${dict.callBtn}</a>
        </div>
      </div>
    `).join("");
  }

  // ------------------------------------------------------------------------
  // NOTIFICATIONS RENDERER
  // ------------------------------------------------------------------------
  function renderNotificationsView() {
    const container = document.getElementById("notificationsList");
    if (!container) return;

    const lang = store.currentLanguage;
    const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;

    container.innerHTML = store.notifications.map(n => {
      let badgeClass = "badge-neutral";
      if (n.severity === "urgent") badgeClass = "badge-danger";
      if (n.severity === "warning") badgeClass = "badge-warning";
      if (n.severity === "success") badgeClass = "badge-success";
      if (n.severity === "info") badgeClass = "badge-ai";

      return `
        <div class="card" style="padding:14px; display:flex; align-items:flex-start; justify-content:space-between; gap:14px; border-left: 3px solid ${n.read ? 'transparent' : 'var(--color-brand-accent)'};">
          <div style="display:flex; flex-direction:column; gap:4px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="badge ${badgeClass}">${n.category}</span>
              <span style="font-weight:700; font-size:var(--font-size-base);">${n.title}</span>
              <span style="font-size:var(--font-size-xs); color:var(--color-text-muted);">${n.time}</span>
            </div>
            <p style="font-size:var(--font-size-sm); color:var(--color-text-secondary); line-height:1.45;">${n.message}</p>
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            ${n.action === "open_ai_restock" ? `<button class="btn btn-sm btn-ai" onclick="window.shopUI.switchView('ai-assistant')">${dict.askAiBtn}</button>` : ''}
            <button class="btn btn-sm btn-ghost" onclick="window.shopStore.markNotificationAsRead('${n.id}')">✓ ${dict.healthy === 'సరిపడా ఉంది' ? 'చదివాను' : (dict.healthy === 'पर्याप्त' ? 'पढ़ा' : 'Read')}</button>
          </div>
        </div>
      `;
    }).join("");
  }

  function updateNotificationBadge() {
    const unread = store.notifications.filter(n => !n.read).length;
    const badge = document.getElementById("topbarNotifBadge");
    if (badge) {
      badge.innerText = unread;
      badge.style.display = unread > 0 ? "flex" : "none";
    }
  }

  // ------------------------------------------------------------------------
  // REPORTS VIEW RENDERER
  // ------------------------------------------------------------------------
  function renderReportsView() {
    const summaryBox = document.getElementById("reportSummaryContent");
    if (summaryBox) {
      const lang = store.currentLanguage;
      if (lang === "te") {
        summaryBox.innerHTML = `
          <strong>ఎగ్జిక్యూటివ్ స్టోర్ సారాంశం (24 అక్టోబర్, 2024):</strong><br/>
          శర్మ కిరాణా స్టోర్ ఈరోజు 47 రిటైల్ లావాదేవీల ద్వారా ₹18,450 స్థూల ఆదాయాన్ని నమోదు చేసింది (18.2% రోజువారీ వృద్ధి). 
          వార్డ్ 12లో పండుగ సీజన్ నిత్యావసర కొనుగోళ్ల వల్ల సోనా మసూరి బియ్యం అమ్మకాలు +21% మరియు ఫార్చ్యూన్ సన్‌ఫ్లవర్ ఆయిల్ అమ్మకాలు +18% పెరిగాయి. 
          AI కో-పైలట్ వారాంతపు రద్దీకి ముందే 6 వస్తువులు కనీస స్టాక్ కంటే తక్కువగా ఉన్నట్లు గుర్తించి, ABC డిస్ట్రిబ్యూటర్స్ మరియు బాలాజీ ట్రేడింగ్ కొరకు ఆటోమేటిక్ రీస్టాక్ ఆర్డర్లను సిద్ధం చేసింది.
        `;
      } else if (lang === "hi") {
        summaryBox.innerHTML = `
          <strong>दुकान का मुख्य सारांश (24 अक्टूबर 2024):</strong><br/>
          शर्मा किराना स्टोर ने आज 47 खुदरा बिक्री से ₹18,450 की कुल कमाई दर्ज की (18.2% दैनिक वृद्धि दर)। 
          त्योहारी सीजन के कारण वार्ड 12 में सोना मसूरी चावल की मांग में +21% और फॉर्च्यून सनफ्लावर ऑयल की मांग में +18% की भारी बढ़त दर्ज की गई। 
          AI को-पायलट ने सप्ताहांत की भीड़ से पहले 6 उत्पादों को कम स्टॉक श्रेणी में चिह्नित किया है और आवश्यक खरीद ऑर्डर तैयार कर दिए हैं।
        `;
      } else {
        summaryBox.innerHTML = `
          <strong>Executive Store Summary (Oct 24, 2024):</strong><br/>
          Sharma Kirana Store recorded a gross revenue of ₹18,450 across 47 retail transactions today, maintaining an 18.2% daily growth velocity. 
          Festive bulk staple purchases in Ward 12 resulted in an accelerated +21% run-rate on Sona Masoori Rice and +18% on Fortune Sunflower Oil. 
          The AI Co-pilot flagged 6 inventory items reaching critical safety stock before the upcoming weekend rush, with automatic restock purchase orders drafted for ABC Distributors and Balaji Trading Co.
        `;
      }
    }
  }

  // ------------------------------------------------------------------------
  // PROMPT CHIPS RENDERER
  // ------------------------------------------------------------------------
  function renderPromptChips() {
    const row = document.getElementById("quickPromptsRow");
    if (!row) return;

    const lang = store.currentLanguage;
    const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;

    row.innerHTML = `
      <span class="prompt-chip" data-prompt="${dict.chipRice}">${dict.chipRice}</span>
      <span class="prompt-chip" data-prompt="${dict.chipLowStock}">${dict.chipLowStock}</span>
      <span class="prompt-chip" data-prompt="${dict.chipOil}">${dict.chipOil}</span>
      <span class="prompt-chip" data-prompt="${dict.chipKhata}">${dict.chipKhata}</span>
      <span class="prompt-chip" data-prompt="${dict.chipSales}">${dict.chipSales}</span>
    `;

    row.querySelectorAll(".prompt-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        const query = chip.getAttribute("data-prompt") || chip.innerText.trim();
        aiEngine.processUserQuery(query, false);
      });
    });
  }

  // ------------------------------------------------------------------------
  // AI ASSISTANT CHAT THREAD RENDERER
  // ------------------------------------------------------------------------
  function renderAiChatThread(history) {
    const scrollContainer = document.getElementById("aiMessagesScroll");
    if (!scrollContainer) return;

    const lang = store.currentLanguage;
    const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;

    scrollContainer.innerHTML = history.map(msg => {
      if (msg.sender === "user") {
        return `
          <div class="chat-bubble-row user-row">
            <div class="chat-bubble user-bubble">${msg.text}</div>
            ${msg.detectedLang ? `<span class="detected-lang-tag">Detected: ${msg.detectedLang}</span>` : ''}
          </div>
        `;
      } else {
        // AI Message
        let toolsHtml = "";
        if (msg.tools && msg.tools.length > 0) {
          toolsHtml = `
            <div class="agentic-tools-box">
              <div class="agentic-box-header">
                <span class="agentic-box-title">✦ ${lang === 'te' ? 'AI ఏజెంట్ చర్యల వివరాలు' : (lang === 'hi' ? 'AI एजेंट टूल्स गतिविधि' : 'Agentic Tool Activity')}</span>
                <span style="font-size:var(--font-size-xs); color:var(--color-text-muted);">${lang === 'te' ? 'ఆటోమేటిక్ విశ్లేషణ' : (lang === 'hi' ? 'स्वचालित निष्पादन' : 'Autonomous Execution')}</span>
              </div>
              <div class="agentic-steps-list">
                ${msg.tools.map(t => `
                  <div class="agentic-step-item">
                    <span class="agentic-step-icon ${t.status === 'active' ? 'spinning' : ''}">
                      ${t.status === 'completed' ? '✓' : (t.status === 'active' ? '⚙' : '○')}
                    </span>
                    <span style="color:${t.status === 'completed' ? 'var(--color-text-primary)' : 'var(--color-text-muted)'}; font-weight:${t.status === 'completed' ? '500' : '400'};">
                      ${t.name}
                    </span>
                  </div>
                `).join("")}
              </div>
            </div>
          `;
        }

        let calcHtml = "";
        if (msg.calculation) {
          calcHtml = `
            <div class="calculation-card">
              <div class="calculation-summary" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'flex' : 'none'">
                <span>${dict.howCalculated}</span>
                <span style="font-size:var(--font-size-xs);">${dict.detailsToggle}</span>
              </div>
              <div class="calculation-body" style="display:flex;">
                <div class="calc-formula-row"><span>${dict.currentStockLabel}</span><span>${msg.calculation.currentStock}</span></div>
                <div class="calc-formula-row"><span>${dict.weeklyVelocityLabel}</span><span>${msg.calculation.weeklyVelocity}</span></div>
                <div class="calc-formula-row"><span>${dict.safetyThresholdLabel}</span><span>${msg.calculation.safetyThreshold}</span></div>
                <div class="calc-formula-row"><span>${dict.daysRemainingLabel}</span><span>${msg.calculation.daysRemaining}</span></div>
                <div class="calc-formula-row"><span>${dict.supplierLabel}</span><span>${msg.calculation.supplierName}</span></div>
                <div class="calc-formula-row"><span>${dict.recommendedOrderLabel}</span><span>${msg.calculation.recommendedOrder}</span></div>
                <div class="calc-formula-row"><span>${dict.estimatedCostLabel}</span><span>${msg.calculation.estimatedCost}</span></div>
              </div>
            </div>
          `;
        }

        let actionHtml = "";
        if (msg.actionCard) {
          const card = msg.actionCard;
          if (card.status === "approved") {
            actionHtml = `
              <div class="ai-action-card" style="border-color:var(--color-success-border); background:var(--color-success-surface);">
                <div style="display:flex; align-items:center; gap:8px; color:var(--color-success-dark); font-weight:700;">
                  <span>✓</span> <span>${lang === 'te' ? 'కొనుగోలు ఆర్డర్ ఆమోదించబడింది & పంపబడింది' : (lang === 'hi' ? 'खरीद ऑर्डर स्वीकृत व भेजा गया' : 'Purchase Order Approved & Transmitted')}</span>
                </div>
                <div style="font-size:var(--font-size-xs); color:var(--color-success-dark);">
                  ${card.quantity} ${card.unit} of ${card.product} (${card.supplier}).
                </div>
              </div>
            `;
          } else {
            actionHtml = `
              <div class="ai-action-card">
                <div class="ai-action-badge-row">
                  <span class="badge badge-ai">${dict.actionCardTitle}</span>
                  <span class="badge badge-warning">${dict.highPriority}</span>
                </div>
                <div class="ai-action-title">${lang === 'te' ? 'ఆర్డర్ చేయండి' : (lang === 'hi' ? 'ऑर्डर करें' : 'Order')} ${card.quantity} ${card.unit} of ${card.product}</div>
                <div class="ai-action-metrics">
                  <div>
                    <span class="ai-action-metric-label">${dict.supplierLabel}</span>
                    <div class="ai-action-metric-val">${card.supplier}</div>
                  </div>
                  <div>
                    <span class="ai-action-metric-label">${dict.estimatedCostLabel}</span>
                    <div class="ai-action-metric-val">₹${card.estimatedCost.toLocaleString('en-IN')}</div>
                  </div>
                </div>
                <div class="ai-action-buttons">
                  <button class="btn btn-sm btn-secondary" onclick="window.shopUI.openRestockModal('PROD-001')">${dict.reviewDetails}</button>
                  <button class="btn btn-sm btn-ai" onclick="window.shopAiEngine.approvePurchaseOrder('${card.id}')">${dict.approveAndOrder}</button>
                </div>
              </div>
            `;
          }
        }

        return `
          <div class="chat-bubble-row ai-row">
            <div class="chat-bubble ai-bubble">${msg.text}</div>
            ${toolsHtml}
            ${calcHtml}
            ${actionHtml}
          </div>
        `;
      }
    }).join("");

    scrollContainer.scrollTop = scrollContainer.scrollHeight;
  }

  // ------------------------------------------------------------------------
  // CHAT INPUT & PROMPTS
  // ------------------------------------------------------------------------
  function initAiChatInput() {
    const input = document.getElementById("aiChatInput");
    const sendBtn = document.getElementById("aiChatSendBtn");

    const handleSend = () => {
      const text = input.value.trim();
      if (!text) return;
      input.value = "";
      aiEngine.processUserQuery(text, false);
    };

    if (sendBtn) sendBtn.addEventListener("click", handleSend);
    if (input) {
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          handleSend();
        }
      });
    }
  }

  // ------------------------------------------------------------------------
  // LIVEKIT VOICE UI
  // ------------------------------------------------------------------------
  function initVoiceControls() {
    const micBtn = document.getElementById("voiceMicBtn");
    const muteBtn = document.getElementById("voiceMuteBtn");
    const interruptBtn = document.getElementById("voiceInterruptBtn");

    if (micBtn) {
      micBtn.addEventListener("click", () => {
        if (aiEngine.voiceState === "listening" || aiEngine.voiceState === "speaking") {
          aiEngine.interruptVoice();
        } else {
          aiEngine.startVoiceListening();
        }
      });
    }

    if (muteBtn) {
      muteBtn.addEventListener("click", () => {
        aiEngine.isMuted = !aiEngine.isMuted;
        const dict = TRANSLATIONS[store.currentLanguage] || TRANSLATIONS.en;
        muteBtn.innerText = aiEngine.isMuted ? dict.unmuteVoice : dict.muteVoice;
        ui.showToast(aiEngine.isMuted ? "Voice speech muted" : "Voice speech unmuted", "info");
      });
    }

    if (interruptBtn) {
      interruptBtn.addEventListener("click", () => {
        aiEngine.interruptVoice();
      });
    }
  }

  function updateVoiceUI(payload) {
    const micBtn = document.getElementById("voiceMicBtn");
    const statusTitle = document.getElementById("voiceStatusTitle");
    const statusSubtitle = document.getElementById("voiceStatusSubtitle");
    const waveform = document.getElementById("voiceWaveform");
    const avatarCard = document.getElementById("beyondPresenceAvatarCard");
    const avatarCaption = document.getElementById("avatarCaptionText");

    const state = payload.state;
    const dict = TRANSLATIONS[store.currentLanguage] || TRANSLATIONS.en;

    if (micBtn) {
      micBtn.classList.remove("listening", "speaking");
      if (state === "listening") micBtn.classList.add("listening");
      if (state === "speaking") micBtn.classList.add("speaking");
    }

    if (waveform) {
      if (state === "listening" || state === "speaking") {
        waveform.classList.add("voice-active");
      } else {
        waveform.classList.remove("voice-active");
      }
    }

    if (avatarCard) {
      if (state === "speaking") {
        avatarCard.classList.add("avatar-speaking");
      } else {
        avatarCard.classList.remove("avatar-speaking");
      }
    }

    if (statusTitle && statusSubtitle) {
      if (state === "ready") {
        statusTitle.innerText = dict.tapToSpeak;
        statusSubtitle.innerText = dict.voiceReadySub;
      } else if (state === "listening") {
        statusTitle.innerText = dict.listening;
        statusSubtitle.innerText = dict.listeningSub;
      } else if (state === "processing") {
        statusTitle.innerText = dict.understanding;
        statusSubtitle.innerText = payload.transcript ? `"${payload.transcript}"` : dict.understanding;
      } else if (state === "speaking") {
        statusTitle.innerText = dict.responding;
        statusSubtitle.innerText = dict.respondingSub;
      }
    }

    if (avatarCaption && payload.caption) {
      avatarCaption.innerText = `"${payload.caption}"`;
    }
  }

  // ------------------------------------------------------------------------
  // SEARCH & FILTER SYSTEM
  // ------------------------------------------------------------------------
  function initFiltersAndSearch() {
    const prodSearch = document.getElementById("prodSearchInput");
    const prodCat = document.getElementById("prodCategoryFilter");
    const prodStatus = document.getElementById("prodStatusFilter");

    const filterProducts = () => {
      const q = (prodSearch?.value || "").toLowerCase();
      const cat = prodCat?.value || "All";
      const st = prodStatus?.value || "All";

      const filtered = store.products.filter(p => {
        const matchQ = p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
        const matchCat = cat === "All" || p.category === cat;
        const matchSt = st === "All" || p.status === st;
        return matchQ && matchCat && matchSt;
      });

      renderProductsTable(filtered);
    };

    if (prodSearch) prodSearch.addEventListener("input", filterProducts);
    if (prodCat) prodCat.addEventListener("change", filterProducts);
    if (prodStatus) prodStatus.addEventListener("change", filterProducts);

    const invSearch = document.getElementById("invSearchInput");
    const invStatus = document.getElementById("invStatusFilter");

    const filterInventory = () => {
      const q = (invSearch?.value || "").toLowerCase();
      const st = invStatus?.value || "All";

      const filtered = store.products.filter(p => {
        const matchQ = p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
        const matchSt = st === "All" || p.status === st;
        return matchQ && matchSt;
      });

      renderInventoryTable(filtered);
    };

    if (invSearch) invSearch.addEventListener("input", filterInventory);
    if (invStatus) invStatus.addEventListener("change", filterInventory);

    const globalSearch = document.getElementById("globalSearchInput");
    if (globalSearch) {
      globalSearch.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          const q = globalSearch.value.trim();
          if (q) {
            ui.switchView("ai-assistant");
            aiEngine.processUserQuery(q, false);
            globalSearch.value = "";
          }
        }
      });
    }
  }

  // ------------------------------------------------------------------------
  // ROLE SWITCHER & PERMISSIONS
  // ------------------------------------------------------------------------
  function initSettingsRoleSwitcher() {
    const roleSelect = document.getElementById("settingsRoleSelect");
    if (roleSelect) {
      roleSelect.value = store.currentUserRole;
      roleSelect.addEventListener("change", (e) => {
        store.setRole(e.target.value);
        ui.showToast(`Switched active role to "${e.target.value.toUpperCase()}"`, "info");
      });
    }
  }

  function updateRoleUI(role) {
    const badge = document.getElementById("topbarRoleBadge");
    if (badge) {
      const dict = TRANSLATIONS[store.currentLanguage] || TRANSLATIONS.en;
      badge.innerText = role === 'owner' ? dict.userRoleOwner : role.charAt(0).toUpperCase() + role.slice(1);
    }
    const select = document.getElementById("settingsRoleSelect");
    if (select) select.value = role;
  }

  // ------------------------------------------------------------------------
  // 100% COMPLETE MULTILINGUAL UI APPLICATION
  // ------------------------------------------------------------------------
  function applyTranslations(lang) {
    document.documentElement.lang = lang;
    const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;

    // 1. Translate every element with [data-i18n]
    document.querySelectorAll("[data-i18n]").forEach(elem => {
      const key = elem.getAttribute("data-i18n");
      if (dict[key] !== undefined) {
        if (dict[key].includes("<") && dict[key].includes(">")) {
          elem.innerHTML = dict[key];
        } else {
          elem.innerText = dict[key];
        }
      }
    });

    // 2. Translate every input placeholder with [data-i18n-ph]
    document.querySelectorAll("[data-i18n-ph]").forEach(elem => {
      const key = elem.getAttribute("data-i18n-ph");
      if (dict[key] !== undefined) {
        elem.setAttribute("placeholder", dict[key]);
      }
    });

    // 3. Update topbar and login language buttons
    document.querySelectorAll(".lang-btn").forEach(btn => {
      if (btn.getAttribute("data-lang") === lang) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    // 4. Update AI initial welcome message if not overridden
    if (aiEngine.chatHistory.length > 0 && aiEngine.chatHistory[0].id === "msg-welcome") {
      aiEngine.chatHistory[0].text = dict.aiWelcome;
    }

    // 5. Update Beyond Presence Avatar caption
    const avatarCaption = document.getElementById("avatarCaptionText");
    if (avatarCaption) {
      if (lang === "te") {
        avatarCaption.innerText = '"శుభోదయం. శర్మ కిరాణా స్టోర్‌లో ఈరోజు ₹18,450 అమ్మకాలు జరిగాయి."';
      } else if (lang === "hi") {
        avatarCaption.innerText = '"शुभ प्रभात। शर्मा किराना स्टोर में आज ₹18,450 की कुल बिक्री हुई।"';
      } else {
        avatarCaption.innerText = '"Good morning. Sharma Kirana Store had ₹18,450 in revenue today."';
      }
    }

    // 6. Re-render all views and dynamic tables in the chosen language
    renderAllViews();
    renderAiChatThread(aiEngine.chatHistory);

    ui.showToast(`Language switched to ${lang === 'te' ? 'తెలుగు (Telugu)' : (lang === 'hi' ? 'हिंदी (Hindi)' : 'English')}`, "info");
  }
});
