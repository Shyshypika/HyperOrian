function renderRetroFrame(targetSrc) {
  return [
    "<!DOCTYPE html>",
    '<html lang="en">',
    "<head>",
    '  <meta charset="UTF-8" />',
    "  <title>HyperOrain</title>",
    "  <style>",
    "    html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #fff; }",
    "    iframe { width: 100%; height: 100%; border: none; }",
    "  </style>",
    "</head>",
    "<body>",
    '  <iframe src="' + targetSrc + '"></iframe>',
    "</body>",
    "</html>"
  ].join("\n");
}

export default {
  async fetch(request) {
    try {
      var reqUrl = new URL(request.url);
      var baseHeaders = {
        "Content-Type": "text/html; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Content-Security-Policy": "frame-ancestors *"
      };

      var targetUrl = reqUrl.searchParams.get("url") || "";
      var directQuery = reqUrl.searchParams.get("q") || "";

      if (!targetUrl && !directQuery && reqUrl.pathname.length > 1) {
        try {
          targetUrl = decodeURIComponent(reqUrl.pathname.slice(1) + reqUrl.search);
        } catch (e) {
          targetUrl = "";
        }
      }

      if (directQuery && !targetUrl) {
        return new Response(
          renderRetroFrame("https://hyperorainweb.onrender.com" + encodeURIComponent(directQuery)),
          { headers: baseHeaders }
        );
      }

      if (!targetUrl || !targetUrl.startsWith("http")) {
        return new Response(renderRetroFrame("https://hyperorainweb.onrender.com"), { headers: baseHeaders });
      }

      targetUrl = targetUrl.trim().replace(/^https?:\/\/[:/]+/i, "https://").replace(/&amp;/gi, "&");

      if (targetUrl.startsWith("https://hyperorainweb.onrender.com")) {
        return new Response(renderRetroFrame(targetUrl), { headers: baseHeaders });
      }

      if (/frogfind\.com\/(read|go)(\.php)?/i.test(targetUrl)) {
        try {
          var parsedFrog = new URL(targetUrl);
          var realFrog = parsedFrog.searchParams.get("a") || parsedFrog.searchParams.get("url");
          if (realFrog) targetUrl = realFrog;
        } catch (e) {}
      }

      var corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Content-Security-Policy": "frame-ancestors *"
      };

      if (request.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
      }

var cleanHeaders = new Headers({
  "User-Agent": "Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1)",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5"
});


      var fetchOptions = {
        method: request.method,
        headers: cleanHeaders,
        redirect: "follow"
      };

      if (request.method === "POST") {
        fetchOptions.body = await request.arrayBuffer();
        var ct = request.headers.get("Content-Type");
        if (ct) cleanHeaders.set("Content-Type", ct);
      }

      var response = await fetch(targetUrl, fetchOptions);
      var contentType = response.headers.get("content-type") || "";
      var newHeaders = new Headers(response.headers);
      Object.entries(corsHeaders).forEach(function(pair) {
        newHeaders.set(pair.at(0), pair.at(1));
      });
      newHeaders.delete("X-Frame-Options");
      newHeaders.delete("Content-Security-Policy-Report-Only");

      if (contentType.includes("text/html")) {
        var body = await response.text();
        var base = new URL(response.url || targetUrl);
        var proxyPrefixHtml = reqUrl.origin + "/?url=";

        body = body.replace(/<meta[^>]*http-equiv=["']?Content-Security-Policy["']?[^>]*>/gi, "");

        body = body.replace(
          /(href|src)=["']([^"']+)["']/gi,
          function(match, attr, link) {
            if (
              link.startsWith("data:") ||
              link.startsWith("javascript:") ||
              link.startsWith("#") ||
              link.startsWith("mailto:")
            ) {
              return match;
            }
            try {
              var decodedLink = link.replace(/&amp;/gi, "&");
              var resolved = new URL(decodedLink, base.href).href;
              return attr + '="' + proxyPrefixHtml + encodeURIComponent(resolved) + '"';
            } catch (e) {
              return match;
            }
          }
        );

        var hookScript = [
          "<script>",
          "(function() {",
          '  var p = "' + proxyPrefixHtml + '";',
          '  var b = "' + base.href + '";',
          "  function wrap(u) {",
          '    if (!u || typeof u !== "string" || u.startsWith(p) || u.startsWith("data:") || u.startsWith("blob:")) return u;',
          "    try { return p + encodeURIComponent(new URL(u, b).href); } catch (e) { return u; }",
          "  }",
          "  var origFetch = window.fetch;",
          "  window.fetch = function(input, init) {",
          '    if (typeof input === "string") input = wrap(input);',
          "    return origFetch.call(this, input, init);",
          "  };",
          "  var origOpen = XMLHttpRequest.prototype.open;",
          "  XMLHttpRequest.prototype.open = function(m, url) {",
          "    var args = Array.from(arguments);",
          "    args.splice(1, 1, wrap(url));",
          "    return origOpen.apply(this, args);",
          "  };",
          '  document.addEventListener("submit", function(e) {',
          "    var form = e.target;",
          "    if (!form) return;",
          "    e.preventDefault();",
          '    var action = form.getAttribute("action") || "/";',
          "    var dest = new URL(action, b);",
          "    new FormData(form).forEach(function(v, k) { dest.searchParams.set(k, v); });",
          "    window.location.href = p + encodeURIComponent(dest.href);",
          "  }, true);",
          "})();",
          "</script>"
        ].join("\n");

        body = body + "\n" + hookScript;

        return new Response(body, { status: response.status, headers: newHeaders });
      }

      return new Response(response.body, {
        status: response.status,
        headers: newHeaders
      });
    } catch (err) {
      var msg = err && err.message ? err.message : String(err);
      return new Response("Worker Error: " + msg, {
        status: 500,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
  }
};
