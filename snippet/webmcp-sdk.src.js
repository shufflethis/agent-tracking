/* Optional early-registration helper. Load synchronously before application WebMCP setup. */
(function () {
  var script = document.currentScript;
  var domain = script && script.getAttribute("data-domain");
  if (!domain) return;
  var endpoint = script.src.replace(/\/agent-webmcp-sdk\.js.*$/, "") + "/api/event";
  function send(event) {
    event.p = location.pathname;
    if (typeof crypto !== "undefined" && crypto.randomUUID) { event.id = crypto.randomUUID(); event.at = Date.now(); }
    var body = JSON.stringify({ d: domain, v: event.id ? 2 : 1, e: [event] });
    if (!(navigator.sendBeacon && navigator.sendBeacon(endpoint, new Blob([body], { type: "text/plain" })))) {
      fetch(endpoint, { method: "POST", body: body, keepalive: true, mode: "cors", headers: { "content-type": "text/plain" } }).catch(function () {});
    }
  }
  function code(error) {
    var name = error && error.name;
    return typeof name === "string" && /^[A-Za-z]{1,32}Error$/.test(name) ? name : "Error";
  }
  function wrapTool(tool) {
    if (!tool || typeof tool.execute !== "function" || tool.__wmt) return tool;
    var original = tool.execute, name = String(tool.name || "tool").slice(0, 128);
    var wrapped = Object.assign({}, tool, { execute: function (args, ctx) {
      var start = performance.now(), finished = false, timer = null, signal = ctx && ctx.signal;
      function finish(state, error) {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        if (signal && signal.removeEventListener) signal.removeEventListener("abort", abort);
        send({ k: "tool_call", n: name, s: state, ok: state === "completed" ? true : state === "failed" ? false : null, ms: Math.round(performance.now() - start), e: error ? code(error) : undefined });
      }
      function abort() { finish("cancelled"); }
      if (signal && signal.addEventListener) {
        if (signal.aborted) abort();
        else signal.addEventListener("abort", abort);
      }
      if (!finished) timer = setTimeout(function () { finish("timed_out"); }, 60000);
      try {
        var result = original.apply(this, arguments);
        if (result && typeof result.then === "function") return result.then(function (value) { finish("completed"); return value; }, function (error) { finish(error && error.name === "AbortError" ? "cancelled" : "failed", error); throw error; });
        finish("completed");
        return result;
      } catch (error) { finish(error && error.name === "AbortError" ? "cancelled" : "failed", error); throw error; }
    } });
    wrapped.__wmt = 1;
    return wrapped;
  }
  window.AgentTrackingWebMCP = {
    wrapTool: wrapTool,
    registerTool: function (tool, options) {
      var context = document.modelContext;
      if (!context || typeof context.registerTool !== "function") throw new Error("WebMCP is not supported in this browser");
      var result = context.registerTool(wrapTool(tool), options);
      function accepted() {
        send({ k: "tool_registered", n: String(tool.name).slice(0, 128) });
        if (options && options.signal && options.signal.addEventListener) options.signal.addEventListener("abort", function () { send({ k: "tool_removed", n: String(tool.name).slice(0, 128) }); }, { once: true });
      }
      if (result && typeof result.then === "function") result.then(accepted, function () {});
      else accepted();
      return result;
    },
  };
})();
