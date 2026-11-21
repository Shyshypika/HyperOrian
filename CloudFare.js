const GAME_PROXY_URL = "https://thevoiveexchange.com";

const HTML_UI = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Classes</title>
  <style>
    * { box-sizing: border-box; font-family: system-ui, sans-serif; }
    body { margin: 0; display: flex; flex-direction: column; height: 100vh; background: #121218; color: #fff; }
    #topbar { display: flex; flex-wrap: wrap; gap: 8px; padding: 10px; background: #1e1e28; border-bottom: 1px solid #333; align-items: center; }
    input { padding: 8px 10px; border-radius: 6px; border: 1px solid #444; background: #2a2a36; color: #fff; font-size: 14px; }
    #queryInput { flex: 1; min-width: 200px; }
    button { padding: 8px 14px; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; background: #6c5ce7; color: #fff; }
    button:hover { opacity: 0.9; }
    #homeBtn { background: #3b3b4f; }
    #gameBtn { background: #e17055; }
    #cloakBtn { background: #00b894; }
    iframe { flex: 1; border: none; width: 100%; background: #fff; }
  </style>
</head>
<body>
  <div id="topbar">
    <button id="homeBtn" title="Back to FrogFind">Home</button>
    <input id="queryInput" type="text" placeholder="Quick search on FrogFind or paste https://..." />
    <button id="goBtn">Search</button>
    <button id="gameBtn" title="Launch full 3D game proxy in about:blank">3D Games (Cloaked)</button>
    <button id="cloakBtn" title="Hide this page inside about:blank">Cloak Tab</button>
  </div>
  <iframe id="viewer"></iframe>

  <script id="appScript">
    const WORKER_URL = window.location.origin;
    const GAME_PROXY = "${GAME_PROXY_URL}";
    const SEARCH_HOME = "http://frogfind.com";
    const SEARCH_QUERY = "http://frogfind.com?q=";

    const queryInput = document.getElementById("queryInput");
    const viewer = document.getElementById("viewer");

    function loadUrl(targetUrl) {
      viewer.src = WORKER_URL + "/?url=" + encodeURIComponent(targetUrl);
    }

    function navigate() {
      let q = queryInput.value.trim();
      if (!q) {
        loadUrl(SEARCH_HOME);
        return;
      }
      let targetUrl = q;
      if (!q.startsWith("http://") && !q.startsWith("https://")) {
        targetUrl = SEARCH_QUERY + encodeURIComponent(q);
      }
      loadUrl(targetUrl);
    }

    loadUrl(SEARCH_HOME);

    document.getElementById("homeBtn").addEventListener("click", () => {
      queryInput.value = "";
      loadUrl(SEARCH_HOME);
    });

    document.getElementById("goBtn").addEventListener("click", navigate);
    queryInput.addEventListener("keypress", (e) => { if (e.key === "Enter") navigate(); });

    // Launch beautiful.thevoiveexchange.com directly inside an about:blank tab
    document.getElementById("gameBtn").addEventListener("click", () => {
      const win = window.open("about:blank", "_blank");
      if (!win) {
        alert("Pop-up blocked! Allow pop-ups to launch the cloaked game tab.");
        return;
      }
      win.document.write('<!DOCTYPE html><html><head><title>Classes</title></head><body style="margin:0;overflow:hidden;"><iframe src="' + GAME_PROXY + '" style="width:100vw;height:100vh;border:none;"></iframe></body></html>');
      win.document.close();
    });

    // Cloak the current page inside about:blank
    document.getElementById("cloakBtn").addEventListener("click", () => {
      const win = window.open("about:blank", "_blank");
      if (!win) {
        alert("Pop-up blocked! Allow pop-ups to use the about:blank cloak.");
        return;
      }
      win.document.open();
      win.document.write("<!DOCTYPE html><html><head><title>Classes</title>" + document.head.innerHTML + "</head><body>" + document.body.innerHTML + "</body></html>");
      win.document.close();

      const oldScript = win.document.getElementById("appScript");
      if (oldScript) oldScript.remove();
      const newScript = win.document.createElement("script");
      newScript.textContent = document.getElementById("appScript").textContent.replace("window.location.origin", '"' + WORKER_URL + '"');
      win.document.body.appendChild(newScript);
    });
  </script>
</body>
</html>`;

export default {
  async fetch(request) {
    const reqUrl = new URL(request.url);
    let targetUrl =
      reqUrl.searchParams.get("url") ||
      decodeURIComponent(reqUrl.pathname.slice(1) + reqUrl.search);

    if (targetUrl) {
      targetUrl = targetUrl.replace(/^https?:\/\/[:/]+/i, "https://").replace(/&amp;/gi, "&");

      if (/frogfind\.com\/(read|go)(\.php)?/i.test(targetUrl)) {
        try {
          const parsed = new URL(targetUrl);
          const realSite = parsed.searchParams.get("a") || parsed.searchParams.get("url");
          if (realSite) targetUrl = realSite;
        } catch {}
      }
    }

    if ((!targetUrl || !targetUrl.startsWith("http")) && reqUrl.searchParams.has("q")) {
      targetUrl = `http://frogfind.com?q=${encodeURIComponent(reqUrl.searchParams.get("q"))}`;
    }

    if (!targetUrl || !targetUrl.startsWith("http")) {
      return new Response(HTML_UI, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const cleanHeaders = new Headers({
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      });

      const fetchOptions = {
        method: request.method,
        headers: cleanHeaders,
        redirect: "follow",
      };

      if (request.method === "POST") {
        fetchOptions.body = await request.arrayBuffer();
        const ct = request.headers.get("Content-Type");
        if (ct) cleanHeaders.set("Content-Type", ct);
      }

      const response = await fetch(targetUrl, fetchOptions);
      const contentType = response.headers.get("content-type") || "";
      const newHeaders = new Headers(response.headers);
      Object.entries(corsHeaders).forEach(([k, v]) => newHeaders.set(k, v));
      newHeaders.delete("X-Frame-Options");
      newHeaders.delete("Content-Security-Policy");
      newHeaders.delete("Content-Security-Policy-Report-Only");

      if (contentType.includes("text/html")) {
        let body = await response.text();
        const base = new URL(response.url || targetUrl);
        const proxyPrefix = `${reqUrl.origin}/?url=`;

        body = body.replace(
          /(href|src)=["']([^"']+)["']/gi,
          (match, attr, link) => {
            if (
              link.startsWith("data:") ||
              link.startsWith("javascript:") ||
              link.startsWith("#") ||
              link.startsWith("mailto:")
            ) {
              return match;
            }
            try {
              const decodedLink = link.replace(/&amp;/gi, "&");
              const resolved = new URL(decodedLink, base.href).href;
              return `${attr}="${proxyPrefix}${encodeURIComponent(resolved)}"`;
            } catch {
              return match;
            }
          }
        );

        const hookScript = `<script>
          (function() {
            const p = "${proxyPrefix}";
            const b = "${base.href}";
            const wrap = (u) => {
              if (!u || typeof u !== "string" || u.startsWith(p) || u.startsWith("data:") || u.startsWith("blob:")) return u;
              try { return p + encodeURIComponent(new URL(u, b).href); } catch { return u; }
            };
            const origFetch = window.fetch;
            window.fetch = function(input, init) {
              if (typeof input === "string") input = wrap(input);
              return origFetch.call(this, input, init);
            };
            const origOpen = XMLHttpRequest.prototype.open;
            XMLHttpRequest.prototype.open = function(m, url, ...rest) {
              return origOpen.call(this, m, wrap(url), ...rest);
            };
            document.addEventListener("submit", function(e) {
              const form = e.target;
              if (!form) return;
              e.preventDefault();
              const action = (form.getAttribute("action") || "/").replace(/^https?:\\/\\/[:/]+/i, "https://");
              const dest = new URL(action, b);
              new FormData(form).forEach((v, k) => dest.searchParams.set(k, v));
              window.location.href = p + encodeURIComponent(dest.href);
            }, true);
          })();
        </script>`;

        body = body.replace(/<head[^>]*>/i, (m) => `${m}${hookScript}`);
        return new Response(body, { status: response.status, headers: newHeaders });
      }

      return new Response(response.body, {
        status: response.status,
        headers: newHeaders,
      });
    } catch (err) {
      return new Response("Proxy Error: " + err.message, {
        status: 500,
        headers: corsHeaders,
      });
    }
  },
};
