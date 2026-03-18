import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Shield,
  CheckCircle,
  AlertTriangle,
  Ban,
  Activity,
  Clock,
  User,
  MapPin,
  Layers,
  Cpu,
} from 'lucide-react';
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
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  ZAxis,
  Legend,
} from 'recharts';

/**
 * FUTURE BACKEND HOOKS (where to extend later)
 * - Add endpoint GET /metrics (rolling counts, avg latency, fraud rate) instead of computing on the client.
 * - Add endpoint GET /baseline/{user_id} for behavioral baseline features (avg amount, stdev, home geo, active hours).
 * - Add endpoint POST /score (or reuse /risk-score) that returns {decision, score, reasons, latency_ms, feature_deltas}.
 * - Add endpoint GET /ip-reputation/{ip} and GET /device/{fingerprint} for contextual signals.
 * - Add WebSocket message fields: {latency_ms, user_id, ip, device_id, merchant_category} for richer UI.
 */

const DESCRIPTION =
  'Conventional rule-based fraud detection systems are often inadequate in identifying sophisticated or evolving fraud patterns. ' +
  'For the underbanked, this leads to false declines—blocking legitimate users who don’t have traditional banking histories. ' +
  'Our ML-powered shield addresses this by building behavioral baselines, scoring anomalies in real time, handling extreme class imbalance, ' +
  'and integrating contextual signals beyond the transaction itself.';

