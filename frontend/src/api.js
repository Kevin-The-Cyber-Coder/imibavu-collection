/* Imibavu Collection — API client
   - Access token lives in memory only (never localStorage)
   - Refresh token is an httpOnly cookie; on 401 we silently refresh and retry */
import API_BASE from "./config";

export const api = (() => {
  let accessToken = null;
  let refreshing = null;

  function setAccessToken(t) { accessToken = t || null; }
  function getAccessToken() { return accessToken; }

  /* Stable per-browser id so guest carts/orders can live on the server too. */
  function guestId() {
    try {
      let g = localStorage.getItem("imibavu_gid");
      if (!g) {
        g = "g_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
        localStorage.setItem("imibavu_gid", g);
      }
      return g;
    } catch (e) { return "g_fallback"; }
  }

  async function request(path, opts = {}) {
    const { method = "GET", body, retry = true } = opts;
    const headers = { "x-guest-id": guestId() };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (accessToken) headers["Authorization"] = "Bearer " + accessToken;

    let res;
    try {
      res = await fetch(API_BASE + path, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        credentials: "include",
      });
    } catch (e) {
      throw { status: 0, code: "NETWORK", message: "Cannot reach the server — are you online?" };
    }

    if (res.status === 401 && retry && !path.startsWith("/auth/login") && !path.startsWith("/auth/register")) {
      const ok = await refresh();
      if (ok) return request(path, { method, body, retry: false });
    }

    let data = null;
    try { data = await res.json(); } catch (e) { /* empty body */ }

    if (!res.ok) {
      const err = (data && data.error) || {};
      throw {
        status: res.status,
        code: err.code || "ERROR",
        message: err.message || "Request failed",
        details: err.details,
      };
    }
    return data;
  }

  async function refresh() {
    if (refreshing) return refreshing;
    refreshing = (async () => {
      try {
        const res = await fetch(API_BASE + "/auth/refresh", {
          method: "POST",
          credentials: "include",
        });
        if (!res.ok) { accessToken = null; return false; }
        const data = await res.json();
        accessToken = data.accessToken || null;
        return data;
      } catch (e) {
        accessToken = null;
        return false;
      } finally {
        refreshing = null;
      }
    })();
    return refreshing;
  }

  const get = (path) => request(path);
  const post = (path, body) => request(path, { method: "POST", body: body || {} });
  const put = (path, body) => request(path, { method: "PUT", body: body || {} });
  const patch = (path, body) => request(path, { method: "PATCH", body: body || {} });
  const del = (path) => request(path, { method: "DELETE" });

  /* Multipart upload — used for product images (no JSON body/Content-Type). */
  async function postForm(path, formData) {
    const headers = { "x-guest-id": guestId() };
    if (accessToken) headers["Authorization"] = "Bearer " + accessToken;
    let res;
    try {
      res = await fetch(API_BASE + path, { method: "POST", headers, body: formData, credentials: "include" });
    } catch (e) {
      throw { status: 0, code: "NETWORK", message: "Cannot reach the server — are you online?" };
    }
    if (res.status === 401) {
      const ok = await refresh();
      if (ok) return postForm(path, formData);
    }
    let data = null;
    try { data = await res.json(); } catch (e) { /* empty body */ }
    if (!res.ok) {
      const err = (data && data.error) || {};
      throw { status: res.status, code: err.code || "ERROR", message: err.message || "Upload failed", details: err.details };
    }
    return data;
  }

  async function logout() {
    try { await post("/auth/logout"); } catch (e) { /* cookie may already be gone */ }
    accessToken = null;
  }

  return { get, post, put, patch, del, postForm, refresh, logout, setAccessToken, getAccessToken, guestId };
})();

export default api;