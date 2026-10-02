/* ==========================================================================
   ShopSahayak - AI Agentic Business Assistant & Voice AI Engine
   Agentic Tool Execution, LiveKit Voice Simulation, Beyond Presence Avatar
   ========================================================================== */

class ShopSahayakAIEngine {
  constructor(store) {
    this.store = store;
    this.voiceState = "ready"; // 'ready' | 'listening' | 'processing' | 'speaking'
    this.isMuted = false;
    this.activeSpeechUtterance = null;
    this.chatHistory = [];
    this.onStateChange = null;

    // Load initial greeting message
    this.initWelcomeMessage();
  }

  initWelcomeMessage() {
    this.chatHistory = [
      {
        id: "msg-welcome",
        sender: "ai",
        text: "Namaste Ravi garu! Good morning. I'm your ShopSahayak business operating assistant. Sharma Kirana Store currently has 6 items below safety stock, and rice demand is up by +21%. You can ask me anything about your inventory, sales, or supplier reorders in English, Telugu, or Hindi.",
        detectedLang: "English",
        tools: null,
        calculation: null,
        actionCard: null
      }
    ];
  }

  detectLanguage(query) {
    const teluguWords = ["anna", "entha", "undi", "babu", "choodu", "ivvandi", "cheppandi", "ledu", "evaru", "kavali"];
    const hindiWords = ["aaj", "kitna", "hai", "batao", "bhejo", "kaisa", "daal", "chawal", "khata", "dukan", "karein"];
    
    const lower = query.toLowerCase();
    const hasTelugu = teluguWords.some(w => lower.includes(w)) || /[\u0C00-\u0C7F]/.test(query);
    const hasHindi = hindiWords.some(w => lower.includes(w)) || /[\u0900-\u097F]/.test(query);

    if (hasTelugu && /[a-zA-Z]/.test(query)) {
      return "Telugu + English";
    } else if (hasTelugu) {
      return "Telugu (తెలుగు)";
    } else if (hasHindi && /[a-zA-Z]/.test(query)) {
      return "Hindi + English (Hinglish)";
    } else if (hasHindi) {
      return "Hindi (हिंदी)";
    }
    return "English";
  }

  async processUserQuery(queryText, isVoice = false) {
    const detectedLang = this.detectLanguage(queryText);

    // Add user message to conversation
    const userMsgId = "msg-user-" + Date.now();
    this.chatHistory.push({
      id: userMsgId,
      sender: "user",
      text: queryText,
      detectedLang: detectedLang
    });

    if (this.onStateChange) this.onStateChange("message_added", { history: this.chatHistory });

    // Show AI typing / thinking indicator
    if (this.onStateChange) this.onStateChange("ai_thinking", true);

    // Simulate Agentic tool workflow
    const queryLower = queryText.toLowerCase();

    // MAIN HACKATHON DEMO FLOW: Rice stock query (Telugu/English code-mix)
    if (queryLower.includes("rice") || queryLower.includes("బియ్యం") || queryLower.includes("chawal")) {
      await this.executeRiceStockAgenticWorkflow(detectedLang, isVoice);
    } else if (queryLower.includes("oil") || queryLower.includes("నూనె") || queryLower.includes("tel")) {
      await this.executeOilAgenticWorkflow(detectedLang, isVoice);
    } else if (queryLower.includes("low stock") || queryLower.includes("తక్కువ") || queryLower.includes("कम")) {
      await this.executeLowStockSummaryWorkflow(detectedLang, isVoice);
    } else if (queryLower.includes("report") || queryLower.includes("రిపోర్ట్") || queryLower.includes("sales")) {
      await this.executeSalesAnalysisWorkflow(detectedLang, isVoice);
    } else if (queryLower.includes("khata") || queryLower.includes("customer") || queryLower.includes("ఉధార్")) {
      await this.executeKhataAnalysisWorkflow(detectedLang, isVoice);
    } else {
      await this.executeGeneralRetailWorkflow(queryText, detectedLang, isVoice);
    }
  }