const getWsUrl = () => {
  if (typeof window === 'undefined') return '';
  const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  // Same-origin websocket; in dev, Vite proxy forwards /transactions/* -> backend (ws: true)
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
  const c = typeof currency === 'string' ? currency : 'USD';
  if (Number.isNaN(n)) return safeText(amount, '—');
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: c,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${n.toFixed(2)} ${c}`;
  }
};

const riskColor = (decision) => {
  switch ((decision || '').toUpperCase()) {
    case 'APPROVE':
      return 'text-green-300 bg-green-500/10 border-green-500/30';
    case 'FLAG':
      return 'text-yellow-200 bg-yellow-500/10 border-yellow-500/30';
    case 'BLOCK':
      return 'text-red-300 bg-red-500/10 border-red-500/30';
    default:
      return 'text-slate-200 bg-slate-500/10 border-slate-500/30';
  }
};

const riskDot = (decision) => {
  switch ((decision || '').toUpperCase()) {
    case 'APPROVE':
      return 'bg-green-500';
    case 'FLAG':
      return 'bg-yellow-500';
    case 'BLOCK':
      return 'bg-red-500';
    default:
      return 'bg-slate-500';
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

const kpiCard = (title, value, sub, icon, accentClass) => (
  <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
    <div className="flex items-center justify-between">
      <div className="text-xs uppercase tracking-wide text-slate-400">{title}</div>
      <div className={`p-2 rounded-xl border border-slate-800 bg-slate-950/40 ${accentClass || ''}`}>
        {icon}
      </div>
    </div>
    <div className="mt-3 text-3xl font-bold text-white">{value}</div>
    <div className="mt-1 text-xs text-slate-400">{sub}</div>
  </div>
);

const TabButton = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={[
      'px-4 py-2 rounded-xl text-sm font-semibold border transition-colors',
      active
        ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-200'
        : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-900/60',
    ].join(' ')}
  >
    {children}
  </button>
);

export default function DigitalTrustApp() {
  const [tab, setTab] = useState('imbalance'); // default like your screenshot
  const [transactions, setTransactions] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [connectionError, setConnectionError] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);

  // UI-only latency estimate (future: backend-provided latency_ms)
  const latencyRef = useRef([]);
  const [avgLatencyMs, setAvgLatencyMs] = useState(90);

  // User profile panel (mock endpoint already exists)
  const [userId, setUserId] = useState('user_001');
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');

  // WebSocket live stream
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
        const t0 = performance.now();
        try {
          const data = JSON.parse(event.data);
          const { transaction, risk_analysis } = data;

          const enriched = { ...transaction, risk_analysis, _receivedAt: Date.now() };
          setTransactions((prev) => [enriched, ...prev].slice(0, 200));

          // UI-only "latency" estimation: time to parse+set state (not real model latency)
          const t1 = performance.now();
          latencyRef.current = [...latencyRef.current, Math.max(1, Math.round(t1 - t0))].slice(-40);
          const avg = Math.round(
            latencyRef.current.reduce((a, b) => a + b, 0) / Math.max(1, latencyRef.current.length),
          );
          // keep it in a reasonable range for demo display
          setAvgLatencyMs(Math.max(5, Math.min(250, avg * 30))); // scaled to look realistic
        } catch (error) {
          console.error('Error parsing WebSocket data:', error);
        }
      };

      ws.onerror = () => {
        setConnectionStatus('error');
        const errorMsg =
          '❌ WebSocket error. In dev, ensure Vite proxy ws=true and backend is running on port 8000.';
        setConnectionError(errorMsg);
        console.error(errorMsg);
      };

      ws.onclose = () => {
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

  const simulateAttack = async () => {
    setIsSimulating(true);
    try {
      const response = await fetch('/simulate-attack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ num_transactions: 8 }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      const result = await response.json();
      console.log('✅ Attack simulated successfully:', result);
    } catch (e) {
      console.error('❌ Attack simulation failed:', e);
      alert(`Simulation Error: ${e.message || String(e)}`);
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

  // Derive counts from the live stream
  const metrics = useMemo(() => {
    let approve = 0;
    let flag = 0;
    let block = 0;
    for (const tx of transactions) {
      const d = (tx?.risk_analysis?.decision || 'APPROVE').toUpperCase();
      if (d === 'APPROVE') approve += 1;
      else if (d === 'FLAG') flag += 1;
      else if (d === 'BLOCK') block += 1;
    }
    const total = transactions.length;
    const fraud = block + flag; // UI definition (future: use tx.is_fraud label)
    const legit = approve;

    return {
      total,
      approve,
      flag,
      block,
      fraud,
      legit,
      fraudRate: total ? Math.round((fraud / total) * 1000) / 10 : 0,
      approveRate: total ? Math.round((approve / total) * 100) : 0,
      flagRate: total ? Math.round((flag / total) * 100) : 0,
      blockRate: total ? Math.round((block / total) * 100) : 0,
    };
  }, [transactions]);

  // Charts
  const decisionPieData = useMemo(
    () => [
      { name: 'APPROVE', value: metrics.approve, color: '#22c55e' },
      { name: 'FLAG', value: metrics.flag, color: '#f59e0b' },
      { name: 'BLOCK', value: metrics.block, color: '#ef4444' },
    ],
    [metrics],
  );

  const timelineData = useMemo(() => {
    // build last 30 events timeline chart
    const last = [...transactions].slice(0, 30).reverse();
    return last.map((tx, i) => {
      const d = (tx?.risk_analysis?.decision || 'APPROVE').toUpperCase();
      return {
        idx: i + 1,
        approve: d === 'APPROVE' ? 1 : 0,
        flag: d === 'FLAG' ? 1 : 0,
        block: d === 'BLOCK' ? 1 : 0,
      };
    });
  }, [transactions]);

  const spendingBarData = useMemo(() => {
    const dist = profile?.spending_distribution || {};
    return Object.entries(dist).map(([k, v]) => ({ name: k, value: Number(v) || 0 }));
  }, [profile]);

  const activeHoursData = useMemo(() => {
    const hm = profile?.active_hour_heatmap || {};
    // convert to array of {hour, value}
    return Object.entries(hm)
      .map(([h, v]) => ({ hour: h, value: Number(v) || 0 }))
      .sort((a, b) => a.hour.localeCompare(b.hour));
  }, [profile]);

  const devicePieData = useMemo(() => {
    const d = profile?.device_usage_breakdown || {};
    return [
      { name: 'mobile', value: Number(d.mobile) || 0, color: '#60a5fa' },
      { name: 'desktop', value: Number(d.desktop) || 0, color: '#a78bfa' },
      { name: 'tablet', value: Number(d.tablet) || 0, color: '#34d399' },
    ];
  }, [profile]);

  const locationScatter = useMemo(() => {
    const clusters = Array.isArray(profile?.location_clusters) ? profile.location_clusters : [];
    // recharts Scatter expects numeric x/y
    return clusters
      .map((c) => ({
        lat: Number(c?.lat),
        lon: Number(c?.lon),
        transactions: Number(c?.transactions) || 0,
        label: `${safeText(c?.city, '')}${c?.city && c?.country ? ', ' : ''}${safeText(c?.country, '')}`.trim(),
      }))
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));
  }, [profile]);

  const latencyLabel = `${avgLatencyMs}ms`;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Top description (like your image) */}
        <div className="text-slate-300 leading-relaxed max-w-5xl">
          <p>{DESCRIPTION}</p>
        </div>

        {/* Title row */}
        <div className="mt-10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-2 rounded-xl">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                <h1 className="text-2xl font-bold">Fraud Shield — Live</h1>
              </div>
              <div className="text-sm text-slate-400">
                {connectionStatus === 'connected' ? 'Streaming' : 'Connecting…'}
                {connectionError ? ` • ${connectionError}` : ''}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-800 bg-slate-900/30 text-slate-200">
              <Activity className="w-4 h-4 text-slate-300" />
              <span className="text-sm">{connectionStatus === 'connected' ? 'Streaming' : 'Offline'}</span>
            </div>

            <motion.button
              onClick={simulateAttack}
              disabled={isSimulating || connectionStatus !== 'connected'}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="px-5 py-3 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-slate-700 font-semibold"
              title={connectionStatus !== 'connected' ? 'Connect to backend first' : ''}
            >
              {isSimulating ? 'Simulating…' : 'Simulate Attack'}
            </motion.button>
          </div>
        </div>

        {/* KPI row */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {kpiCard('TOTAL', metrics.total, 'events received', <Activity className="w-4 h-4 text-slate-200" />)}
          {kpiCard(
            'APPROVED',
            metrics.approve,
            `${metrics.approveRate}%`,
            <CheckCircle className="w-4 h-4 text-green-300" />,
            'text-green-300',
          )}
          {kpiCard(
            'FLAGGED',
            metrics.flag,
            `${metrics.flagRate}%`,
            <AlertTriangle className="w-4 h-4 text-yellow-200" />,
            'text-yellow-200',
          )}
          {kpiCard(
            'BLOCKED',
            metrics.block,
            `${metrics.blockRate}%`,
            <Ban className="w-4 h-4 text-red-300" />,
            'text-red-300',
          )}
          {kpiCard(
            'AVG LATENCY',
            latencyLabel,
            '< 200ms target (UI estimate)',
            <Clock className="w-4 h-4 text-cyan-200" />,
            'text-cyan-200',
          )}
        </div>

        {/* Tabs (buttons under KPI like your image) */}
        <div className="mt-6 flex flex-wrap gap-3">
          <TabButton active={tab === 'scoring'} onClick={() => setTab('scoring')}>
            Anomaly Scoring
          </TabButton>
          <TabButton active={tab === 'profiling'} onClick={() => setTab('profiling')}>
            Behavioral Profiling
          </TabButton>
          <TabButton active={tab === 'imbalance'} onClick={() => setTab('imbalance')}>
            Imbalanced Handling
          </TabButton>
          <TabButton active={tab === 'context'} onClick={() => setTab('context')}>
            Contextual Data
          </TabButton>
          <TabButton active={tab === 'profile'} onClick={() => setTab('profile')}>
            User Profile
          </TabButton>
        </div>

        {/* Content */}
        <div className="mt-6">
          {tab === 'imbalance' ? (
            <div className="space-y-5">
              <div className="flex items-start gap-3">
                <div className="p-3 rounded-2xl border border-indigo-500/30 bg-indigo-600/10">
                  <Layers className="w-5 h-5 text-indigo-200" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Imbalanced Class Handling</h2>
                  <p className="text-slate-400 mt-1">
                    UI-only demo. Future backend: train with SMOTE oversampling & focal loss (fraud is rare), then deploy a
                    low-latency scorer.
                  </p>
                </div>
              </div>

              {/* small stats row */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                {kpiCard('Total Tx', metrics.total, 'live window', <Activity className="w-4 h-4 text-slate-200" />)}
                {kpiCard('Fraud', metrics.fraud, 'flag+block (UI)', <Ban className="w-4 h-4 text-red-300" />)}
                {kpiCard('Legitimate', metrics.legit, 'approved', <CheckCircle className="w-4 h-4 text-green-300" />)}
                {kpiCard('Fraud Rate', `${metrics.fraudRate}%`, 'live window', <AlertTriangle className="w-4 h-4 text-yellow-200" />)}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
                  <div className="text-sm font-semibold mb-2">Class Imbalance</div>
                  <div className="h-56 min-h-[224px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Legit', value: metrics.legit, color: '#22c55e' },
                            { name: 'Fraud', value: metrics.fraud, color: '#ef4444' },
                          ]}
                          dataKey="value"
                          innerRadius={55}
                          outerRadius={85}
                        >
                          <Cell fill="#22c55e" />
                          <Cell fill="#ef4444" />
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    Future: apply SMOTE (train only) or class-weighting/focal loss to reduce false negatives while controlling FPR.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
                  <div className="text-sm font-semibold mb-2">SMOTE Rebalancing (illustration)</div>
                  <div className="h-56 min-h-[224px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { name: 'Before', legit: Math.max(metrics.legit, 1), fraud: Math.max(metrics.fraud, 1) },
                          { name: 'After (SMOTE)', legit: Math.max(metrics.legit, 1), fraud: Math.max(metrics.legit, 1) },
                        ]}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                        <XAxis dataKey="name" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="legit" fill="#22c55e" />
                        <Bar dataKey="fraud" fill="#ef4444" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    Future: SMOTE generates synthetic minority examples; use only on training set to avoid leakage.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
                  <div className="text-sm font-semibold mb-2">Focal vs Cross-Entropy (illustration)</div>
                  <div className="h-56 min-h-[224px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={Array.from({ length: 12 }).map((_, i) => ({
                          step: i + 1,
                          focal: Math.max(0.1, 0.9 - i * 0.07),
                          xent: Math.max(0.35, 0.95 - i * 0.05),
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                        <XAxis dataKey="step" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip />
                        <Area type="monotone" dataKey="xent" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.18} />
                        <Area type="monotone" dataKey="focal" stroke="#a78bfa" fill="#a78bfa" fillOpacity={0.18} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    Future: focal loss down-weights easy negatives so training focuses on hard, rare fraud examples.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {tab === 'scoring' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-8 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
                <div className="flex items-start gap-3">
                  <div className="p-3 rounded-2xl border border-cyan-500/30 bg-cyan-600/10">
                    <Activity className="w-5 h-5 text-cyan-200" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Real-Time Anomaly Scoring</h2>
                    <p className="text-slate-400 mt-1">
                      Live decisions based on the backend scorer. Future: expose latency_ms + feature deltas + explanations per transaction.
                    </p>
                  </div>
                </div>

                <div className="mt-4 h-56 min-h-[224px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timelineData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                      <XAxis dataKey="idx" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip />
                      <Area type="monotone" dataKey="approve" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.18} />
                      <Area type="monotone" dataKey="flag" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.18} />
                      <Area type="monotone" dataKey="block" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.18} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="lg:col-span-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
                <div className="text-sm font-semibold mb-2">Decision Mix</div>
                <div className="h-56 min-h-[224px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={decisionPieData} dataKey="value" innerRadius={55} outerRadius={85}>
                        {decisionPieData.map((d) => (
                          <Cell key={d.name} fill={d.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Future: show “reasons” from backend per tx (e.g., new device, geo-velocity, amount z-score).
                </p>
              </div>

              <div className="lg:col-span-12 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
                <div className="text-sm font-semibold mb-3">Live Transaction Feed</div>
                <div className="max-h-[360px] overflow-auto rounded-xl border border-slate-800 bg-slate-950/40">
                  {transactions.length === 0 ? (
                    <div className="p-4 text-slate-300">Waiting for transactions…</div>
                  ) : (
                    <ul className="divide-y divide-slate-800">
                      {transactions.slice(0, 60).map((tx, idx) => {
                        const decision = (tx?.risk_analysis?.decision || 'APPROVE').toUpperCase();
                        return (
                          <li key={idx} className="p-3 flex items-center justify-between gap-4">
                            <div className="min-w-0">
                              <div className="text-sm truncate">
                                <span className="text-white font-semibold">
                                  {safeText(tx?.merchant || tx?.merchant_name || 'Merchant')}
                                </span>
                                <span className="text-slate-400"> • </span>
                                <span className="text-slate-200">{formatMoney(tx?.amount, tx?.currency)}</span>
                              </div>
                              <div className="text-xs text-slate-400 truncate">
                                {safeText(tx?.user_id, 'unknown-user')} • {tx?.timestamp ? new Date(tx.timestamp).toLocaleString() : '—'}
                              </div>
                            </div>

                            <div className={`shrink-0 inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold ${riskColor(decision)}`}>
                              <span className={`w-2 h-2 rounded-full ${riskDot(decision)}`} />
                              {riskIcon(decision)}
                              {decision}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {tab === 'profiling' ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
              <div className="flex items-start gap-3">
                <div className="p-3 rounded-2xl border border-emerald-500/30 bg-emerald-600/10">
                  <Cpu className="w-5 h-5 text-emerald-200" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Behavioral Profiling</h2>
                  <p className="text-slate-400 mt-1">
                    UI-only demo. Future backend: build per-user baseline (amount mean/std, home geo cluster, active hours),
                    then score deviations (z-score, geo-velocity, velocity spikes).
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                  <div className="text-sm font-semibold mb-2">Active Hours</div>
                  <div className="h-56 min-h-[224px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={activeHoursData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                        <XAxis dataKey="hour" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip />
                        <Bar dataKey="value" fill="#34d399" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                  <div className="text-sm font-semibold mb-2">Spending Distribution</div>
                  <div className="h-56 min-h-[224px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={spendingBarData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                        <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip />
                        <Bar dataKey="value" fill="#60a5fa" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                  <div className="text-sm font-semibold mb-2">Device Mix</div>
                  <div className="h-56 min-h-[224px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={devicePieData} dataKey="value" innerRadius={55} outerRadius={85}>
                          {devicePieData.map((d) => (
                            <Cell key={d.name} fill={d.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {tab === 'context' ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
              <div className="flex items-start gap-3">
                <div className="p-3 rounded-2xl border border-fuchsia-500/30 bg-fuchsia-600/10">
                  <MapPin className="w-5 h-5 text-fuchsia-200" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Contextual Data Integration</h2>
                  <p className="text-slate-400 mt-1">
                    UI-only demo. Future backend: enrich each transaction with IP reputation, device fingerprint stability, proxy/TOR flags,
                    and geovelocity—then feed into the scorer.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                  <div className="text-sm font-semibold mb-2">Example Context Signals (future)</div>
                  <ul className="text-sm text-slate-300 space-y-2">
                    <li>• IP reputation score (0–100) + “known bad ASN” flag</li>
                    <li>• Device fingerprint match confidence (new device vs known device)</li>
                    <li>• Geo-velocity (km/min) between last location and current</li>
                    <li>• Merchant risk tier + category anomaly vs baseline</li>
                    <li>• Velocity burst (tx/min) & pattern similarity</li>
                  </ul>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                  <div className="text-sm font-semibold mb-2">Where to wire backend later</div>
                  <pre className="text-xs text-slate-200 whitespace-pre-wrap">
{`// 1) Add fields to websocket payload:
payload = {
  transaction: {..., ip, device_id, merchant_category, lat, lon},
  risk_analysis: {decision, risk_score, reasons, latency_ms, feature_deltas}
}

// 2) Add endpoint:
GET /context/{ip}
GET /device/{device_id}

// 3) Display here:
- IP reputation gauge
- new device badge
- geo-velocity alert`}
                  </pre>
                </div>
              </div>
            </div>
          ) : null}

          {tab === 'profile' ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-slate-200" />
                    <h2 className="text-xl font-bold">User Profile</h2>
                  </div>

                  <button
                    onClick={() => loadProfile(userId)}
                    className="px-4 py-2 rounded-xl border border-slate-800 bg-slate-950/40 hover:bg-slate-900/60 text-sm font-semibold"
                    disabled={profileLoading}
                    title="Reload profile"
                  >
                    <span className="inline-flex items-center gap-2">
                      <RefreshCcw className={`w-4 h-4 ${profileLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </span>
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap gap-3 items-center">
                  <input
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    className="w-full sm:w-[320px] bg-slate-950/40 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-slate-600"
                    placeholder="user id (e.g. user_001)"
                  />
                  <button
                    onClick={() => loadProfile(userId)}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
                    disabled={profileLoading || !userId.trim()}
                  >
                    Load
                  </button>

                  {profile ? (
                    <div className="text-sm text-slate-300">
                      Trust score:{' '}
                      <span className="text-white font-bold">{safeText(profile.trust_score)}</span>
                    </div>
                  ) : null}
                </div>

                {profileError ? <div className="mt-3 text-sm text-red-400">{profileError}</div> : null}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Spending */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
                  <div className="text-sm font-semibold mb-2">Spending Distribution</div>
                  <div className="h-56 min-h-[224px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={spendingBarData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                        <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip />
                        <Bar dataKey="value" fill="#60a5fa" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Active Hours */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
                  <div className="text-sm font-semibold mb-2">Active Hours (Behavior)</div>
                  <div className="h-56 min-h-[224px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={activeHoursData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                        <XAxis dataKey="hour" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip />
                        <Bar dataKey="value" fill="#34d399" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Device */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
                  <div className="text-sm font-semibold mb-2">Device Usage</div>
                  <div className="h-56 min-h-[224px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={devicePieData} dataKey="value" innerRadius={55} outerRadius={85}>
                          {devicePieData.map((d) => (
                            <Cell key={d.name} fill={d.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* "Map" (scatter) */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-200" />
                      <div className="text-sm font-semibold">Location Clusters (Map-like View)</div>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      Recharts-only scatter plot using lat/lon. Future: swap to a real map (Leaflet/Mapbox) if allowed.
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 lg:grid-cols-12 gap-4">
                  <div className="lg:col-span-8 h-72 min-h-[288px] rounded-xl border border-slate-800 bg-slate-950/40 p-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
                        <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                        <XAxis type="number" dataKey="lon" name="lon" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                        <YAxis type="number" dataKey="lat" name="lat" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                        <ZAxis type="number" dataKey="transactions" range={[60, 250]} name="transactions" />
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                        <Scatter name="clusters" data={locationScatter} fill="#a78bfa" />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="lg:col-span-4 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                    <div className="text-sm font-semibold mb-2">Clusters</div>
                    {locationScatter.length === 0 ? (
                      <div className="text-sm text-slate-300">No cluster data.</div>
                    ) : (
                      <div className="space-y-2">
                        {locationScatter.slice(0, 8).map((c, idx) => (
                          <div key={idx} className="text-xs text-slate-300 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate text-slate-200 font-semibold">
                                {c.label || 'Location'}
                              </div>
                              <div className="truncate text-slate-400">
                                lat {c.lat.toFixed(4)}, lon {c.lon.toFixed(4)}
                              </div>
                            </div>
                            <div className="shrink-0 text-white font-bold">{c.transactions}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer hint */}
        <div className="mt-10 text-xs text-slate-500">
          Future work: wire scoring/baselines/context from backend endpoints; add per-user baselines + explanations + latency_ms in websocket payload.
        </div>
      </div>
    </div>
  );
}