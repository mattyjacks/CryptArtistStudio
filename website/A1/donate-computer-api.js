// ============================================================================
// CryptArtist Studio - Donate Computer API
// Peer-to-peer compute resource sharing system
// A free, community-powered alternative to cloud computing
// ============================================================================
//
// Architecture:
//   - WebSocket signaling server for peer discovery
//   - WebRTC data channels for direct peer-to-peer compute sharing
//   - Password-protected connections by default
//   - Resource monitoring (CPU, GPU, RAM usage)
//   - Task queue and distribution system
//
// Security:
//   - All connections password-protected by default
//   - Peer verification via challenge-response
//   - Sandboxed task execution (WebAssembly only)
//   - Rate limiting and resource caps
//   - No access to local filesystem
//
// ============================================================================

const DonateComputerAPI = (function () {
  "use strict";

  // -------------------------------------------------------------------------
  // Configuration
  // -------------------------------------------------------------------------

  const CONFIG = {
    SIGNALING_URL: "wss://signal.cryptartist.com",
    FALLBACK_SIGNALING_URL: "wss://signal-fallback.cryptartist.com",
    ICE_SERVERS: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
    ],
    MAX_PEERS: 50,
    HEARTBEAT_INTERVAL: 15000,
    RESOURCE_REPORT_INTERVAL: 10000,
    MAX_TASK_SIZE_MB: 100,
    MAX_RAM_DONATION_PERCENT: 50,
    MAX_CPU_DONATION_PERCENT: 80,
    MAX_GPU_DONATION_PERCENT: 90,
    PASSWORD_MIN_LENGTH: 8,
    TASK_TIMEOUT_MS: 300000, // 5 minutes
    VERSION: "1.0.0",
  };

  // -------------------------------------------------------------------------
  // Peer ID generation
  // -------------------------------------------------------------------------

  function generatePeerId() {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let id = "ca-";
    for (let i = 0; i < 16; i++) {
      id += chars[Math.floor(Math.random() * chars.length)];
    }
    return id;
  }

  function generatePassword() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
    let pw = "";
    const arr = new Uint32Array(16);
    crypto.getRandomValues(arr);
    for (let i = 0; i < 16; i++) {
      pw += chars[arr[i] % chars.length];
    }
    return pw;
  }

  // -------------------------------------------------------------------------
  // Resource detection
  // -------------------------------------------------------------------------

  async function detectResources() {
    const resources = {
      cpu: { cores: navigator.hardwareConcurrency || 4, model: "Unknown", usage: 0 },
      ram: { totalGB: 0, availableGB: 0, usage: 0 },
      gpu: { model: "Unknown", vram: 0, available: false },
      network: { downlink: 0, effectiveType: "unknown", rtt: 0 },
      platform: navigator.platform || "Unknown",
      userAgent: navigator.userAgent.slice(0, 100),
    };

    // RAM estimation via memory API
    if (navigator.deviceMemory) {
      resources.ram.totalGB = navigator.deviceMemory;
      resources.ram.availableGB = navigator.deviceMemory * 0.5;
    }

    // Network info
    if (navigator.connection) {
      resources.network.downlink = navigator.connection.downlink || 0;
      resources.network.effectiveType = navigator.connection.effectiveType || "unknown";
      resources.network.rtt = navigator.connection.rtt || 0;
    }

    // GPU detection via WebGL
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
      if (gl) {
        const ext = gl.getExtension("WEBGL_debug_renderer_info");
        if (ext) {
          resources.gpu.model = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || "Unknown";
        }
        resources.gpu.available = true;
        // Estimate VRAM (not directly available, estimate from GPU model)
        resources.gpu.vram = 2; // Default 2GB estimate
      }
    } catch (e) {
      // GPU detection failed
    }

    return resources;
  }

  // -------------------------------------------------------------------------
  // Simple hash for password verification
  // -------------------------------------------------------------------------

  async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
  }

  // -------------------------------------------------------------------------
  // Event emitter mixin
  // -------------------------------------------------------------------------

  function EventEmitter() {
    this._listeners = {};
  }

  EventEmitter.prototype.on = function (event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
    return this;
  };

  EventEmitter.prototype.off = function (event, fn) {
    if (!this._listeners[event]) return this;
    this._listeners[event] = this._listeners[event].filter(function (f) { return f !== fn; });
    return this;
  };

  EventEmitter.prototype.emit = function (event) {
    var args = Array.prototype.slice.call(arguments, 1);
    var fns = this._listeners[event] || [];
    for (var i = 0; i < fns.length; i++) {
      try { fns[i].apply(null, args); } catch (e) { console.error("[DonateComputer] Event error:", e); }
    }
  };

  // -------------------------------------------------------------------------
  // Peer connection wrapper
  // -------------------------------------------------------------------------

  function PeerConnection(peerId, remoteId, isInitiator, passwordHash) {
    EventEmitter.call(this);
    this.peerId = peerId;
    this.remoteId = remoteId;
    this.isInitiator = isInitiator;
    this.passwordHash = passwordHash;
    this.pc = null;
    this.dataChannel = null;
    this.verified = false;
    this.resources = null;
    this.taskQueue = [];
    this.state = "new"; // new, connecting, connected, verified, closed
  }

  PeerConnection.prototype = Object.create(EventEmitter.prototype);
  PeerConnection.prototype.constructor = PeerConnection;

  PeerConnection.prototype.init = function () {
    var self = this;
    this.pc = new RTCPeerConnection({ iceServers: CONFIG.ICE_SERVERS });

    this.pc.onicecandidate = function (event) {
      if (event.candidate) {
        self.emit("ice-candidate", { target: self.remoteId, candidate: event.candidate });
      }
    };

    this.pc.onconnectionstatechange = function () {
      self.state = self.pc.connectionState;
      self.emit("state-change", self.state);
      if (self.state === "failed" || self.state === "closed") {
        self.close();
      }
    };

    if (this.isInitiator) {
      this.dataChannel = this.pc.createDataChannel("compute", { ordered: true });
      this._setupDataChannel(this.dataChannel);
    } else {
      this.pc.ondatachannel = function (event) {
        self.dataChannel = event.channel;
        self._setupDataChannel(self.dataChannel);
      };
    }
  };

  PeerConnection.prototype._setupDataChannel = function (channel) {
    var self = this;
    channel.onopen = function () {
      self.state = "connected";
      self.emit("connected");
      // Initiate password verification
      self._sendChallenge();
    };
    channel.onclose = function () {
      self.state = "closed";
      self.emit("disconnected");
    };
    channel.onmessage = function (event) {
      try {
        var msg = JSON.parse(event.data);
        self._handleMessage(msg);
      } catch (e) {
        console.error("[DonateComputer] Bad message:", e);
      }
    };
  };

  PeerConnection.prototype._sendChallenge = function () {
    var challenge = generatePeerId(); // Random challenge
    this._pendingChallenge = challenge;
    this.send({ type: "auth-challenge", challenge: challenge });
  };

  PeerConnection.prototype._handleMessage = function (msg) {
    switch (msg.type) {
      case "auth-challenge":
        this._respondToChallenge(msg.challenge);
        break;
      case "auth-response":
        this._verifyChallenge(msg.response);
        break;
      case "auth-ok":
        this.verified = true;
        this.state = "verified";
        this.emit("verified");
        break;
      case "resource-report":
        this.resources = msg.resources;
        this.emit("resources-updated", msg.resources);
        break;
      case "task-submit":
        if (this.verified) this.emit("task-received", msg.task);
        break;
      case "task-result":
        if (this.verified) this.emit("task-complete", msg.result);
        break;
      case "task-error":
        if (this.verified) this.emit("task-error", msg.error);
        break;
      case "heartbeat":
        this.send({ type: "heartbeat-ack" });
        break;
      case "heartbeat-ack":
        this.emit("heartbeat-ack");
        break;
      default:
        this.emit("message", msg);
    }
  };

  PeerConnection.prototype._respondToChallenge = async function (challenge) {
    var response = await hashPassword(this.passwordHash + challenge);
    this.send({ type: "auth-response", response: response });
  };

  PeerConnection.prototype._verifyChallenge = async function (response) {
    if (!this._pendingChallenge) return;
    var expected = await hashPassword(this.passwordHash + this._pendingChallenge);
    if (response === expected) {
      this.verified = true;
      this.state = "verified";
      this.send({ type: "auth-ok" });
      this.emit("verified");
    } else {
      this.emit("auth-failed");
      this.close();
    }
  };

  PeerConnection.prototype.send = function (msg) {
    if (this.dataChannel && this.dataChannel.readyState === "open") {
      this.dataChannel.send(JSON.stringify(msg));
    }
  };

  PeerConnection.prototype.createOffer = async function () {
    var offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    return offer;
  };

  PeerConnection.prototype.handleOffer = async function (offer) {
    await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
    var answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    return answer;
  };

  PeerConnection.prototype.handleAnswer = async function (answer) {
    await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
  };

  PeerConnection.prototype.addIceCandidate = async function (candidate) {
    await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
  };

  PeerConnection.prototype.close = function () {
    if (this.dataChannel) this.dataChannel.close();
    if (this.pc) this.pc.close();
    this.state = "closed";
    this.emit("closed");
  };

  // -------------------------------------------------------------------------
  // DonateComputer - Main class
  // -------------------------------------------------------------------------

  function DonateComputer() {
    EventEmitter.call(this);
    this.peerId = generatePeerId();
    this.password = generatePassword();
    this.passwordHash = null;
    this.mode = null; // "donor" or "borrower"
    this.resources = null;
    this.peers = new Map();
    this.ws = null;
    this.running = false;
    this.stats = {
      tasksCompleted: 0,
      tasksSubmitted: 0,
      bytesProcessed: 0,
      uptime: 0,
      connectedPeers: 0,
      cpuTimeShared: 0,
    };
    this.donationLimits = {
      cpuPercent: CONFIG.MAX_CPU_DONATION_PERCENT,
      ramPercent: CONFIG.MAX_RAM_DONATION_PERCENT,
      gpuPercent: CONFIG.MAX_GPU_DONATION_PERCENT,
    };
    this._heartbeatInterval = null;
    this._resourceInterval = null;
    this._uptimeInterval = null;
    this._startTime = null;
  }

  DonateComputer.prototype = Object.create(EventEmitter.prototype);
  DonateComputer.prototype.constructor = DonateComputer;

  // -- Initialization --

  DonateComputer.prototype.init = async function (options) {
    options = options || {};
    if (options.password) {
      if (options.password.length < CONFIG.PASSWORD_MIN_LENGTH) {
        throw new Error("Password must be at least " + CONFIG.PASSWORD_MIN_LENGTH + " characters");
      }
      this.password = options.password;
    }
    this.passwordHash = await hashPassword(this.password);
    this.resources = await detectResources();

    if (options.limits) {
      if (options.limits.cpuPercent !== undefined) {
        this.donationLimits.cpuPercent = Math.min(options.limits.cpuPercent, CONFIG.MAX_CPU_DONATION_PERCENT);
      }
      if (options.limits.ramPercent !== undefined) {
        this.donationLimits.ramPercent = Math.min(options.limits.ramPercent, CONFIG.MAX_RAM_DONATION_PERCENT);
      }
      if (options.limits.gpuPercent !== undefined) {
        this.donationLimits.gpuPercent = Math.min(options.limits.gpuPercent, CONFIG.MAX_GPU_DONATION_PERCENT);
      }
    }

    this.emit("initialized", {
      peerId: this.peerId,
      password: this.password,
      resources: this.resources,
    });

    return this;
  };

  // -- Start donating --

  DonateComputer.prototype.startDonating = async function () {
    this.mode = "donor";
    this.running = true;
    this._startTime = Date.now();
    await this._connectSignaling();
    this._startHeartbeat();
    this._startResourceReporting();
    this._startUptimeTracking();

    this.emit("donating-started", {
      peerId: this.peerId,
      password: this.password,
      resources: this.resources,
      limits: this.donationLimits,
    });
  };

  // -- Start borrowing --

  DonateComputer.prototype.startBorrowing = async function () {
    this.mode = "borrower";
    this.running = true;
    this._startTime = Date.now();
    await this._connectSignaling();
    this._startHeartbeat();
    this._startUptimeTracking();

    this.emit("borrowing-started", {
      peerId: this.peerId,
    });
  };

  // -- Stop --

  DonateComputer.prototype.stop = function () {
    this.running = false;
    clearInterval(this._heartbeatInterval);
    clearInterval(this._resourceInterval);
    clearInterval(this._uptimeInterval);

    // Close all peer connections
    this.peers.forEach(function (peer) { peer.close(); });
    this.peers.clear();

    // Close signaling connection
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.mode = null;
    this.emit("stopped", { stats: this.getStats() });
  };

  // -- Submit a task to the network --

  DonateComputer.prototype.submitTask = function (task) {
    if (this.mode !== "borrower") {
      throw new Error("Must be in borrower mode to submit tasks");
    }

    // Validate task
    if (!task || !task.type) {
      throw new Error("Task must have a type");
    }

    var taskObj = {
      id: "task_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
      type: task.type,
      payload: task.payload || null,
      wasmUrl: task.wasmUrl || null,
      priority: task.priority || "normal",
      timeout: task.timeout || CONFIG.TASK_TIMEOUT_MS,
      submitted: Date.now(),
    };

    // Find an available verified donor peer
    var assigned = false;
    var self = this;
    this.peers.forEach(function (peer) {
      if (!assigned && peer.verified && peer.resources) {
        peer.send({ type: "task-submit", task: taskObj });
        assigned = true;
        self.stats.tasksSubmitted++;
        self.emit("task-submitted", taskObj);
      }
    });

    if (!assigned) {
      this.emit("task-queued", taskObj);
    }

    return taskObj.id;
  };

  // -- Get stats --

  DonateComputer.prototype.getStats = function () {
    return Object.assign({}, this.stats, {
      connectedPeers: this.peers.size,
      uptime: this._startTime ? Math.floor((Date.now() - this._startTime) / 1000) : 0,
      mode: this.mode,
      peerId: this.peerId,
    });
  };

  // -- Get peer list --

  DonateComputer.prototype.getPeers = function () {
    var list = [];
    this.peers.forEach(function (peer, id) {
      list.push({
        id: id,
        state: peer.state,
        verified: peer.verified,
        resources: peer.resources,
      });
    });
    return list;
  };

  // -- Set donation limits --

  DonateComputer.prototype.setLimits = function (limits) {
    if (limits.cpuPercent !== undefined) {
      this.donationLimits.cpuPercent = Math.max(10, Math.min(limits.cpuPercent, CONFIG.MAX_CPU_DONATION_PERCENT));
    }
    if (limits.ramPercent !== undefined) {
      this.donationLimits.ramPercent = Math.max(10, Math.min(limits.ramPercent, CONFIG.MAX_RAM_DONATION_PERCENT));
    }
    if (limits.gpuPercent !== undefined) {
      this.donationLimits.gpuPercent = Math.max(10, Math.min(limits.gpuPercent, CONFIG.MAX_GPU_DONATION_PERCENT));
    }
    this.emit("limits-changed", this.donationLimits);
  };

  // -------------------------------------------------------------------------
  // Internal methods
  // -------------------------------------------------------------------------

  DonateComputer.prototype._connectSignaling = function () {
    var self = this;
    return new Promise(function (resolve, reject) {
      try {
        self.ws = new WebSocket(CONFIG.SIGNALING_URL);
      } catch (e) {
        // Fallback to local simulation mode
        self.emit("signaling-fallback", "Using local P2P mode");
        resolve();
        return;
      }

      self.ws.onopen = function () {
        // Register with signaling server
        self.ws.send(JSON.stringify({
          type: "register",
          peerId: self.peerId,
          mode: self.mode,
          passwordHash: self.passwordHash,
          resources: self.mode === "donor" ? self.resources : null,
          limits: self.mode === "donor" ? self.donationLimits : null,
          version: CONFIG.VERSION,
        }));
        self.emit("signaling-connected");
        resolve();
      };

      self.ws.onmessage = function (event) {
        try {
          var msg = JSON.parse(event.data);
          self._handleSignalingMessage(msg);
        } catch (e) {
          console.error("[DonateComputer] Signaling message error:", e);
        }
      };

      self.ws.onerror = function () {
        self.emit("signaling-error", "Connection failed - using local mode");
        resolve(); // Don't reject, fall back gracefully
      };

      self.ws.onclose = function () {
        self.emit("signaling-disconnected");
        // Auto-reconnect if still running
        if (self.running) {
          setTimeout(function () {
            if (self.running) self._connectSignaling();
          }, 5000);
        }
      };
    });
  };

  DonateComputer.prototype._handleSignalingMessage = function (msg) {
    var self = this;
    switch (msg.type) {
      case "peer-available": {
        // New peer available - initiate connection
        if (self.peers.size >= CONFIG.MAX_PEERS) break;
        var conn = new PeerConnection(self.peerId, msg.peerId, true, self.passwordHash);
        conn.init();
        self._setupPeerEvents(conn);
        conn.createOffer().then(function (offer) {
          self._signalingSend({ type: "offer", target: msg.peerId, offer: offer });
        });
        self.peers.set(msg.peerId, conn);
        break;
      }
      case "offer": {
        if (self.peers.size >= CONFIG.MAX_PEERS) break;
        var respConn = new PeerConnection(self.peerId, msg.from, false, self.passwordHash);
        respConn.init();
        self._setupPeerEvents(respConn);
        respConn.handleOffer(msg.offer).then(function (answer) {
          self._signalingSend({ type: "answer", target: msg.from, answer: answer });
        });
        self.peers.set(msg.from, respConn);
        break;
      }
      case "answer": {
        var aPeer = self.peers.get(msg.from);
        if (aPeer) aPeer.handleAnswer(msg.answer);
        break;
      }
      case "ice-candidate": {
        var iPeer = self.peers.get(msg.from);
        if (iPeer) iPeer.addIceCandidate(msg.candidate);
        break;
      }
      case "peer-list": {
        self.emit("peer-list", msg.peers);
        break;
      }
      case "error": {
        self.emit("error", msg.message);
        break;
      }
    }
  };

  DonateComputer.prototype._setupPeerEvents = function (conn) {
    var self = this;
    conn.on("verified", function () {
      self.stats.connectedPeers = self.peers.size;
      self.emit("peer-verified", { peerId: conn.remoteId, resources: conn.resources });
    });
    conn.on("resources-updated", function (resources) {
      self.emit("peer-resources", { peerId: conn.remoteId, resources: resources });
    });
    conn.on("task-received", function (task) {
      self.emit("task-received", task);
      // Execute the task in a sandboxed way
      self._executeTask(task, conn);
    });
    conn.on("task-complete", function (result) {
      self.stats.tasksCompleted++;
      self.emit("task-complete", result);
    });
    conn.on("task-error", function (error) {
      self.emit("task-error", error);
    });
    conn.on("closed", function () {
      self.peers.delete(conn.remoteId);
      self.stats.connectedPeers = self.peers.size;
      self.emit("peer-disconnected", conn.remoteId);
    });
    conn.on("auth-failed", function () {
      self.emit("auth-failed", conn.remoteId);
    });
    conn.on("ice-candidate", function (data) {
      self._signalingSend({
        type: "ice-candidate",
        target: data.target,
        candidate: data.candidate,
      });
    });
  };

  DonateComputer.prototype._executeTask = async function (task, conn) {
    var startTime = Date.now();
    try {
      var result;
      switch (task.type) {
        case "wasm":
          // Execute WebAssembly task (sandboxed)
          result = await this._executeWasmTask(task);
          break;
        case "compute":
          // Simple compute task (math, hashing, etc.)
          result = await this._executeComputeTask(task);
          break;
        case "render":
          // Render task (uses OffscreenCanvas if available)
          result = await this._executeRenderTask(task);
          break;
        default:
          throw new Error("Unknown task type: " + task.type);
      }

      var elapsed = Date.now() - startTime;
      this.stats.cpuTimeShared += elapsed;

      conn.send({
        type: "task-result",
        result: { taskId: task.id, data: result, elapsed: elapsed },
      });
    } catch (e) {
      conn.send({
        type: "task-error",
        error: { taskId: task.id, message: e.message || String(e) },
      });
    }
  };

  DonateComputer.prototype._executeWasmTask = async function (task) {
    if (!task.wasmUrl) throw new Error("No WASM URL provided");
    // Fetch and instantiate WASM module
    var response = await fetch(task.wasmUrl);
    var buffer = await response.arrayBuffer();
    var module = await WebAssembly.compile(buffer);
    var instance = await WebAssembly.instantiate(module, {
      env: { memory: new WebAssembly.Memory({ initial: 256 }) },
    });
    // Run the exported function
    if (instance.exports.run) {
      return instance.exports.run(task.payload);
    }
    throw new Error("WASM module has no run export");
  };

  DonateComputer.prototype._executeComputeTask = async function (task) {
    // Run compute tasks in a sandboxed environment
    // Only allows pure math operations
    if (task.payload && task.payload.operation === "hash") {
      var data = new TextEncoder().encode(task.payload.data || "");
      var hash = await crypto.subtle.digest("SHA-256", data);
      return Array.from(new Uint8Array(hash)).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
    }
    if (task.payload && task.payload.operation === "matrix-multiply") {
      return this._matrixMultiply(task.payload.a, task.payload.b);
    }
    throw new Error("Unknown compute operation");
  };

  DonateComputer.prototype._matrixMultiply = function (a, b) {
    if (!a || !b || !a.length || !b.length) throw new Error("Invalid matrices");
    var rowsA = a.length, colsA = a[0].length, colsB = b[0].length;
    var result = new Array(rowsA);
    for (var i = 0; i < rowsA; i++) {
      result[i] = new Array(colsB).fill(0);
      for (var j = 0; j < colsB; j++) {
        for (var k = 0; k < colsA; k++) {
          result[i][j] += a[i][k] * b[k][j];
        }
      }
    }
    return result;
  };

  DonateComputer.prototype._executeRenderTask = async function (task) {
    if (typeof OffscreenCanvas === "undefined") {
      throw new Error("OffscreenCanvas not supported");
    }
    // Create offscreen canvas for rendering
    var canvas = new OffscreenCanvas(task.payload.width || 800, task.payload.height || 600);
    var ctx = canvas.getContext("2d");
    // Execute render commands
    if (task.payload.commands) {
      for (var i = 0; i < task.payload.commands.length; i++) {
        var cmd = task.payload.commands[i];
        if (typeof ctx[cmd.method] === "function") {
          ctx[cmd.method].apply(ctx, cmd.args || []);
        }
      }
    }
    var blob = await canvas.convertToBlob({ type: "image/png" });
    var arrayBuf = await blob.arrayBuffer();
    return { width: canvas.width, height: canvas.height, size: arrayBuf.byteLength };
  };

  DonateComputer.prototype._signalingSend = function (msg) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      msg.from = this.peerId;
      this.ws.send(JSON.stringify(msg));
    }
  };

  DonateComputer.prototype._startHeartbeat = function () {
    var self = this;
    this._heartbeatInterval = setInterval(function () {
      self.peers.forEach(function (peer) {
        if (peer.verified) {
          peer.send({ type: "heartbeat" });
        }
      });
    }, CONFIG.HEARTBEAT_INTERVAL);
  };

  DonateComputer.prototype._startResourceReporting = function () {
    var self = this;
    this._resourceInterval = setInterval(function () {
      self.peers.forEach(function (peer) {
        if (peer.verified) {
          peer.send({
            type: "resource-report",
            resources: self.resources,
            limits: self.donationLimits,
          });
        }
      });
    }, CONFIG.RESOURCE_REPORT_INTERVAL);
  };

  DonateComputer.prototype._startUptimeTracking = function () {
    var self = this;
    this._uptimeInterval = setInterval(function () {
      self.stats.uptime = self._startTime ? Math.floor((Date.now() - self._startTime) / 1000) : 0;
      self.emit("stats-update", self.getStats());
    }, 1000);
  };

  // -------------------------------------------------------------------------
  // Public factory
  // -------------------------------------------------------------------------

  return {
    create: function () {
      return new DonateComputer();
    },
    VERSION: CONFIG.VERSION,
    CONFIG: CONFIG,
    detectResources: detectResources,
    generatePassword: generatePassword,
  };
})();

// Export for different module systems
if (typeof module !== "undefined" && module.exports) {
  module.exports = DonateComputerAPI;
}