  // ------------------------------------------------------------------------
  // HACKATHON CORE DEMO WORKFLOW: RICE STOCK & REORDER AGENT
  // ------------------------------------------------------------------------
  async executeRiceStockAgenticWorkflow(detectedLang, isVoice) {
    const riceProd = this.store.products.find(p => p.id === "PROD-001");
    const stockQty = riceProd ? riceProd.stock : 18;

    // Step 1: Agentic activity timeline
    const tools = [
      { name: "Checking inventory for 'Sona Masoori Rice'...", status: "active", icon: "search" },
      { name: "Analyzing 30-day sales velocity...", status: "pending", icon: "chart" },
      { name: "Calculating restocking demand model...", status: "pending", icon: "calculator" },
      { name: "Fetching supplier quotes from ABC Distributors...", status: "pending", icon: "truck" }
    ];

    const aiMsgId = "msg-ai-" + Date.now();
    const aiMessage = {
      id: aiMsgId,
      sender: "ai",
      text: `You currently have ${stockQty} kg of Sona Masoori Raw Rice in stock. Your average weekly rice sales are 65 kg (approx 9.3 kg/day). Based on recent festive demand, your current stock may run low within 48 hours.`,
      detectedLang: detectedLang,
      tools: tools,
      calculation: {
        currentStock: `${stockQty} kg`,
        weeklyVelocity: "65 kg / week (9.3 kg / day)",
        safetyThreshold: "30 kg",
        daysRemaining: `${Math.round(stockQty / 9.3)} days`,
        recommendedOrder: "100 kg (4 bags of 25kg)",
        supplierName: "ABC Distributors (Mahesh Agarwal)",
        estimatedCost: "₹8,400 (@ ₹84/kg wholesale bulk rate)"
      },
      actionCard: {
        id: "action-po-rice",
        title: "Recommended Replenishment Order",
        product: "Sona Masoori Raw Rice (25kg Bags)",
        quantity: 100,
        unit: "kg",
        supplier: "ABC Distributors",
        estimatedCost: 8400,
        status: "pending_approval"
      }
    };

    this.chatHistory.push(aiMessage);
    if (this.onStateChange) this.onStateChange("ai_thinking", false);
    if (this.onStateChange) this.onStateChange("message_added", { history: this.chatHistory });

    // Animate tools step-by-step
    await this.delay(400);
    tools[0].status = "completed";
    tools[0].name = `✓ Checked inventory: Found ${stockQty} kg in stock (Below min safety level 30 kg)`;
    tools[1].status = "active";
    if (this.onStateChange) this.onStateChange("message_updated", { messageId: aiMsgId });

    await this.delay(450);
    tools[1].status = "completed";
    tools[1].name = "✓ Analyzed 30-day velocity: 65 kg/week (+21% festival surge)";
    tools[2].status = "active";
    if (this.onStateChange) this.onStateChange("message_updated", { messageId: aiMsgId });

    await this.delay(400);
    tools[2].status = "completed";
    tools[2].name = "✓ Recommendation generated: Order 100 kg to prevent weekend stockout";
    tools[3].status = "completed";
    tools[3].name = "✓ Supplier verified: ABC Distributors (₹8,400, Net 7 Days)";
    if (this.onStateChange) this.onStateChange("message_updated", { messageId: aiMsgId });

    // Voice response if voice mode
    const spokenText = `You currently have ${stockQty} kg of Sona Masoori Rice. At your weekly sales rate of 65 kg, your stock will run out in two days. I recommend ordering 100 kg from ABC Distributors.`;
    this.speakText(spokenText);
  }

  // ------------------------------------------------------------------------
  // COOKING OIL WORKFLOW
  // ------------------------------------------------------------------------
  async executeOilAgenticWorkflow(detectedLang, isVoice) {
    const tools = [
      { name: "Checking Fortune Sunflower Oil 1L stock...", status: "completed", icon: "search" },
      { name: "Analyzing supplier bundle discount...", status: "completed", icon: "truck" }
    ];

    const aiMsgId = "msg-ai-" + Date.now();
    const aiMessage = {
      id: aiMsgId,
      sender: "ai",
      text: "Fortune Sunflower Oil is currently at 4 pouches (critical alert). Daily sales velocity is 8.5 pouches. Distributor Balaji Trading Co is offering a 4% volume rebate if you order a 25-pouch bundle today.",
      detectedLang: detectedLang,
      tools: tools,
      calculation: {
        currentStock: "4 pouches",
        safetyThreshold: "25 pouches",
        recommendedOrder: "25 pouches",
        supplierName: "Balaji Trading Co",
        estimatedCost: "₹3,200 (Savings: ₹130)"
      },
      actionCard: {
        id: "action-po-oil",
        title: "Reorder Fortune Sunflower Oil",
        product: "Fortune Sunlite Sunflower Oil (1L)",
        quantity: 25,
        unit: "pouches",
        supplier: "Balaji Trading Co",
        estimatedCost: 3200,
        status: "pending_approval"
      }
    };

    this.chatHistory.push(aiMessage);
    if (this.onStateChange) this.onStateChange("ai_thinking", false);
    if (this.onStateChange) this.onStateChange("message_added", { history: this.chatHistory });
    this.speakText("Fortune Sunflower oil has only 4 pouches left. I recommend ordering 25 pouches to get the distributor discount.");
  }

