// ============================================================================
// CryptArtist Studio - Donate Computer Page Controller
// Handles UI interactions for the Donate Computer page
// ============================================================================

(function () {
  "use strict";

  var dc = null; // DonatePersonalSeconds instance
  var passwordVisible = false;
  var logEntries = [];
  var MAX_LOG = 100;

  // -------------------------------------------------------------------------
  // DOM refs
  // -------------------------------------------------------------------------

  var els = {};

  function cacheDom() {
    els.statusDot = document.getElementById("dc-status-dot");
    els.statusText = document.getElementById("dc-status-text");
    els.cpuCores = document.getElementById("dc-cpu-cores");
    els.ram = document.getElementById("dc-ram");
    els.gpu = document.getElementById("dc-gpu");
    els.network = document.getElementById("dc-network");
    els.password = document.getElementById("dc-password");
    els.copyPw = document.getElementById("dc-copy-pw");
    els.togglePw = document.getElementById("dc-toggle-pw");
    els.regenPw = document.getElementById("dc-regen-pw");
    els.customPw = document.getElementById("dc-custom-pw");
    els.cpuLimit = document.getElementById("dc-cpu-limit");
    els.ramLimit = document.getElementById("dc-ram-limit");
    els.gpuLimit = document.getElementById("dc-gpu-limit");
    els.cpuLimitVal = document.getElementById("dc-cpu-limit-val");
    els.ramLimitVal = document.getElementById("dc-ram-limit-val");
    els.gpuLimitVal = document.getElementById("dc-gpu-limit-val");
    els.btnDonate = document.getElementById("dc-btn-donate");
    els.btnBorrow = document.getElementById("dc-btn-borrow");
    els.btnStop = document.getElementById("dc-btn-stop");
    els.liveStats = document.getElementById("dc-live-stats");
    els.statPeers = document.getElementById("dc-stat-peers");
    els.statTasks = document.getElementById("dc-stat-tasks");
    els.statUptime = document.getElementById("dc-stat-uptime");
    els.statCpuTime = document.getElementById("dc-stat-cpu-time");
    els.logEntries = document.getElementById("dc-log-entries");
    els.logClear = document.getElementById("dc-log-clear");
    els.peerId = document.getElementById("dc-peer-id");
  }

  // -------------------------------------------------------------------------
  // Logging
  // -------------------------------------------------------------------------

  function addLog(message, type) {
    type = type || "info";
    var entry = {
      time: new Date().toLocaleTimeString(),
      message: message,
      type: type,
    };
    logEntries.unshift(entry);
    if (logEntries.length > MAX_LOG) logEntries.pop();
    renderLog();
  }

  function renderLog() {
    if (!els.logEntries) return;
    els.logEntries.textContent = "";
    for (var i = 0; i < logEntries.length; i++) {
      var div = document.createElement("div");
      div.className = "dc-log-entry dc-log-" + logEntries[i].type;
      var timeSpan = document.createElement("span");
      timeSpan.className = "dc-log-time";
      timeSpan.textContent = logEntries[i].time;
      var msgSpan = document.createElement("span");
      msgSpan.textContent = " " + logEntries[i].message;
      div.appendChild(timeSpan);
      div.appendChild(msgSpan);
      els.logEntries.appendChild(div);
    }
  }

  // -------------------------------------------------------------------------
  // Status display
  // -------------------------------------------------------------------------

  function setStatus(status, text) {
    if (els.statusDot) {
      els.statusDot.className = "dc-status-dot dc-status-" + status;
    }
    if (els.statusText) {
      els.statusText.textContent = text;
    }
  }

  // -------------------------------------------------------------------------
  // Format helpers
  // -------------------------------------------------------------------------

  function formatUptime(seconds) {
    if (seconds < 60) return seconds + "s";
    if (seconds < 3600) return Math.floor(seconds / 60) + "m " + (seconds % 60) + "s";
    var h = Math.floor(seconds / 3600);
    var m = Math.floor((seconds % 3600) / 60);
    return h + "h " + m + "m";
  }

  // -------------------------------------------------------------------------
  // Resource display
  // -------------------------------------------------------------------------

  async function detectAndDisplayResources() {
    try {
      var resources = await DonatePersonalSecondsAPI.detectResources();

      if (els.cpuCores) els.cpuCores.textContent = resources.cpu.cores + " cores";
      if (els.ram) els.ram.textContent = resources.ram.totalGB ? resources.ram.totalGB + " GB" : "Unknown";
      if (els.gpu) {
        if (resources.gpu.available) {
          var gpuName = resources.gpu.model;
          // Truncate long GPU names
          if (gpuName.length > 30) gpuName = gpuName.slice(0, 30) + "...";
          els.gpu.textContent = gpuName;
        } else {
          els.gpu.textContent = "Not detected";
        }
      }
      if (els.network) {
        if (resources.network.downlink) {
          els.network.textContent = resources.network.downlink + " Mbps (" + resources.network.effectiveType + ")";
        } else {
          els.network.textContent = "Unknown";
        }
      }
    } catch (e) {
      addLog("Failed to detect resources: " + e.message, "error");
    }
  }

  // -------------------------------------------------------------------------
  // Password management
  // -------------------------------------------------------------------------

  function displayPassword(pw) {
    if (!els.password) return;
    if (passwordVisible) {
      els.password.value = pw;
      els.password.type = "text";
    } else {
      els.password.value = pw.replace(/./g, "\u2022");
      els.password.type = "text";
    }
    els.password.dataset.pw = pw;
  }

  function togglePasswordVisibility() {
    passwordVisible = !passwordVisible;
    if (els.password && els.password.dataset.pw) {
      displayPassword(els.password.dataset.pw);
    }
    if (els.togglePw) {
      els.togglePw.textContent = passwordVisible ? "\uD83D\uDE48" : "\uD83D\uDC41";
    }
  }

  function copyPassword() {
    if (!els.password || !els.password.dataset.pw) return;
    navigator.clipboard.writeText(els.password.dataset.pw).then(function () {
      addLog("Password copied to clipboard", "success");
      if (els.copyPw) {
        var original = els.copyPw.textContent;
        els.copyPw.textContent = "\u2705";
        setTimeout(function () { els.copyPw.textContent = original; }, 1500);
      }
    }).catch(function () {
      addLog("Failed to copy password", "error");
    });
  }

  function regeneratePassword() {
    var newPw = DonatePersonalSecondsAPI.generatePassword();
    displayPassword(newPw);
    if (dc) dc.password = newPw;
    addLog("Password regenerated", "info");
  }

  function setCustomPassword() {
    var pw = prompt("Enter a custom password (min 8 characters):");
    if (!pw) return;
    if (pw.length < 8) {
      alert("Password must be at least 8 characters.");
      return;
    }
    displayPassword(pw);
    if (dc) dc.password = pw;
    addLog("Custom password set", "info");
  }

  // -------------------------------------------------------------------------
  // Slider updates
  // -------------------------------------------------------------------------

  function setupSliders() {
    if (els.cpuLimit) {
      els.cpuLimit.addEventListener("input", function () {
        if (els.cpuLimitVal) els.cpuLimitVal.textContent = this.value;
        if (dc && dc.running) dc.setLimits({ cpuPercent: parseInt(this.value, 10) });
      });
    }
    if (els.ramLimit) {
      els.ramLimit.addEventListener("input", function () {
        if (els.ramLimitVal) els.ramLimitVal.textContent = this.value;
        if (dc && dc.running) dc.setLimits({ ramPercent: parseInt(this.value, 10) });
      });
    }
    if (els.gpuLimit) {
      els.gpuLimit.addEventListener("input", function () {
        if (els.gpuLimitVal) els.gpuLimitVal.textContent = this.value;
        if (dc && dc.running) dc.setLimits({ gpuPercent: parseInt(this.value, 10) });
      });
    }
  }

  // -------------------------------------------------------------------------
  // Start Donating
  // -------------------------------------------------------------------------

  async function startDonating() {
    try {
      dc = DonatePersonalSecondsAPI.create();

      var pw = els.password ? (els.password.dataset.pw || dc.password) : dc.password;

      await dc.init({
        password: pw,
        limits: {
          cpuPercent: parseInt(els.cpuLimit ? els.cpuLimit.value : "80", 10),
          ramPercent: parseInt(els.ramLimit ? els.ramLimit.value : "50", 10),
          gpuPercent: parseInt(els.gpuLimit ? els.gpuLimit.value : "90", 10),
        },
      });

      // Wire up events
      dc.on("donating-started", function (info) {
        setStatus("active", "Donating");
        addLog("Started donating! Peer ID: " + info.peerId, "success");
        addLog("CPU: " + info.limits.cpuPercent + "% | RAM: " + info.limits.ramPercent + "% | GPU: " + info.limits.gpuPercent + "%", "info");
      });

      dc.on("peer-verified", function (data) {
        addLog("Peer connected and verified: " + data.peerId, "success");
      });

      dc.on("peer-disconnected", function (peerId) {
        addLog("Peer disconnected: " + peerId, "warn");
      });

      dc.on("task-received", function (task) {
        addLog("Processing task: " + task.id + " (type: " + task.type + ")", "info");
      });

      dc.on("task-complete", function () {
        addLog("Task completed successfully", "success");
      });

      dc.on("task-error", function (err) {
        addLog("Task failed: " + (err.message || err), "error");
      });

      dc.on("signaling-connected", function () {
        addLog("Connected to signaling server", "info");
      });

      dc.on("signaling-fallback", function (msg) {
        addLog(msg, "warn");
      });

      dc.on("signaling-error", function (msg) {
        addLog(msg, "warn");
      });

      dc.on("signaling-disconnected", function () {
        addLog("Signaling server disconnected - reconnecting...", "warn");
      });

      dc.on("stats-update", function (stats) {
        updateStatsDisplay(stats);
      });

      dc.on("auth-failed", function (peerId) {
        addLog("Auth failed for peer: " + peerId + " (wrong password)", "error");
      });

      dc.on("stopped", function (data) {
        setStatus("offline", "Stopped");
        addLog("Stopped. Total tasks: " + data.stats.tasksCompleted + ", Uptime: " + formatUptime(data.stats.uptime), "info");
      });

      await dc.startDonating();

      // Update UI
      if (els.peerId) els.peerId.textContent = dc.peerId;
      displayPassword(dc.password);
      showRunningUI();

    } catch (e) {
      addLog("Failed to start donating: " + e.message, "error");
      setStatus("error", "Error");
    }
  }

  // -------------------------------------------------------------------------
  // Start Borrowing
  // -------------------------------------------------------------------------

  async function startBorrowing() {
    try {
      dc = DonatePersonalSecondsAPI.create();

      var pw = els.password ? (els.password.dataset.pw || dc.password) : dc.password;

      await dc.init({ password: pw });

      dc.on("borrowing-started", function (info) {
        setStatus("borrowing", "Borrowing");
        addLog("Started borrowing! Peer ID: " + info.peerId, "success");
        addLog("Looking for available donors...", "info");
      });

      dc.on("peer-verified", function (data) {
        addLog("Connected to donor: " + data.peerId, "success");
        if (data.resources) {
          addLog("Donor resources: " + data.resources.cpu.cores + " CPU cores, " + (data.resources.ram.totalGB || "?") + "GB RAM", "info");
        }
      });

      dc.on("peer-disconnected", function (peerId) {
        addLog("Donor disconnected: " + peerId, "warn");
      });

      dc.on("task-complete", function (result) {
        addLog("Task " + result.taskId + " completed in " + result.elapsed + "ms", "success");
      });

      dc.on("task-error", function (err) {
        addLog("Task " + err.taskId + " failed: " + err.message, "error");
      });

      dc.on("task-queued", function (task) {
        addLog("Task " + task.id + " queued (no donors available yet)", "warn");
      });

      dc.on("signaling-connected", function () {
        addLog("Connected to signaling server", "info");
      });

      dc.on("signaling-fallback", function (msg) {
        addLog(msg, "warn");
      });

      dc.on("stats-update", function (stats) {
        updateStatsDisplay(stats);
      });

      dc.on("stopped", function (data) {
        setStatus("offline", "Stopped");
        addLog("Stopped borrowing. Tasks submitted: " + data.stats.tasksSubmitted, "info");
      });

      await dc.startBorrowing();

      if (els.peerId) els.peerId.textContent = dc.peerId;
      displayPassword(dc.password);
      showRunningUI();

    } catch (e) {
      addLog("Failed to start borrowing: " + e.message, "error");
      setStatus("error", "Error");
    }
  }

  // -------------------------------------------------------------------------
  // Stop
  // -------------------------------------------------------------------------

  function stopDc() {
    if (dc) {
      dc.stop();
      dc = null;
    }
    showIdleUI();
    setStatus("offline", "Offline");
    addLog("All connections closed", "info");
  }

  // -------------------------------------------------------------------------
  // UI state management
  // -------------------------------------------------------------------------

  function showRunningUI() {
    if (els.btnDonate) els.btnDonate.style.display = "none";
    if (els.btnBorrow) els.btnBorrow.style.display = "none";
    if (els.btnStop) els.btnStop.style.display = "";
    if (els.liveStats) els.liveStats.style.display = "";
  }

  function showIdleUI() {
    if (els.btnDonate) els.btnDonate.style.display = "";
    if (els.btnBorrow) els.btnBorrow.style.display = "";
    if (els.btnStop) els.btnStop.style.display = "none";
  }

  function updateStatsDisplay(stats) {
    if (els.statPeers) els.statPeers.textContent = stats.connectedPeers;
    if (els.statTasks) els.statTasks.textContent = stats.tasksCompleted;
    if (els.statUptime) els.statUptime.textContent = formatUptime(stats.uptime);
    if (els.statCpuTime) els.statCpuTime.textContent = formatUptime(Math.floor(stats.cpuTimeShared / 1000));
  }

  // -------------------------------------------------------------------------
  // Init
  // -------------------------------------------------------------------------

  function init() {
    cacheDom();

    // Detect resources
    detectAndDisplayResources();

    // Generate initial password
    var initialPw = DonatePersonalSecondsAPI.generatePassword();
    displayPassword(initialPw);

    // Set initial peer ID placeholder
    if (els.peerId) els.peerId.textContent = "(will be assigned on start)";

    // Button events
    if (els.btnDonate) els.btnDonate.addEventListener("click", startDonating);
    if (els.btnBorrow) els.btnBorrow.addEventListener("click", startBorrowing);
    if (els.btnStop) els.btnStop.addEventListener("click", stopDc);

    // Password events
    if (els.copyPw) els.copyPw.addEventListener("click", copyPassword);
    if (els.togglePw) els.togglePw.addEventListener("click", togglePasswordVisibility);
    if (els.regenPw) els.regenPw.addEventListener("click", regeneratePassword);
    if (els.customPw) els.customPw.addEventListener("click", setCustomPassword);

    // Log clear
    if (els.logClear) {
      els.logClear.addEventListener("click", function () {
        logEntries = [];
        renderLog();
      });
    }

    // Sliders
    setupSliders();

    // Set status
    setStatus("offline", "Offline");

    addLog("Donate Computer ready. Detected system resources.", "info");
  }

  // Run init when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
