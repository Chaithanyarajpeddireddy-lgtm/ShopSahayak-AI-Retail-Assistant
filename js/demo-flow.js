/* ==========================================================================
   ShopSahayak - Interactive Hackathon Demo Flow Orchestrator
   Executes the exact 13-step demonstration sequence specified in the prompt
   ========================================================================== */

class HackathonDemoFlow {
  constructor(store, aiEngine, ui) {
    this.store = store;
    this.aiEngine = aiEngine;
    this.ui = ui;
    this.currentStep = 1;
    this.totalSteps = 13;
    this.isPlaying = false;

    this.steps = [
      {
        num: 1,
        title: "Owner Session Active",
        desc: "Ravi Sharma (Owner) logs in to Sharma Kirana Store SaaS operating system.",
        action: () => {
          if (window.ShopAuth && !window.ShopAuth.hasActiveSession()) {
            window.ShopAuth.completeLogin("demo_flow");
          }
          this.store.setRole("owner");
          this.ui.switchView("overview");
        }
      },
      {
        num: 2,
        title: "Dashboard Overview",
        desc: "Review Today's Revenue (₹18,450), Orders (47), Estimated Profit (₹2,723 • 14.8%), and Low Stock (7).",
        action: () => {
          this.ui.switchView("overview");
        }
      },
      {
        num: 3,
        title: "AI Business Insight Triggers",
        desc: "AI Insight detects: '7 products are below their minimum stock level. Rice demand increased +21%'.",
        action: () => {
          this.ui.switchView("overview");
          const banner = document.getElementById("dashAiBanner");
          if (banner) {
            banner.style.boxShadow = "0 0 0 2px #4338ca";
            setTimeout(() => banner.style.boxShadow = "", 2000);
          }
        }
      },
      {
        num: 4,
        title: "Owner Opens AI Assistant",
        desc: "Owner switches to the dedicated ShopSahayak AI Business Command Center.",
        action: () => {
          this.ui.switchView("ai-assistant");
        }
      },
      {
        num: 5,
        title: "Owner Speaks via LiveKit Voice",
        desc: "Owner speaks natural Telugu/English code-mixed query: 'Anna, rice stock entha undi?'",
        action: () => {
          this.ui.switchView("ai-assistant");
          const input = document.getElementById("aiChatInput");
          if (input) input.value = "Anna, rice stock entha undi?";
          // Scripted voice query path: shows waveform and language recognition without microphone permission prompt
          this.aiEngine.simulateVoiceQuery("Anna, rice stock entha undi?");
        }
      },
      {
        num: 6,
        title: "LiveKit Handles Real-time Stream",
        desc: "Voice visualizer shows active waveform & language recognition ('Detected: Telugu + English').",
        action: () => {
          // Handled by voiceState transition
        }
      },
      {
        num: 7,
        title: "AI Assistant Responds",
        desc: "AI announces: 'You currently have 18 kg of rice in stock (below 30 kg safety threshold)'.",
        action: () => {
          // Message appears in chat history
        }
      },
      {
        num: 8,
        title: "Agentic Tool Execution Timeline",
        desc: "Visible tool execution: Checked inventory, analyzed 30-day velocity (9.3 kg/day), calculated demand.",
        action: () => {
          // Highlight tools box
        }
      },
      {
        num: 9,
        title: "Restocking Recommendation Generated",
        desc: "AI recommends replenishing 100 kg Sona Masoori Rice from ABC Distributors for ₹5,400.",
        action: () => {
          // Action card visible with [Review] and [Approve] buttons
        }
      },
      {
        num: 10,
        title: "Owner Approves Purchase Order",
        desc: "Owner approves purchase order through security confirmation dialog.",
        action: () => {
          this.ui.switchView("ai-assistant");
          // In auto-play, automatically confirm after 1200ms visible pause; in manual stepping, presenter confirms
          const autoConfirmDelay = this.isPlaying ? 1200 : 0;
          this.aiEngine.approvePurchaseOrder("action-po-rice", autoConfirmDelay);
        }
      },
      {
        num: 11,
        title: "Purchase Order Confirmed",
        desc: "AI displays confirmation badge: '✓ Purchase order PO-8831 sent to ABC Distributors'.",
        action: () => {
          this.ui.switchView("ai-assistant");
          this.ui.showToast("Purchase order PO-8831 created successfully!", "success");
        }
      },
      {
        num: 12,
        title: "Live Store Inventory Updates",
        desc: "Inventory stock automatically increases by 100 kg (from 18 kg to 118 kg) in real time!",
        action: () => {
          this.ui.switchView("inventory");
        }
      },
      {
        num: 13,
        title: "Updated Business Insights Generated",
        desc: "Low stock count drops from 7 to 6, rice status changes to Healthy, and updated store report is ready!",
        action: () => {
          this.ui.switchView("overview");
          this.ui.showToast("Complete Hackathon Demo Flow Executed Successfully!", "success");
        }
      }
    ];
  }

  init() {
    this.updateBannerUI();

    const nextBtn = document.getElementById("demoNextBtn");
    const prevBtn = document.getElementById("demoPrevBtn");
    const autoBtn = document.getElementById("demoAutoBtn");

    if (nextBtn) nextBtn.addEventListener("click", () => this.nextStep());
    if (prevBtn) prevBtn.addEventListener("click", () => this.prevStep());
    if (autoBtn) autoBtn.addEventListener("click", () => this.toggleAutoPlay());
  }

  updateBannerUI() {
    const stepObj = this.steps[this.currentStep - 1];
    const badge = document.getElementById("demoStepBadge");
    const text = document.getElementById("demoStepText");
    const dict = (typeof TRANSLATIONS !== "undefined" && TRANSLATIONS[this.store.currentLanguage]) ? TRANSLATIONS[this.store.currentLanguage] : null;
    const prefix = dict && dict.demoStepPrefix ? dict.demoStepPrefix : "Step";

    if (badge) badge.innerText = `${prefix} ${this.currentStep}/${this.totalSteps}`;
    if (text) {
      text.innerHTML = `<strong>${stepObj.title}:</strong> ${stepObj.desc}`;
    }
  }

  nextStep() {
    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
      const stepObj = this.steps[this.currentStep - 1];
      this.updateBannerUI();
      if (stepObj.action) stepObj.action();
    }
  }

  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
      const stepObj = this.steps[this.currentStep - 1];
      this.updateBannerUI();
      if (stepObj.action) stepObj.action();
    }
  }

  async toggleAutoPlay() {
    if (window.ShopAuth && !window.ShopAuth.hasActiveSession()) {
      window.ShopAuth.completeLogin("demo_flow");
    }
    this.isPlaying = !this.isPlaying;
    const btn = document.getElementById("demoAutoBtn");
    if (btn) btn.innerText = this.isPlaying ? "Pause Demo" : "Auto Play Demo";

    while (this.isPlaying && this.currentStep < this.totalSteps) {
      await new Promise(r => setTimeout(r, 2600));
      if (!this.isPlaying) break;
      this.nextStep();
    }

    if (this.currentStep >= this.totalSteps) {
      this.isPlaying = false;
      if (btn) btn.innerText = "Replay Demo";
    }
  }
}

window.shopDemoFlow = new HackathonDemoFlow(window.shopStore, window.shopAiEngine, window.shopUI);