  // ------------------------------------------------------------------------
  // LOW STOCK AUDIT WORKFLOW
  // ------------------------------------------------------------------------
  async executeLowStockSummaryWorkflow(detectedLang, isVoice) {
    const lowStockItems = this.store.products.filter(p => p.status === "low" || p.status === "out");
    const summary = lowStockItems.map(p => `• ${p.name}: ${p.stock} ${p.unit} remaining (Min: ${p.minStock})`).join("\n");

    const aiMsgId = "msg-ai-" + Date.now();
    this.chatHistory.push({
      id: aiMsgId,
      sender: "ai",
      text: `There are currently ${lowStockItems.length} items that need your immediate restocking attention:\n\n${summary}\n\nWould you like me to draft batch purchase orders for your primary suppliers?`,
      detectedLang: detectedLang,
      tools: [
        { name: "Scanned 15 store catalogue SKUs", status: "completed", icon: "search" },
        { name: `Identified ${lowStockItems.length} SKUs below minimum threshold`, status: "completed", icon: "alert" }
      ],
      calculation: null,
      actionCard: null
    });

    if (this.onStateChange) this.onStateChange("ai_thinking", false);
    if (this.onStateChange) this.onStateChange("message_added", { history: this.chatHistory });
    this.speakText(`You have ${lowStockItems.length} products below minimum stock level including Rice, Fortune Oil, and Maggi Noodles.`);
  }

  // ------------------------------------------------------------------------
  // SALES ANALYSIS WORKFLOW
  // ------------------------------------------------------------------------
  async executeSalesAnalysisWorkflow(detectedLang, isVoice) {
    const aiMsgId = "msg-ai-" + Date.now();
    this.chatHistory.push({
      id: aiMsgId,
      sender: "ai",
      text: `Today's revenue is ₹${this.store.metrics.todayRevenue.toLocaleString('en-IN')} across ${this.store.metrics.todayOrders} customer orders. Estimated gross profit is ₹${this.store.metrics.estimatedProfit.toLocaleString('en-IN')} (approx 33.8% margin). Highest velocity was between 6:00 PM and 8:30 PM.`,
      detectedLang: detectedLang,
      tools: [
        { name: "Compiled live POS ledger entries", status: "completed", icon: "chart" },
        { name: "Calculated gross margin and top velocity SKUs", status: "completed", icon: "check" }
      ],
      calculation: null,
      actionCard: null
    });

    if (this.onStateChange) this.onStateChange("ai_thinking", false);
    if (this.onStateChange) this.onStateChange("message_added", { history: this.chatHistory });
    this.speakText(`Today's revenue is ₹${this.store.metrics.todayRevenue.toLocaleString('en-IN')} with ${this.store.metrics.todayOrders} orders. Profit margin is running strong at 33 percent.`);
  }

  // ------------------------------------------------------------------------
  // KHATA / CUSTOMER ANALYSIS WORKFLOW
  // ------------------------------------------------------------------------
  async executeKhataAnalysisWorkflow(detectedLang, isVoice) {
    const totalKhata = this.store.customers.reduce((acc, c) => acc + (c.khataBalance || 0), 0);
    const topKhata = this.store.customers.filter(c => c.khataBalance > 0);

    const aiMsgId = "msg-ai-" + Date.now();
    this.chatHistory.push({
      id: aiMsgId,
      sender: "ai",
      text: `Total outstanding Khata (Udhar) across regular customers is ₹${totalKhata.toLocaleString('en-IN')}. The largest outstanding balance is Mohammed Irfan at ₹4,500, followed by Suresh Gupta at ₹2,800. I can draft friendly WhatsApp payment reminders if you approve.`,
      detectedLang: detectedLang,
      tools: [
        { name: "Audited customer ledger balances", status: "completed", icon: "users" },
        { name: "Verified payment history and credit cycles", status: "completed", icon: "check" }
      ],
      calculation: null,
      actionCard: null
    });

    if (this.onStateChange) this.onStateChange("ai_thinking", false);
    if (this.onStateChange) this.onStateChange("message_added", { history: this.chatHistory });
    this.speakText(`Total outstanding customer khata is ₹${totalKhata.toLocaleString('en-IN')}. Would you like me to send payment reminders?`);
  }

  // ------------------------------------------------------------------------
  // GENERAL FALLBACK WORKFLOW
  // ------------------------------------------------------------------------
  async executeGeneralRetailWorkflow(query, detectedLang, isVoice) {
    const aiMsgId = "msg-ai-" + Date.now();
    this.chatHistory.push({
      id: aiMsgId,
      sender: "ai",
      text: `I've analyzed your question regarding "${query}". Sharma Kirana Store operations are currently healthy with ₹18,450 daily revenue. Let me know if you want me to check specific stock levels, reorder from distributors, or generate a GST sales summary.`,
      detectedLang: detectedLang,
      tools: [
        { name: "Parsed retail natural-language query", status: "completed", icon: "check" }
      ],
      calculation: null,
      actionCard: null
    });

    if (this.onStateChange) this.onStateChange("ai_thinking", false);
    if (this.onStateChange) this.onStateChange("message_added", { history: this.chatHistory });
  }

