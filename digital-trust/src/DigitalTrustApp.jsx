import React, { useEffect, useMemo, useState } from 'react';
import { Shield, CheckCircle, AlertTriangle, Ban, User, RefreshCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const getWsUrl = () => {
  if (typeof window === 'undefined') return '';
  const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  // same-origin websocket; in dev, Vite proxy should forward /transactions/* to backend with ws: true
  return `${wsProtocol}://${window.location.host}/transactions/live`;
};

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

const safeText = (v, fallback = '—') => {
  if (v === null || v === undefined || v === '') return fallback;
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return fallback;
  }
};

const formatMoney = (amount, currency) => {
  const n = Number(amount);
  if (Number.isNaN(n)) return `${safeText(amount, '')} ${safeText(currency, '')}`.trim() || '—';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: typeof currency === 'string' ? currency : 'USD',
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${n.toFixed(2)} ${typeof currency === 'string' ? currency : ''}`.trim() || '—';
  }
};

const riskColor = (decision) => {
  switch ((decision || '').toUpperCase()) {
    case 'APPROVE':
      return 'text-green-400 bg-green-500/10 border-green-500/30';
    case 'FLAG':
      return 'text-yellow-300 bg-yellow-500/10 border-yellow-500/30';
    case 'BLOCK':
      return 'text-red-400 bg-red-500/10 border-red-500/30';
    default:
      return 'text-slate-300 bg-slate-500/10 border-slate-500/30';
  }
};

const riskIcon = (decision) => {
  switch ((decision || '').toUpperCase()) {
    case 'APPROVE':
      return <CheckCircle className="w-4 h-4" />;
    case 'FLAG':
      return <AlertTriangle className="w-4 h-4" />;
    case 'BLOCK':
      return <Ban className="w-4 h-4" />;
    default:
      return null;
  }
};

export default function DigitalTrustApp() {
  const [transactions, setTransactions] = useState([]);
  const [riskStats, setRiskStats] = useState({ approve: 0, flag: 0, block: 0 });
  const [chartData, setChartData] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [connectionError, setConnectionError] = useState('');
  const [selectedTx, setSelectedTx] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // User profile panel state
  const [userId, setUserId] = useState('user_001');
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');

  // WebSocket connection for live transactions
  useEffect(() => {
    let ws;
    let reconnectTimeout;

    const connect = () => {
      const url = getWsUrl();
      console.log('Attempting WebSocket connection to:', url);
      ws = new WebSocket(url);

      ws.onopen = () => {
        setConnectionStatus('connected');
        setConnectionError('');
        console.log('✅ WebSocket connected successfully');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const { transaction, risk_analysis } = data;

          const enriched = { ...transaction, risk_analysis };

          setTransactions((prev) => [enriched, ...prev].slice(0, 50));

          const decision = (risk_analysis?.decision || 'APPROVE').toLowerCase();
          setRiskStats((prev) => ({
            ...prev,
            approve: prev.approve + (decision === 'approve' ? 1 : 0),
            flag: prev.flag + (decision === 'flag' ? 1 : 0),
            block: prev.block + (decision === 'block' ? 1 : 0),
          }));

          setChartData((prev) => {
            const timestamp = new Date().toLocaleTimeString();
            const next = [
              ...prev,
              {
                time: timestamp,
                approve: decision === 'approve' ? 1 : 0,
                flag: decision === 'flag' ? 1 : 0,
                block: decision === 'block' ? 1 : 0,
                score: Number(risk_analysis?.risk_score ?? risk_analysis?.score ?? 0),
              },
            ].slice(-30);
            return next;
          });
        } catch (error) {
          console.error('Error parsing WebSocket data:', error);
        }
      };

      ws.onerror = () => {
        setConnectionStatus('error');
        const errorMsg =
          '❌ WebSocket error. If you are in dev, ensure Vite proxy ws=true and backend is running on port 8000.';
        setConnectionError(errorMsg);
        console.error(errorMsg);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected, retrying in 3 seconds...');
        setConnectionStatus('connecting');
        reconnectTimeout = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, []);

  // Simulate attack
  const simulateAttack = async () => {
    setIsSimulating(true);
    try {
      const response = await fetch('/simulate-attack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ num_transactions: 5 }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      const result = await response.json();
      console.log('✅ Attack simulated successfully:', result);
    } catch (error) {
      console.error('❌ Attack simulation failed:', error);
      alert(`Simulation Error: ${error.message}`);
    } finally {
      setIsSimulating(false);
    }
  };

  const loadProfile = async (uid = userId) => {
    setProfileLoading(true);
    setProfileError('');
    try {
      const res = await fetch(`/user-profile/${encodeURIComponent(uid)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const json = await res.json();
      setProfile(json);
    } catch (e) {
      setProfile(null);
      setProfileError(e.message || String(e));
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    loadProfile(userId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pieData = useMemo(
    () => [
      { name: 'APPROVE', value: riskStats.approve, color: '#34d399' },
      { name: 'FLAG', value: riskStats.flag, color: '#fbbf24' },
      { name: 'BLOCK', value: riskStats.block, color: '#fb7185' },
    ],
    [riskStats],
  );

  const latest = transactions[0];
  const latestDecision = latest?.risk_analysis?.decision;

  const safeLocationText = (loc) => {
    if (!loc) return '—';
    if (typeof loc === 'string') return loc;
    if (isPlainObject(loc)) {
      const city = loc.city ?? '';
      const country = loc.country ?? '';
      const lat = loc.lat ?? loc.latitude;
      const lon = loc.lon ?? loc.lng ?? loc.longitude;
      const place = [city, country].filter(Boolean).join(', ').trim();
      const coords =
        lat !== undefined && lon !== undefined ? ` (${Number(lat).toFixed(4)}, ${Number(lon).toFixed(4)})` : '';
      return (place || 'Location') + coords;
    }
    return safeText(loc);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="bg-slate-950/80 backdrop-blur border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-2 rounded-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">FraudShield AI</h1>
              <p className="text-sm text-slate-400">Real-time Fraud Detection</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {connectionError && (
              <div className="text-xs text-red-400 max-w-xs text-right">{connectionError}</div>
            )}

            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  connectionStatus === 'connected'
                    ? 'bg-green-500'
                    : connectionStatus === 'connecting'
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                }`}
              />
              <span className="text-sm text-slate-300">
                {connectionStatus === 'connected'
                  ? 'Connected'
                  : connectionStatus === 'connecting'
                    ? 'Connecting...'
                    : 'Disconnected'}
              </span>
            </div>

            <motion.button
              onClick={simulateAttack}
              disabled={isSimulating || connectionStatus !== 'connected'}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center min-w-[160px]"
              title={connectionStatus !== 'connected' ? 'Connect to backend first' : ''}
            >
              {isSimulating ? 'Simulating...' : '🔴 Simulate Attack'}
            </motion.button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-12 gap-6">
        {/* Left: Live Feed */}
        <section className="col-span-12 lg:col-span-7 bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-white font-semibold">Live Transaction Feed</h2>
            <span className="text-xs text-slate-400">{transactions.length} events</span>
          </div>

          <div className="max-h-[560px] overflow-auto">
            {transactions.length === 0 ? (
              <div className="p-6 text-slate-300">
                No transactions yet. If you’re “Connected” but still see none, check the WS frames in
                DevTools → Network → WS → /transactions/live.
              </div>
            ) : (
              <ul className="divide-y divide-slate-800">
                {transactions.map((tx, idx) => {
                  const decision = tx?.risk_analysis?.decision || 'APPROVE';

                  // location could be string OR object depending on your backend generator
                  const locationValue = tx?.location ?? tx?.geo ?? tx?.location_data ?? tx?.merchant_location;

                  return (
                    <li
                      key={safeText(tx?.transaction_id ?? tx?.id ?? idx, String(idx))}
                      className="px-5 py-4 hover:bg-slate-900/70 cursor-pointer"
                      onClick={() => setSelectedTx(tx)}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="text-sm text-white truncate">
                            {safeText(tx?.merchant || tx?.merchant_name || 'Merchant')} •{' '}
                            {formatMoney(tx?.amount, tx?.currency)}
                          </div>
                          <div className="text-xs text-slate-400 truncate">
                            {safeText(tx?.user_id, 'unknown-user')} • {safeLocationText(locationValue)} •{' '}
                            {tx?.timestamp ? new Date(tx.timestamp).toLocaleString() : '—'}
                          </div>
                        </div>

                        <div
                          className={`shrink-0 inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold ${riskColor(
                            decision,
                          )}`}
                        >
                          {riskIcon(decision)}
                          {safeText(decision).toUpperCase()}
                        </div>
                      </div>

                      <div className="mt-2 text-xs text-slate-400">
                        Risk score:{' '}
                        <span className="text-slate-200 font-semibold">
                          {safeText(tx?.risk_analysis?.risk_score ?? tx?.risk_analysis?.score, '—')}
                        </span>
                        {Array.isArray(tx?.risk_analysis?.reasons) && tx.risk_analysis.reasons.length ? (
                          <>
                            {' '}
                            • <span className="text-slate-300">{safeText(tx.risk_analysis.reasons[0])}</span>
                          </>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {/* Right: Risk + Profile */}
        <section className="col-span-12 lg:col-span-5 grid gap-6">
          {/* Risk overview */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-white font-semibold mb-4">Risk Overview</h2>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-xs text-slate-400">Approve</div>
                <div className="text-xl text-white font-bold">{riskStats.approve}</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-xs text-slate-400">Flag</div>
                <div className="text-xl text-white font-bold">{riskStats.flag}</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-xs text-slate-400">Block</div>
                <div className="text-xl text-white font-bold">{riskStats.block}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="h-44 min-h-[176px]">
                <div className="text-xs text-slate-400 mb-2">Decision mix</div>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70}>
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="h-44 min-h-[176px]">
                <div className="text-xs text-slate-400 mb-2">Latest decision</div>
                <div
                  className={`h-[calc(100%-24px)] rounded-xl border flex items-center justify-center text-center p-4 ${riskColor(
                    latestDecision,
                  )}`}
                >
                  <div>
                    <div className="flex items-center justify-center gap-2 text-sm font-semibold">
                      {riskIcon(latestDecision)} {safeText(latestDecision || '—').toUpperCase()}
                    </div>
                    <div className="mt-2 text-xs text-slate-300">
                      Latest risk score:{' '}
                      <span className="font-semibold text-slate-100">
                        {safeText(latest?.risk_analysis?.risk_score ?? latest?.risk_analysis?.score, '—')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 h-56 min-h-[224px]">
              <div className="text-xs text-slate-400 mb-2">Recent risk trend (events)</div>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="time" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="approve" stackId="1" stroke="#34d399" fill="#34d399" fillOpacity={0.25} />
                  <Area type="monotone" dataKey="flag" stackId="1" stroke="#fbbf24" fill="#fbbf24" fillOpacity={0.25} />
                  <Area type="monotone" dataKey="block" stackId="1" stroke="#fb7185" fill="#fb7185" fillOpacity={0.25} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* User profile */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-white font-semibold flex items-center gap-2">
                <User className="w-4 h-4" /> User Profile
              </h2>

              <button
                onClick={() => loadProfile(userId)}
                className="text-xs px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white inline-flex items-center gap-2"
                disabled={profileLoading}
                title="Reload profile"
              >
                <RefreshCcw className={`w-4 h-4 ${profileLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            <div className="flex gap-2 mb-3">
              <input
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full bg-slate-950/50 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-slate-600"
                placeholder="user id (e.g. user_001)"
              />
              <button
                onClick={() => loadProfile(userId)}
                className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
                disabled={profileLoading || !userId.trim()}
              >
                Load
              </button>
            </div>

            {profileError ? <div className="text-sm text-red-400">{profileError}</div> : null}

            {!profile && !profileError ? <div className="text-sm text-slate-300">No profile loaded.</div> : null}

            {profile ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                  <div className="text-xs text-slate-400">User</div>
                  <div className="text-white font-semibold">{safeText(profile.user_id)}</div>
                  <div className="mt-2 text-xs text-slate-400">Trust score</div>
                  <div className="text-2xl text-white font-bold">{safeText(profile.trust_score)}</div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                  <div className="text-sm text-white font-semibold mb-2">Device usage</div>
                  <div className="text-xs text-slate-300">
                    Mobile:{' '}
                    <span className="text-white font-semibold">
                      {safeText(profile.device_usage_breakdown?.mobile)}%
                    </span>
                    {' • '}
                    Desktop:{' '}
                    <span className="text-white font-semibold">
                      {safeText(profile.device_usage_breakdown?.desktop)}%
                    </span>
                    {' • '}
                    Tablet:{' '}
                    <span className="text-white font-semibold">
                      {safeText(profile.device_usage_breakdown?.tablet)}%
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                  <div className="text-sm text-white font-semibold mb-2">Spending distribution</div>
                  <div className="space-y-1">
                    {Object.entries(profile.spending_distribution || {}).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between text-xs text-slate-300">
                        <span>{safeText(k)}</span>
                        <span className="text-white font-semibold">{safeText(v)}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* NEW: Location clusters panel (safe rendering to avoid React object child crash) */}
                {Array.isArray(profile.location_clusters) && profile.location_clusters.length ? (
                  <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                    <div className="text-sm text-white font-semibold mb-2">Location clusters</div>
                    <div className="space-y-2">
                      {profile.location_clusters.slice(0, 5).map((c, idx) => (
                        <div key={idx} className="text-xs text-slate-300 flex items-center justify-between gap-3">
                          <span className="truncate">
                            {safeLocationText(c)}
                          </span>
                          <span className="text-white font-semibold">
                            {safeText(c?.transactions, '0')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>

        {/* Modal / detail */}
        {selectedTx ? (
          <div className="col-span-12">
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-white font-semibold">Selected Transaction (raw)</h2>
                <button
                  onClick={() => setSelectedTx(null)}
                  className="text-sm px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white"
                >
                  Close
                </button>
              </div>
              <pre className="mt-4 text-xs text-slate-200 overflow-auto bg-slate-950/60 border border-slate-800 rounded-xl p-4">
{JSON.stringify(selectedTx, null, 2)}
              </pre>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}