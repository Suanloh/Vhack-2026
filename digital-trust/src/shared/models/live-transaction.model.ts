
export interface Location {
    lat: number;
    lon: number;
    city: string;
    country: string;
}

export interface Transaction {
    transaction_id: string;
    user_id: string;
    amount: number;
    location: Location;
    device_type: string;
    ip_address: string;
    timestamp: string; 
}

export interface RiskAnalysis {
    risk_score: number;
    decision: string;
    explanation: string[];
}

export interface LiveTransaction {
    transaction: Transaction;
    risk_analysis: RiskAnalysis;
}
