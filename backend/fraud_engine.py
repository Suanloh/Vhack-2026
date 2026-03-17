
from models import Transaction, RiskScore

# --- Constants for the fraud engine ---
AVERAGE_TRANSACTION_AMOUNT = 100.0
RISK_THRESHOLD_FLAG = 0.5
RISK_THRESHOLD_BLOCK = 0.8

# --- Rule-based risk scoring logic ---

def score_transaction(transaction: Transaction) -> RiskScore:
    """Scores a transaction based on a set of predefined rules."""
    risk_score = 0.0
    explanations = []

    # Rule 1: High transaction amount
    if transaction.amount > AVERAGE_TRANSACTION_AMOUNT * 5:
        risk_score += 0.35
        explanations.append(f"Transaction amount (${transaction.amount:.2f}) is 5x higher than user average.")

    # Rule 2: New or unrecognized device
    if transaction.device_type not in ["mobile", "desktop", "tablet"]:
        risk_score += 0.25
        explanations.append(f"Unrecognized device type detected: '{transaction.device_type}'.")

    # Rule 3: Transaction from a foreign location
    # For this demo, we'll consider anything outside of Singapore (SG) as foreign.
    if transaction.location.country != 'SG':
        risk_score += 0.25
        explanations.append(f"Transaction originated from a foreign country: {transaction.location.country}.")

    # Rule 4: High-risk IP address
    # For this demo, we'll use a mock high-risk IP range.
    if transaction.ip_address.startswith("198.51.100."):
        risk_score += 0.20
        explanations.append("IP address is associated with high-risk activity.")
        
    # Rule 5: Impossible travel detection (basic)
    # This is a placeholder for a more complex check. 
    # For instance, if the last transaction was in SG 10 minutes ago and this one is in the US.
    # We'll simulate this by checking for a specific country.
    if transaction.location.country == 'GB': # Great Britain
        risk_score += 0.40 # High risk for impossible travel
        explanations.append("Impossible travel detected: rapid change in transaction location.")


    # Normalize risk score to be between 0 and 1 (though it can exceed 1 with these rules)
    final_score = min(risk_score, 1.0)

    # Determine decision based on the final score
    if final_score >= RISK_THRESHOLD_BLOCK:
        decision = "BLOCK"
    elif final_score >= RISK_THRESHOLD_FLAG:
        decision = "FLAG"
    else:
        decision = "APPROVE"

    return RiskScore(
        risk_score=final_score,
        decision=decision,
        explanation=explanations if explanations else ["Transaction appears normal."]
    )
