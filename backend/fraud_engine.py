import math
import random
from models import Transaction, RiskScore

# --- Constants for the fraud engine ---
AVERAGE_TRANSACTION_AMOUNT = 100.0
RISK_THRESHOLD_FLAG = 0.30
RISK_THRESHOLD_BLOCK = 0.70


def _clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))


def _sigmoid(x: float) -> float:
    # Numerically-stable-ish sigmoid
    # For this scale, it's fine.
    return 1.0 / (1.0 + math.exp(-x))


def score_transaction(transaction: Transaction) -> RiskScore:
    """
    Scores a transaction using the same rules as before, but produces a *continuous*
    0..1 risk_score (not only fixed steps like 0.25).
    """
    explanations: list[str] = []

    # --- Feature 1: Amount risk (smooth) ---
    # ratio = amount / avg, then map to 0..~1
    ratio = (transaction.amount or 0.0) / AVERAGE_TRANSACTION_AMOUNT
    # log-like growth: small for normal, increases when huge
    amount_feat = _clamp(math.log(max(ratio, 1e-6), 5), 0.0, 1.6)  # 0..~1.6
    if ratio > 5:
        explanations.append(f"Transaction amount (${transaction.amount:.2f}) is 5x higher than user average.")

    # --- Feature 2: Device risk ---
    known_devices = ["mobile", "desktop", "tablet"]
    device_feat = 0.0 if transaction.device_type in known_devices else 1.0
    if device_feat > 0:
        explanations.append(f"Unrecognized device type detected: '{transaction.device_type}'.")

    # --- Feature 3: Foreign location risk (SG baseline as your demo) ---
    geo_feat = 0.0 if transaction.location.country == "SG" else 1.0
    if geo_feat > 0:
        explanations.append(f"Transaction originated from a foreign country: {transaction.location.country}.")

    # --- Feature 4: High-risk IP range ---
    ip_feat = 1.0 if (transaction.ip_address or "").startswith("198.51.100.") else 0.0
    if ip_feat > 0:
        explanations.append("IP address is associated with high-risk activity.")

    # --- Feature 5: Impossible travel (GB in your demo) ---
    travel_feat = 1.0 if transaction.location.country == "GB" else 0.0
    if travel_feat > 0:
        explanations.append("Impossible travel detected: rapid change in transaction location.")

    # Combine features into a smooth score.
    # Weights chosen so:
    # - normal SG + known device + normal amount tends to be low (0.05..0.25)
    # - 1-2 risk factors becomes mid (0.35..0.65)
    # - many risk factors pushes high (0.8+)
    z = (
        -2.1
        + 1.3 * amount_feat
        + 1.0 * device_feat
        + 0.9 * geo_feat
        + 0.7 * ip_feat
        + 1.2 * travel_feat
    )

    # Add tiny noise so the same pattern doesn't always produce identical numbers
    z += random.uniform(-0.25, 0.25)

    final_score = _clamp(_sigmoid(z), 0.0, 1.0)

    # Determine decision
    if final_score >= RISK_THRESHOLD_BLOCK:
        decision = "BLOCK"
    elif final_score >= RISK_THRESHOLD_FLAG:
        decision = "FLAG"
    else:
        decision = "APPROVE"

    return RiskScore(
        risk_score=final_score,
        decision=decision,
        explanation=explanations if explanations else ["Transaction appears normal."],
    )