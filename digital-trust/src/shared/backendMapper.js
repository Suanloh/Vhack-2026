export function mapBackendPayloadToUiTx(payload) {
  const t = payload.transaction;
  const r = payload.risk_analysis;

  const ts = new Date(t.timestamp);

  return {
    id: t.transaction_id,
    amount: t.amount,
    city: t.location?.city ?? "Unknown",
    device: t.device_type ?? "unknown",
    type: "Wallet Tx",
    hour: ts.getHours(),
    anomalyScore: r.risk_score, // 0..1
    decision: r.decision,       // APPROVE/FLAG/BLOCK
    latency: Math.floor(Math.random() * 120 + 30), // demo
    isFraud: r.decision === "BLOCK",
    riskFactors: r.explanation ?? [],
    ipReputation: Math.random() * 100,
    deviceTrust: Math.random() * 100,
    behaviorMatch: 50 + Math.random() * 50,
    timestamp: ts,
    explanation: r.explanation ?? [],
    riskScorePercent: Math.round((r.risk_score ?? 0) * 100),
  };
}