import { API_BASE_URL } from "./config";

/**
 * Small fetch wrapper for the FastAPI backend.
 * Keeps responses consistent and throws useful errors.
 */
async function request(path, { method = "GET", body, headers } = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(headers ?? {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  // FastAPI returns JSON by default; still guard in case of errors
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const msg =
      (data && (data.detail || data.message)) ||
      `Request failed: ${method} ${path} (${res.status})`;
    throw new Error(msg);
  }

  return data;
}

export const api = {
  // POST /risk-score
  getRiskScore(transaction) {
    return request("/risk-score", { method: "POST", body: transaction });
  },

  // GET /user-profile/{user_id}
  getUserProfile(userId) {
    return request(`/user-profile/${encodeURIComponent(userId)}`);
  },

  // POST /simulate-attack
  simulateAttack(numTransactions) {
    return request("/simulate-attack", {
      method: "POST",
      body: { num_transactions: numTransactions },
    });
  },
};