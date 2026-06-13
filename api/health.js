const respond = (res, status, payload) => {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
};

const runHandlerGet = async (mod) => {
  const out = { status: null, body: null, headers: {} };
  const req = { method: "GET", headers: {}, body: undefined };
  const res = {
    status(code) {
      out.status = code;
      return this;
    },
    setHeader(key, value) {
      out.headers[key] = value;
      return this;
    },
    end(body) {
      out.body = body;
      return this;
    }
  };

  await mod.default(req, res);
  return out;
};

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return respond(res, 405, { error: "Method not allowed" });
  }

  const checks = [];
  const targets = [
    ["submit-application", "./submit-application.js"],
    ["submit-artistic-nude", "./submit-artistic-nude.js"],
    ["dashboard", "./dashboard.js"],
    ["dashboard-artistic-nude", "./dashboard-artistic-nude.js"],
      ["dashboard-application-events", "./dashboard-application-events.js"],
    ["admin-login", "./admin-login.js"]
  ];

  for (const [name, path] of targets) {
    const result = { name, path, importOk: false, invokeOk: false };
    try {
      const mod = await import(path);
      result.importOk = true;
      try {
        const invoke = await runHandlerGet(mod);
        result.invokeOk = true;
        result.status = invoke.status;
        result.body = invoke.body;
      } catch (invokeError) {
        result.invokeError = String(invokeError?.stack || invokeError);
      }
    } catch (importError) {
      result.importError = String(importError?.stack || importError);
    }
    checks.push(result);
  }

  return respond(res, 200, {
    ok: true,
    runtime: process.version,
    checks
  });
}
