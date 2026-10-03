/* ==========================================================================
   ShopSahayak - Shared Reusable Camera Module
   Handles camera lifecycle, stream safety, and localized friendly errors.
   Strict safety: All tracks stopped on exit/hide/blur. Zero frames stored.
   ========================================================================== */

class ShopCameraManager {
  constructor() {
    this.activeStream = null;
    this.activeVideoEl = null;
    this.lastErrorCode = null;
    this.stopListeners = [];
    this.errorListeners = [];

    this._bindLifecycleEvents();
  }

  /**
   * Bind lifecycle listeners to guarantee camera light turns off immediately
   * when user switches tabs, minimizes window, or navigates away.
   */
  _bindLifecycleEvents() {
    // Visibility change: tab hidden -> stop camera immediately
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && this.isActive()) {
        this.stopCamera();
      }
    });

    // Page hide / unload
    window.addEventListener("pagehide", () => {
      this.stopCamera();
    });
    window.addEventListener("beforeunload", () => {
      this.stopCamera();
    });

    // Auto-hook into shopStore view changes if available
    if (window.shopStore && typeof window.shopStore.subscribe === "function") {
      window.shopStore.subscribe((event) => {
        if (event === "view_changed" || event === "role_changed") {
          if (this.isActive()) {
            this.stopCamera();
          }
        }
      });
    }
  }

  /**
   * Check if current context is secure (HTTPS or localhost) and mediaDevices is supported
   */
  isSupported() {
    const isLocalhost = Boolean(
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname === "[::1]" ||
      window.location.protocol === "file:"
    );
    const isSecure = window.isSecureContext || isLocalhost || window.location.protocol === "https:";
    return Boolean(isSecure && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === "function");
  }

  /**
   * Start camera on a given HTMLVideoElement
   * @param {HTMLVideoElement} videoEl - Target video element to stream to
   * @param {MediaStreamConstraints} constraints - Optional user/environment constraints
   * @returns {Promise<{success: boolean, stream?: MediaStream, error?: string, message?: string, fallbackAction?: string}>}
   */
  async startCamera(videoEl, constraints = {}) {
    // Stop any existing stream before starting a new one
    this.stopCamera();
    this.lastErrorCode = null;

    // Increment request token for race cancellation
    this.startToken = (this.startToken || 0) + 1;
    const currentToken = this.startToken;

    if (!videoEl) {
      const err = { success: false, error: "GENERIC_ERROR", message: this.getLocalizedMessage("GENERIC_ERROR") };
      return err;
    }

    if (!this.isSupported()) {
      const errCode = "INSECURE_CONTEXT";
      this.lastErrorCode = errCode;
      const errResult = {
        success: false,
        error: errCode,
        message: this.getLocalizedMessage(errCode),
        fallbackAction: this.getLocalizedFallback(errCode)
      };
      this._notifyError(errResult);
      return errResult;
    }

    const defaultConstraints = {
      video: {
        facingMode: constraints.video && constraints.video.facingMode ? constraints.video.facingMode : "environment",
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    };

    const finalConstraints = Object.assign({}, defaultConstraints, constraints);

    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(finalConstraints);
      } catch (firstErr) {
        // If ideal constraints failed with OverconstrainedError, retry with basic { video: true }
        if (firstErr.name === "OverconstrainedError" || firstErr.name === "ConstraintNotSatisfiedError") {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        } else {
          throw firstErr;
        }
      }

      // If camera was stopped or cancelled while waiting for getUserMedia, stop tracks immediately!
      if (this.startToken !== currentToken) {
        if (stream) {
          try {
            stream.getTracks().forEach(t => t.stop());
          } catch (e) {}
        }
        return { success: false, error: "CANCELLED", message: "Camera initialization was cancelled." };
      }

      this.activeStream = stream;
      this.activeVideoEl = videoEl;

      videoEl.srcObject = stream;
      videoEl.setAttribute("playsinline", "true");
      videoEl.muted = true;

      // Handle play promise safely
      try {
        await videoEl.play();
      } catch (playErr) {
        // Some browsers require explicit user interaction or muted attribute
        videoEl.muted = true;
        await videoEl.play();
      }

      // Check again if cancelled during video play
      if (this.startToken !== currentToken) {
        this.stopCamera(videoEl);
        return { success: false, error: "CANCELLED", message: "Camera initialization was cancelled." };
      }

      return { success: true, stream: stream };
    } catch (err) {
      if (this.startToken !== currentToken) {
        return { success: false, error: "CANCELLED", message: "Camera initialization was cancelled." };
      }
      const errCode = this._mapDomException(err);
      this.lastErrorCode = errCode;
      const errResult = {
        success: false,
        error: errCode,
        rawName: err.name,
        message: this.getLocalizedMessage(errCode),
        fallbackAction: this.getLocalizedFallback(errCode)
      };
      this._notifyError(errResult);
      return errResult;
    }
  }

  /**
   * Stop active camera stream and release all hardware resources.
   * Ensures camera indicator light turns off.
   * @param {HTMLVideoElement} [videoEl] - Optional specific video element to detach
   */
  stopCamera(videoEl) {
    // Invalidate any pending startCamera call
    this.startToken = (this.startToken || 0) + 1;
    const el = videoEl || this.activeVideoEl;

    if (this.activeStream) {
      try {
        const tracks = this.activeStream.getTracks();
        tracks.forEach(track => {
          try {
            track.stop();
          } catch (e) {
            // Ignore individual track stop error
          }
        });
      } catch (e) {
        // Ignore stream stop error
      }
      this.activeStream = null;
    }

    if (el) {
      try {
        el.pause();
        el.srcObject = null;
      } catch (e) {
        // Ignore video pause error
      }
    }

    if (this.activeVideoEl === el) {
      this.activeVideoEl = null;
    }

    this._notifyStop();
  }

  /**
   * Check if camera is currently streaming
   * @returns {boolean}
   */
  isActive() {
    if (!this.activeStream) return false;
    const tracks = this.activeStream.getVideoTracks();
    return tracks.length > 0 && tracks.some(t => t.readyState === "live" && t.enabled);
  }

  /**
   * Map DOMExceptions to standardized error codes
   */
  _mapDomException(err) {
    if (!err) return "GENERIC_ERROR";
    const name = err.name || "";

    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      return "PERMISSION_DENIED";
    }
    if (name === "NotFoundError" || name === "DevicesNotFoundError") {
      return "NO_CAMERA";
    }
    if (name === "NotReadableError" || name === "TrackStartError") {
      return "CAMERA_BUSY";
    }
    if (name === "SecurityError") {
      return "INSECURE_CONTEXT";
    }
    return "GENERIC_ERROR";
  }

  /**
   * Get current language code from window.shopStore or document.documentElement.lang
   */
  _getCurrentLang() {
    if (window.shopStore && window.shopStore.currentLanguage) {
      return window.shopStore.currentLanguage;
    }
    const htmlLang = document.documentElement.lang;
    if (htmlLang && (htmlLang === "te" || htmlLang === "hi" || htmlLang === "en")) {
      return htmlLang;
    }
    return "en";
  }

  /**
   * Get localized friendly message for an error code
   * @param {string} errorCode
   * @param {string} [lang]
   * @returns {string}
   */
  getLocalizedMessage(errorCode, lang) {
    const language = lang || this._getCurrentLang();
    const dict = (typeof TRANSLATIONS !== "undefined" && TRANSLATIONS[language]) ? TRANSLATIONS[language] : (typeof TRANSLATIONS !== "undefined" ? TRANSLATIONS.en : {});

    switch (errorCode) {
      case "PERMISSION_DENIED":
        return dict.cameraErrPermission || "Camera access was denied. Please allow camera permissions in your browser address bar.";
      case "NO_CAMERA":
        return dict.cameraErrNotFound || "No camera detected on this device. Please connect a webcam or switch devices.";
      case "CAMERA_BUSY":
        return dict.cameraErrBusy || "Camera is currently busy or in use by another application. Please close other camera apps and retry.";
      case "INSECURE_CONTEXT":
        return dict.cameraErrInsecure || "Camera requires a secure connection (HTTPS or localhost). Please open this app over HTTPS.";
      default:
        return dict.cameraErrGeneric || "Unable to access camera at this time. You can continue using manual input or demo mode.";
    }
  }

  /**
   * Get localized fallback action label
   * @param {string} errorCode
   * @param {string} [lang]
   * @returns {string}
   */
  getLocalizedFallback(errorCode, lang) {
    const language = lang || this._getCurrentLang();
    const dict = (typeof TRANSLATIONS !== "undefined" && TRANSLATIONS[language]) ? TRANSLATIONS[language] : (typeof TRANSLATIONS !== "undefined" ? TRANSLATIONS.en : {});
    return dict.cameraFallbackAction || "Continue with Manual / Demo Option";
  }

  /**
   * Render a friendly, accessible error banner in a container element
   * @param {HTMLElement} containerEl - DOM element to render error into
   * @param {{error: string, message: string}} errorInfo - Error details
   * @param {{onFallback?: Function, onRetry?: Function, fallbackLabel?: string}} options - Action callbacks
   */
  renderError(containerEl, errorInfo, options = {}) {
    if (!containerEl) return;
    const lang = this._getCurrentLang();
    const dict = (typeof TRANSLATIONS !== "undefined" && TRANSLATIONS[lang]) ? TRANSLATIONS[lang] : (typeof TRANSLATIONS !== "undefined" ? TRANSLATIONS.en : {});

    const message = errorInfo.message || this.getLocalizedMessage(errorInfo.error || "GENERIC_ERROR", lang);
    const fallbackText = options.fallbackLabel || this.getLocalizedFallback(errorInfo.error || "GENERIC_ERROR", lang);
    const retryText = dict.cameraRetryBtn || "Retry Camera";

    containerEl.innerHTML = `
      <div class="camera-error-banner" role="alert">
        <div class="camera-error-icon-box">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <p class="camera-error-text">
          ${message}
        </p>
        <div class="camera-error-actions">
          ${options.onRetry ? `
            <button type="button" class="btn btn-secondary btn-sm camera-retry-btn">
              ↺ ${retryText}
            </button>
          ` : ""}
          ${options.onFallback ? `
            <button type="button" class="btn btn-primary btn-sm camera-fallback-btn">
              → ${fallbackText}
            </button>
          ` : ""}
        </div>
      </div>
    `;

    if (options.onRetry) {
      const retryBtn = containerEl.querySelector(".camera-retry-btn");
      if (retryBtn) {
        retryBtn.addEventListener("click", () => options.onRetry());
      }
    }

    if (options.onFallback) {
      const fallbackBtn = containerEl.querySelector(".camera-fallback-btn");
      if (fallbackBtn) {
        fallbackBtn.addEventListener("click", () => options.onFallback());
      }
    }
  }

  /**
   * Clear error state from container
   * @param {HTMLElement} containerEl
   */
  clearError(containerEl) {
    if (containerEl) {
      containerEl.innerHTML = "";
    }
    this.lastErrorCode = null;
  }

  onStop(fn) {
    if (typeof fn === "function") this.stopListeners.push(fn);
  }

  offStop(fn) {
    this.stopListeners = this.stopListeners.filter(l => l !== fn);
  }

  onError(fn) {
    if (typeof fn === "function") this.errorListeners.push(fn);
  }

  offError(fn) {
    this.errorListeners = this.errorListeners.filter(l => l !== fn);
  }

  _notifyStop() {
    this.stopListeners.forEach(fn => {
      try { fn(); } catch (e) {}
    });
  }

  _notifyError(err) {
    this.errorListeners.forEach(fn => {
      try { fn(err); } catch (e) {}
    });
  }
}

// Global Singleton instance
window.ShopCamera = new ShopCameraManager();