  // ------------------------------------------------------------------------
  // APPROVE PURCHASE ORDER ACTION
  // ------------------------------------------------------------------------
  approvePurchaseOrder(actionCardId) {
    // Find the message with this action card
    const msg = this.chatHistory.find(m => m.actionCard && m.actionCard.id === actionCardId);
    if (!msg || !msg.actionCard) return;

    const { product, quantity, supplier } = msg.actionCard;
    
    // Execute real store update
    if (actionCardId === "action-po-rice") {
      this.store.restockProduct("PROD-001", quantity, supplier);
    } else if (actionCardId === "action-po-oil") {
      this.store.restockProduct("PROD-003", quantity, supplier);
    }

    // Mark card as approved
    msg.actionCard.status = "approved";

    // Add confirmation message
    this.chatHistory.push({
      id: "msg-confirm-" + Date.now(),
      sender: "ai",
      text: `✓ Purchase order confirmed! ${quantity} ${msg.actionCard.unit} of ${product} has been ordered from ${supplier}. Inventory stock and dashboard health have been automatically updated.`,
      detectedLang: "System",
      tools: [
        { name: "Generated PO-8831 sent to ABC Distributors", status: "completed", icon: "check" },
        { name: "Store inventory updated (+100 kg Sona Masoori Rice)", status: "completed", icon: "check" },
        { name: "Dashboard stock health recalculated: Low Stock reduced to 5", status: "completed", icon: "check" }
      ],
      calculation: null,
      actionCard: null
    });

    if (this.onStateChange) this.onStateChange("message_added", { history: this.chatHistory });
    this.speakText(`Purchase order has been created. One hundred kilograms of Sona Masoori Rice is recorded, and store inventory is updated.`);
  }

  // ------------------------------------------------------------------------
  // LIVEKIT VOICE AI SIMULATION
  // ------------------------------------------------------------------------
  startVoiceListening() {
    this.voiceState = "listening";
    if (this.onStateChange) this.onStateChange("voice_state", { state: "listening" });

    // Use Web Speech Recognition if available in the browser!
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = "en-IN"; // Indian English / Hinglish / Telugu code-switch
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          this.voiceState = "processing";
          if (this.onStateChange) this.onStateChange("voice_state", { state: "processing", transcript });
          setTimeout(() => {
            this.processUserQuery(transcript, true);
          }, 600);
        };

        recognition.onerror = () => {
          this.fallbackVoiceSimulation();
        };

        recognition.start();
        return;
      } catch (e) {
        // fallback
      }
    }

    this.fallbackVoiceSimulation();
  }

  fallbackVoiceSimulation() {
    // Simulated Voice prompt for the hackathon demo
    setTimeout(() => {
      this.voiceState = "processing";
      const sampleVoiceQuery = "Anna, rice stock entha undi?";
      if (this.onStateChange) this.onStateChange("voice_state", { state: "processing", transcript: sampleVoiceQuery });
      
      setTimeout(() => {
        this.processUserQuery(sampleVoiceQuery, true);
      }, 700);
    }, 1800);
  }

  interruptVoice() {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    this.voiceState = "ready";
    if (this.onStateChange) this.onStateChange("voice_state", { state: "ready" });
  }

  speakText(text) {
    if (this.isMuted) return;

    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      
      // Try to choose an Indian English voice if present
      const voices = window.speechSynthesis.getVoices();
      const inVoice = voices.find(v => v.lang.includes("en-IN") || v.lang.includes("hi-IN"));
      if (inVoice) utterance.voice = inVoice;

      this.voiceState = "speaking";
      if (this.onStateChange) this.onStateChange("voice_state", { state: "speaking", caption: text });

      utterance.onend = () => {
        this.voiceState = "ready";
        if (this.onStateChange) this.onStateChange("voice_state", { state: "ready" });
      };

      utterance.onerror = () => {
        this.voiceState = "ready";
        if (this.onStateChange) this.onStateChange("voice_state", { state: "ready" });
      };

      window.speechSynthesis.speak(utterance);
    } else {
      // Audio fallback simulation
      this.voiceState = "speaking";
      if (this.onStateChange) this.onStateChange("voice_state", { state: "speaking", caption: text });
      setTimeout(() => {
        this.voiceState = "ready";
        if (this.onStateChange) this.onStateChange("voice_state", { state: "ready" });
      }, 3500);
    }
  }

  delay(ms) {
    return new Promise(res => setTimeout(res, ms));
  }
}

window.shopAiEngine = new ShopSahayakAIEngine(window.shopStore);
