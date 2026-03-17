
import random
import uuid
from datetime import datetime

from models import Transaction, Location

# Mock data for generating realistic transactions
USER_IDS = [f'user_{i}' for i in range(1, 11)]
DEVICE_TYPES = ['mobile', 'desktop', 'tablet']
LOCATIONS = [
    Location(lat=1.3521, lon=103.8198, city='Singapore', country='SG'),
    Location(lat=3.1390, lon=101.6869, city='Kuala Lumpur', country='MY'),
    Location(lat=14.5995, lon=120.9842, city='Manila', country='PH'),
    Location(lat=-6.2088, lon=106.8456, city='Jakarta', country='ID'),
    Location(lat=13.7563, lon=100.5018, city='Bangkok', country='TH'),
    Location(lat=21.0278, lon=105.8342, city='Hanoi', country='VN'),
    # Add a non-SEA location for fraud simulation
    Location(lat=51.5074, lon=-0.1278, city='London', country='GB'),
]

def generate_transaction(is_fraudulent: bool = False) -> Transaction:
    """Generates a single random transaction, with an option to make it suspicious."""
    user_id = random.choice(USER_IDS)
    
    if is_fraudulent:
        # Generate a transaction with multiple risk factors
        amount = round(random.uniform(1000, 5000), 2) # Unusually high amount
        location = random.choice([loc for loc in LOCATIONS if loc.country != 'SG']) # Foreign location
        device_type = 'unknown' # New device
        ip_address = f"198.51.100.{random.randint(1, 254)}" # Known high-risk IP range
    else:
        # Generate a normal transaction
        amount = round(random.uniform(5, 200), 2)
        location = random.choice([loc for loc in LOCATIONS if loc.country in ['SG', 'MY', 'ID']])
        device_type = random.choice(DEVICE_TYPES)
        ip_address = f"10.{random.randint(0, 255)}.{random.randint(0, 255)}.{random.randint(1, 254)}"

    return Transaction(
        transaction_id=str(uuid.uuid4()),
        user_id=user_id,
        amount=amount,
        location=location,
        device_type=device_type,
        ip_address=ip_address,
        timestamp=datetime.utcnow()
    )
