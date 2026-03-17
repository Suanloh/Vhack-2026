
export interface UserProfile {
    user_id: string;
    trust_score: number;
    spending_distribution: { [key: string]: number };
    active_hour_heatmap: { [key: string]: number };
    device_usage_breakdown: { [key: string]: number };
    location_clusters: Array<{ lat: number; lon: number; transactions: number }>;
}
