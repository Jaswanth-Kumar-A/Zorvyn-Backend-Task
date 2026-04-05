const DEFAULT_BACKEND_URL = "http://localhost:8000";

function normalizeBackendUrl(url) {
  return String(url || DEFAULT_BACKEND_URL).replace(/\/$/, "");
}

function getForwardHeaders(req) {
  const headers = { ...req.headers };
  delete headers.host;
  delete headers.connection;
  delete headers["content-length"];
  return headers;
}

function getProxyPath(req) {
  const path = req.query?.path;
  if (Array.isArray(path)) {
    return path.join("/");
  }
  return path || "";
}

async function readRequestBody(req) {
  if (["GET", "HEAD"].includes(req.method || "GET")) {
    return undefined;
  }

  if (req.body === undefined || req.body === null) {
    return undefined;
  }

  if (typeof req.body === "string" || Buffer.isBuffer(req.body)) {
    return req.body;
  }

  return JSON.stringify(req.body);
}

export default async function handler(req, res) {
  const backendUrl = normalizeBackendUrl(process.env.BACKEND_URL);
  const proxyPath = getProxyPath(req);
  const incomingUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const targetUrl = `${backendUrl}/${proxyPath}${incomingUrl.search}`.replace(/\/$/, proxyPath ? "" : "/");

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: getForwardHeaders(req),
      body: await readRequestBody(req),
    });

    res.status(response.status);
    response.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (!["connection", "content-encoding", "content-length", "transfer-encoding"].includes(lowerKey)) {
        res.setHeader(key, value);
      }
    });

    const body = Buffer.from(await response.arrayBuffer());
    res.send(body);
  } catch (error) {
    res.status(502).json({
      message: "Unable to reach backend service",
      detail: error instanceof Error ? error.message : "Unknown proxy error"
    });
  }
}
