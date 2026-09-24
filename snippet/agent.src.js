/* agent-tracking agent.js v1: what AI agents do on this site. No cookies, no storage, no identifiers.
   <script defer data-domain="example.com" src="https://agenttracking.co/agent.js"></script>  */
(function () {
  var s = document.currentScript, d = s && s.getAttribute("data-domain");
  if (!d) return;
  var ep = (s.src.replace(/\/agent\.js.*$/, "") || "") + "/api/event";
  var q = [], timer = null;
  var ids = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function";

  function send() {
    if (!q.length) return;
    var body = JSON.stringify({ d: d, e: q.splice(0, 50), v: ids ? 2 : 1 });
    try {
      // text/plain keeps the beacon a simple request: no preflight on someone else's origin.
      if (!(navigator.sendBeacon && navigator.sendBeacon(ep, new Blob([body], { type: "text/plain" })))) {
        fetch(ep, { method: "POST", body: body, keepalive: true, mode: "cors", headers: { "content-type": "text/plain" } }).catch(function () {});
      }
    } catch (e) {}
    if (q.length) send();
  }
  function push(ev) {
    ev.p = location.pathname;
    if (ids) { ev.id = crypto.randomUUID(); ev.at = Date.now(); }
    q.push(ev);
    if (q.length >= 20) return send();
    if (!timer) timer = setTimeout(function () { timer = null; send(); }, 3000);
  }
  addEventListener("pagehide", send);
  addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden") send(); });

  /* FNV-1a, 32 bit, hex. Enough to tell "changed" from "same"; never a secret. */
  function h(str) {
    var x = 2166136261;
    for (var i = 0; i < str.length; i++) { x ^= str.charCodeAt(i); x = Math.imul(x, 16777619); }
    return (x >>> 0).toString(16);
  }
  function errOf(e) {
    var n = e && e.name;
    return typeof n === "string" && /^[A-Za-z]{1,32}Error$/.test(n) ? n : "Error";
  }

  /* A. AI referrals and B. AI fetches: one view event; the server reads Referer and User-Agent. */
  var ref = "";
  try { ref = document.referrer ? new URL(document.referrer).host : ""; } catch (e) {}
  var utm = "";
  try { utm = new URLSearchParams(location.search).get("utm_source") || ""; } catch (e) {}
  push({ k: "view", r: ref, u: utm });

  /* C. WebMCP tool calls. */
  function wrapTool(t, sim) {
    if (!t || typeof t.execute !== "function" || t.__wmt) return t;
    var name = String(t.name || "tool").slice(0, 128);
    var exec = t.execute;
    var wrapped = Object.assign({}, t, {
      execute: function (args, ctx) {
        var t0 = performance.now(), done = false, timeout = null, sig = ctx && ctx.signal;
        function finish(state, error) {
          if (done) return;
          done = true;
          clearTimeout(timeout);
          if (sig && sig.removeEventListener) sig.removeEventListener("abort", abort);
          push({ k: "tool_call", n: name, ms: Math.round(performance.now() - t0), ok: state === "completed" ? true : state === "failed" ? false : null, s: state, e: error ? errOf(error) : undefined, sim: sim });
        }
        function abort() { finish("cancelled"); }
        if (sig && sig.addEventListener) {
          if (sig.aborted) abort();
          else sig.addEventListener("abort", abort);
        }
        if (!done) timeout = setTimeout(function () { finish("timed_out"); }, 60000);
        try {
          var r = exec.apply(this, arguments);
          if (r && typeof r.then === "function") {
            return r.then(function (v) {
              finish("completed");
              return v;
            }, function (e) {
              finish(e && e.name === "AbortError" ? "cancelled" : "failed", e);
              throw e;
            });
          }
          finish("completed");
          return r;
        } catch (e) {
          finish(e && e.name === "AbortError" ? "cancelled" : "failed", e);
          throw e;
        }
      }
    });
    wrapped.__wmt = 1;
    return wrapped;
  }
  function instrument(mc) {
    if (!mc || mc.__wmt) return;
    mc.__wmt = 1;
    var reg = mc.registerTool;
    if (typeof reg === "function") mc.registerTool = function (t, o) {
      if (t && t.__wmt) return reg.call(this, t, o);
      var result = reg.call(this, wrapTool(t), o);
      function accepted() {
        push({ k: "tool_registered", n: String(t.name).slice(0, 128), dh: h(String(t.description || "")), sh: h(JSON.stringify(t.inputSchema || null)) });
        if (o && o.signal && o.signal.addEventListener) o.signal.addEventListener("abort", function () { push({ k: "tool_removed", n: String(t.name).slice(0, 128) }); }, { once: true });
      }
      if (result && typeof result.then === "function") result.then(accepted, function () {});
      else accepted();
      return result;
    };
    if (typeof mc.getTools === "function" && mc.addEventListener) {
      var known = Object.create(null);
      function snapshot() {
        mc.getTools({ fromOrigins: [location.origin] }).then(function (list) {
          var next = Object.create(null);
          list.forEach(function (t) {
            if (t.origin !== location.origin) return;
            var name = String(t.name || "").slice(0, 128), schema = h(JSON.stringify(t.inputSchema || null));
            if (!name) return;
            next[name] = schema;
            if (known[name] !== schema) push({ k: "tool_discovered", n: name, sh: schema });
          });
          for (var name in known) if (!next[name]) push({ k: "tool_removed", n: name });
          known = next;
        }).catch(function () {});
      }
      mc.addEventListener("toolchange", snapshot);
      snapshot();
    }
    if (mc.addEventListener) {
      mc.addEventListener("toolactivated", function (ev) { if (ev.toolName) push({ k: "tool_activation_signal", n: String(ev.toolName).slice(0, 128) }); });
      mc.addEventListener("toolcancel", function (ev) { if (ev.toolName) push({ k: "tool_cancel_signal", n: String(ev.toolName).slice(0, 128) }); });
    }
  }
  /* Capture an existing API now, and newly available APIs during startup. */
  var tries = 0, poll = setInterval(function () {
    var mc = document.modelContext || navigator.modelContext;
    if (mc) instrument(mc);
    if (++tries > 60) clearInterval(poll);
  }, 250);
  instrument(document.modelContext || navigator.modelContext);

  /* Declarative forms: submit is an attempt, not a completed tool call. */
  addEventListener("submit", function (ev) {
    var f = ev.target, n = f && f.getAttribute && f.getAttribute("toolname");
    if (!n) return;
    setTimeout(function () { push({ k: "form_attempt", n: String(n).slice(0, 128), s: ev.defaultPrevented ? "cancelled" : "attempted", d: 1 }); }, 0);
  });

  /* Goal markers observe attempts; no actor or business result is inferred. */
  var pendingForm = null;
  addEventListener("click", function (ev) {
    var el = ev.target && ev.target.closest && ev.target.closest("[data-agent-goal]");
    if (!el || el.tagName === "FORM") return;
    push({ k: "goal_attempt", n: String(el.getAttribute("data-agent-goal")).slice(0, 128) });
    var button = ev.target.closest && ev.target.closest("button,input[type=submit]");
    if (button && button.form && (!button.type || button.type === "submit" || button.type === "image")) {
      pendingForm = button.form;
      setTimeout(function () { pendingForm = null; }, 0);
    }
  });
  addEventListener("submit", function (ev) {
    var f = ev.target, el = f && f.closest && f.closest("[data-agent-goal]");
    if (pendingForm === f) { pendingForm = null; return; }
    if (el) push({ k: "goal_attempt", n: String(el.getAttribute("data-agent-goal")).slice(0, 128) });
  });

  /* The manifest, hashed once per visit: on the entry page (no referrer, or one from another host). */
  /* Without storage that is the nearest thing to once per session, and a missing manifest logs one 404, not one per page. */
  if (!ref || ref !== location.host) try {
    fetch("/.well-known/webmcp", { cache: "force-cache", credentials: "omit" }).then(function (r) {
      if (r.ok) return r.text().then(function (t) { push({ k: "manifest", h: h(t) }); });
    }).catch(function () {});
  } catch (e) {}

  /* For a demo page only (data-demo on the script tag): run a tool as if an agent had, marked as simulated. */
  if (s.hasAttribute("data-demo")) window.__wmtSimulate = function (t, args) { return wrapTool(t, 1).execute(args || {}, {}); };
})();
