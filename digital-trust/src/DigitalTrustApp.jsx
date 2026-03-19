import React, { useEffect, useMemo, useState } from 'react';
import { Shield, CheckCircle, AlertTriangle, Ban, User, RefreshCcw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
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

const clamp01 = (n) => Math.max(0, Math.min(1, n));
const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};
const pct = (v) => {
  const n = toNumber(v);
  return Number.isFinite(n) ? n : 0;
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

const formatRiskScore = (v, decimals = 4) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return n.toFixed(decimals);
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

// --- Investigation helpers ---
const getTxUserId = (tx) => tx?.user_id ?? tx?.userId ?? tx?.user ?? '';
const getTxMerchant = (tx) => tx?.merchant ?? tx?.merchant_name ?? tx?.merchantName ?? 'Merchant';
const getTxAmountText = (tx) => formatMoney(tx?.amount, tx?.currency);
const getTxKey = (tx, fallback) => tx?.transaction_id ?? tx?.id ?? fallback;

// FIX: your backend uses risk_analysis.explanation (array) (see your screenshot)
const getTxReasons = (tx) => {
  const ra = tx?.risk_analysis ?? tx?.riskAnalysis ?? tx?.analysis ?? null;
  if (!ra) return [];

  const candidates = [
    ra.explanation, // <-- IMPORTANT (array in your payload)
    ra.explanations,
    ra.reasons,
    ra.reason,
    ra.top_reasons,
    ra.topReasons,
    ra.flags,
    ra.anomalies,
    ra.signals,
  ];

  // arrays -> normalize to strings
  for (const c of candidates) {
    if (Array.isArray(c)) {
      return c
        .flatMap((x) => (x === null || x === undefined ? [] : [x]))
        .map((x) => {
          if (typeof x === 'string' || typeof x === 'number' || typeof x === 'boolean') return String(x);
          if (x && typeof x === 'object') {
            return x.reason ?? x.message ?? x.name ?? x.feature ?? x.signal ?? x.title ?? JSON.stringify(x);
          }
          return String(x);
        })
        .map((s) => String(s).trim())
        .filter(Boolean);
    }
  }

  // scalars -> wrap
  for (const c of candidates) {
    if (typeof c === 'string' || typeof c === 'number' || typeof c === 'boolean') {
      const s = String(c).trim();
      return s ? [s] : [];
    }
  }

  // object map -> key/value
  // (covers explanation being an object map in some future backend shape)
  if (ra.explanation && typeof ra.explanation === 'object') {
    try {
      return Object.entries(ra.explanation).map(([k, v]) => `${k}: ${safeText(v)}`);
    } catch {
      // ignore
    }
  }

  return [];
};

const reasonsPreview = (reasons, max = 3) => reasons.slice(0, max);

// Small helper for a nice modal close (ESC) + body scroll lock
function useModalEffects(isOpen, onClose) {
  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);
}

export default function DigitalTrustApp() {
  const [transactions, setTransactions] = useState([]);
  const [riskStats, setRiskStats] = useState({ approve: 0, flag: 0, block: 0 });
  const [chartData, setChartData] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [connectionError, setConnectionError] = useState('');

  // Selection Logic: click a transaction → it becomes the investigation focus
  const [selectedTx, setSelectedTx] = useState(null);

  const [isSimulating, setIsSimulating] = useState(false);

  // Single user concept: only ONE userId is used for the profile panel.
  // We DO keep the input, but we do NOT derive another "selectedUserId" state.
  const [userId, setUserId] = useState('user_001');
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');

  const isModalOpen = Boolean(selectedTx);
  useModalEffects(isModalOpen, () => setSelectedTx(null));

  const selectedReasons = useMemo(() => getTxReasons(selectedTx), [selectedTx]);

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
      // eslint-disable-next-line no-console
      console.log('✅ Attack simulated successfully:', result);
    } catch (error) {
      // eslint-disable-next-line no-console
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

  // Investigate user = load the ONE userId used by the context panel (does not change based on tx.user_id)
  const investigateSelectedUser = async () => {
    const uid = String(userId || '').trim();
    if (!uid) return;
    await loadProfile(uid);
  };

  // WebSocket connection for live transactions
  useEffect(() => {
    let ws;
    let reconnectTimeout;

    const connect = () => {
      const url = getWsUrl();
      // eslint-disable-next-line no-console
      console.log('Attempting WebSocket connection to:', url);
      ws = new WebSocket(url);

      ws.onopen = () => {
        setConnectionStatus('connected');
        setConnectionError('');
        // eslint-disable-next-line no-console
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
          // eslint-disable-next-line no-console
          console.error('Error parsing WebSocket data:', error);
        }
      };

      ws.onerror = () => {
        setConnectionStatus('error');
        const errorMsg =
          '❌ WebSocket error. If you are in dev, ensure Vite proxy ws=true and backend is running on port 8000.';
        setConnectionError(errorMsg);
        // eslint-disable-next-line no-console
        console.error(errorMsg);
      };

      ws.onclose = () => {
        // eslint-disable-next-line no-console
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

  // ------- Profile visualizations -------
  const deviceData = useMemo(() => {
    const d = profile?.device_usage_breakdown || {};
    return [
      { name: 'Mobile', value: pct(d.mobile), color: '#60a5fa' },
      { name: 'Desktop', value: pct(d.desktop), color: '#a78bfa' },
      { name: 'Tablet', value: pct(d.tablet), color: '#34d399' },
    ];
  }, [profile]);

  const spendingData = useMemo(() => {
    const entries = Object.entries(profile?.spending_distribution || {})
      .map(([name, raw]) => ({ name: String(name), value: pct(raw) }))
      .filter((x) => Number.isFinite(x.value));

    // sort descending for cleaner bars
    entries.sort((a, b) => b.value - a.value);
    return entries;
  }, [profile]);

  // Radar summary using existing fields (no backend change)
  const radarData = useMemo(() => {
    const trust = pct(profile?.trust_score);

    const mobile = pct(profile?.device_usage_breakdown?.mobile);
    const desktop = pct(profile?.device_usage_breakdown?.desktop);
    const tablet = pct(profile?.device_usage_breakdown?.tablet);

    // simple “device diversity”: higher if usage is balanced across device types
    const shares = [mobile, desktop, tablet].map((x) => clamp01(x / 100));
    const mean = shares.reduce((a, b) => a + b, 0) / (shares.length || 1);
    const variance = shares.reduce((acc, s) => acc + (s - mean) ** 2, 0) / (shares.length || 1);
    const deviceDiversity = clamp01(1 - Math.sqrt(variance) * 1.8) * 100; // heuristic

    // “spending concentration”: if one category dominates, concentration higher (riskier)
    const sVals = spendingData.map((x) => clamp01(x.value / 100));
    const sum = sVals.reduce((a, b) => a + b, 0) || 1;
    const normalized = sVals.map((x) => x / sum);
    const maxShare = normalized.length ? Math.max(...normalized) : 0;
    const spendingBalance = clamp01(1 - maxShare) * 100; // more balanced -> higher

    // “location stability”: more clusters => less stable (heuristic)
    const clusters = Array.isArray(profile?.location_clusters) ? profile.location_clusters.length : 0;
    const locationStability = clamp01(1 - Math.min(clusters, 10) / 10) * 100;

    // Normalize trust score if it is 0..100 already; otherwise clamp
    const trustNormalized = clamp01(trust / 100) * 100;

    return [
      { metric: 'Trust', score: trustNormalized },
      { metric: 'Device Diversity', score: deviceDiversity },
      { metric: 'Spending Balance', score: spendingBalance },
      { metric: 'Location Stability', score: locationStability },
    ];
  }, [profile, spendingData]);

  const spendingMax = useMemo(() => {
    const max = spendingData.reduce((m, x) => Math.max(m, x.value), 0);
    return max || 100;
  }, [spendingData]);

  // Selected highlighting (robust even if tx has no id)
  const selectedKey = useMemo(() => getTxKey(selectedTx, null), [selectedTx]);

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
            {connectionError && <div className="text-xs text-red-400 max-w-xs text-right">{connectionError}</div>}

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

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.14),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_35%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/40 to-slate-950/80" />

        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[720px] h-[420px] rounded-full bg-blue-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -top-10 left-1/3 w-[520px] h-[320px] rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-6 py-20 sm:py-24">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-900/40 border border-slate-800 mb-6">
              <Shield className="w-7 h-7 text-blue-400" />
            </div>

            <h2 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-white">Digital Trust</h2>
            <p className="mt-4 text-lg text-slate-400">Real-Time Fraud Shield for the Unbanked</p>

            <div className="mt-7 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-800 bg-slate-950/35 text-slate-300 text-sm">
              <span className="text-blue-400">⚙</span>
              <span>Machine Learning • Anomaly Detection • Behavioral AI</span>
            </div>
          </div>
        </div>

        <div className="relative h-px bg-slate-800/80" />
      </section>

      {/* Problem description */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold text-white">The Problem</h3>
          <div className="mt-4 h-px bg-slate-800" />
          <p className="mt-6 text-slate-300 leading-relaxed">
            Conventional rule-based fraud detection systems are often inadequate in identifying sophisticated or evolving
            fraud patterns. For the unbanked, this leads to{' '}
            <span className="text-red-400 font-semibold">False Declines</span>—blocking legitimate users who don't have
            traditional banking histories. Our ML-powered shield addresses this by building behavioral baselines,
            scoring anomalies in real time, handling extreme class imbalance, and integrating contextual signals beyond
            the transaction itself.
          </p>
        </div>
      </section>

      {/* Risk overview centered (below description) */}
      <section className="max-w-7xl mx-auto px-6 pb-12">
        <div className="max-w-4xl mx-auto">
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-white font-semibold mb-4 text-center">Risk Overview</h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-center">
                <div className="text-xs text-slate-400">Approve</div>
                <div className="text-xl text-white font-bold">{riskStats.approve}</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-center">
                <div className="text-xs text-slate-400">Flag</div>
                <div className="text-xl text-white font-bold">{riskStats.flag}</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-center">
                <div className="text-xs text-slate-400">Block</div>
                <div className="text-xl text-white font-bold">{riskStats.block}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        {formatRiskScore(latest?.risk_analysis?.risk_score ?? latest?.risk_analysis?.score, 4)}
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
        </div>
      </section>

      {/* Context Panel + Live Feed */}
      <main className="max-w-7xl mx-auto px-6 pb-12 grid grid-cols-12 gap-6">
        {/* Context Panel */}
        <section className="col-span-12 lg:col-span-5 bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <User className="w-4 h-4" /> User Profile
            </h2>

            <button
              onClick={() => loadProfile(userId)}
              className="text-xs px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white inline-flex items-center gap-2"
              disabled={profileLoading}
              title="Reload profile"
              type="button"
            >
              <RefreshCcw className={`w-4 h-4 ${profileLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Keep input so you can choose the ONE user you want to demo.
              This does NOT create a second "selected user" concept. */}
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
              type="button"
            >
              Load
            </button>
          </div>

          {profileError ? <div className="text-sm text-red-400">{profileError}</div> : null}
          {!profile && !profileError ? <div className="text-sm text-slate-300">No profile loaded.</div> : null}

          {/* Selected Context */}
          {selectedTx ? (
            <div className="mb-3 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs text-slate-400">Selected transaction</div>
                  <div className="mt-1 text-sm text-white font-semibold truncate">
                    {getTxMerchant(selectedTx)} • {getTxAmountText(selectedTx)}
                  </div>
                  <div className="mt-1 text-xs text-slate-400 truncate">
                    Active user: <span className="text-slate-200 font-semibold">{safeText(userId, '—')}</span>
                    {' • '}
                    {selectedTx?.timestamp ? new Date(selectedTx.timestamp).toLocaleString() : '—'}
                  </div>
                </div>

                <div
                  className={`shrink-0 inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold ${riskColor(
                    selectedTx?.risk_analysis?.decision,
                  )}`}
                >
                  {riskIcon(selectedTx?.risk_analysis?.decision)}
                  {safeText(selectedTx?.risk_analysis?.decision || '—').toUpperCase()}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                  <div className="text-[11px] text-slate-400">Risk score</div>
                  <div className="text-base text-white font-bold">
                    {formatRiskScore(selectedTx?.risk_analysis?.risk_score ?? selectedTx?.risk_analysis?.score, 4)}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                  <div className="text-[11px] text-slate-400">AI reasons</div>
                  <div className="text-[11px] text-slate-300">{selectedReasons.length ? `${selectedReasons.length} signals` : '—'}</div>
                </div>
              </div>

              {/* Reasons chips */}
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedReasons.length ? (
                  selectedReasons.slice(0, 10).map((r, idx) => (
                    <span
                      key={`${r}-${idx}`}
                      className="text-[11px] px-2 py-1 rounded-full border border-slate-700 bg-slate-900/50 text-slate-200"
                      title={r}
                    >
                      {r}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">No reasons provided.</span>
                )}
              </div>

              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  onClick={investigateSelectedUser}
                  className="text-xs px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:bg-slate-700"
                  disabled={!String(userId || '').trim()}
                  title="Reload profile for active user"
                  type="button"
                >
                  Investigate user
                </button>

                <button
                  onClick={() => setSelectedTx(null)}
                  className="text-xs px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white"
                  type="button"
                >
                  Clear
                </button>
              </div>
            </div>
          ) : null}

          {profile ? (
            <div className="space-y-3">
              {/* Header + Radar */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-xs text-slate-400">User</div>
                    <div className="text-white font-semibold truncate">{safeText(profile.user_id)}</div>
                    <div className="mt-2 text-xs text-slate-400">Trust score</div>
                    <div className="text-2xl text-white font-bold">{safeText(profile.trust_score)}</div>
                  </div>

                  <div className="hidden sm:block w-[170px] h-[140px]">
                    <div className="text-[11px] text-slate-400 mb-1 text-right">Trust factors</div>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="#334155" />
                        <PolarAngleAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                        <PolarRadiusAxis angle={60} domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 9 }} stroke="#334155" />
                        <Radar dataKey="score" stroke="#60a5fa" fill="#60a5fa" fillOpacity={0.22} />
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="sm:hidden mt-3 h-[180px]">
                  <div className="text-xs text-slate-400 mb-1">Trust factors</div>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#334155" />
                      <PolarAngleAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <PolarRadiusAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 9 }} stroke="#334155" />
                      <Radar dataKey="score" stroke="#60a5fa" fill="#60a5fa" fillOpacity={0.22} />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Device usage */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm text-white font-semibold">Device usage</div>
                  <div className="text-[11px] text-slate-400">last 30 days</div>
                </div>

                <div className="mt-2 text-xs text-slate-300">
                  Mobile:{' '}
                  <span className="text-white font-semibold">{safeText(profile.device_usage_breakdown?.mobile)}%</span>
                  {' • '}
                  Desktop:{' '}
                  <span className="text-white font-semibold">{safeText(profile.device_usage_breakdown?.desktop)}%</span>
                  {' • '}
                  Tablet:{' '}
                  <span className="text-white font-semibold">{safeText(profile.device_usage_breakdown?.tablet)}%</span>
                </div>

                <div className="mt-3 h-28">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={deviceData} layout="vertical" margin={{ top: 2, right: 12, bottom: 2, left: 6 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} stroke="#334155" />
                      <YAxis type="category" dataKey="name" tick={{ fill: '#cbd5e1', fontSize: 10 }} stroke="#334155" width={60} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[6, 6, 6, 6]}>
                        {deviceData.map((d) => (
                          <Cell key={d.name} fill={d.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Spending distribution */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm text-white font-semibold">Spending distribution</div>
                  <div className="text-[11px] text-slate-400">category %</div>
                </div>

                <div className="mt-2 space-y-1">
                  {Object.entries(profile.spending_distribution || {}).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between text-xs text-slate-300">
                      <span>{safeText(k)}</span>
                      <span className="text-white font-semibold">{safeText(v)}%</span>
                    </div>
                  ))}
                </div>

                <div className="mt-3">
                  {spendingData.length ? (
                    <div className="space-y-2">
                      {spendingData.map((row) => {
                        const w = Math.round((row.value / spendingMax) * 100);
                        return (
                          <div key={row.name} className="grid grid-cols-12 gap-2 items-center">
                            <div className="col-span-4 text-[11px] text-slate-300 truncate">{row.name}</div>
                            <div className="col-span-7">
                              <div className="h-2.5 rounded-full bg-slate-800/70 overflow-hidden border border-slate-700/40">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-blue-500/70 to-cyan-500/70"
                                  style={{ width: `${w}%` }}
                                />
                              </div>
                            </div>
                            <div className="col-span-1 text-[11px] text-slate-200 text-right tabular-nums">
                              {row.value.toFixed(0)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400">No spending data</div>
                  )}
                </div>
              </div>

              {/* Location clusters */}
              {Array.isArray(profile.location_clusters) && profile.location_clusters.length ? (
                <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="text-sm text-white font-semibold">Location clusters</div>
                    <div className="text-[11px] text-slate-400">top 5</div>
                  </div>

                  <div className="space-y-2">
                    {profile.location_clusters.slice(0, 5).map((c, idx) => {
                      const t = pct(c?.transactions);
                      const barW = Math.round(clamp01(t / 100) * 100);
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="text-xs text-slate-300 flex items-center justify-between gap-3">
                            <span className="truncate">{safeLocationText(c)}</span>
                            <span className="text-white font-semibold tabular-nums">{safeText(c?.transactions, '0')}</span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-800/70 overflow-hidden border border-slate-700/40">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-violet-500/60 to-fuchsia-500/60"
                              style={{ width: `${barW}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>

        {/* Live Feed */}
        <section className="col-span-12 lg:col-span-7 bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <div className="min-w-0">
              <h2 className="text-white font-semibold">Live Transaction Feed</h2>
              {selectedTx ? (
                <div className="text-[11px] text-slate-400 truncate mt-0.5">
                  Investigating (active user): <span className="text-slate-200 font-semibold">{safeText(userId, '—')}</span>
                </div>
              ) : (
                <div className="text-[11px] text-slate-400 mt-0.5">Click an event to investigate (reasons + context)</div>
              )}
            </div>

            <span className="text-xs text-slate-400 shrink-0">{transactions.length} events</span>
          </div>

          <div className="max-h-[560px] overflow-auto">
            {transactions.length === 0 ? (
              <div className="p-6 text-slate-300">
                No transactions yet. If you’re “Connected” but still see none, check the WS frames in DevTools → Network → WS → /transactions/live.
              </div>
            ) : (
              <ul className="divide-y divide-slate-800">
                {transactions.map((tx, idx) => {
                  const decision = tx?.risk_analysis?.decision || 'APPROVE';
                  const locationValue = tx?.location ?? tx?.geo ?? tx?.location_data ?? tx?.merchant_location;
                  const key = getTxKey(tx, idx);
                  const isSelected = selectedKey !== null && key === selectedKey;

                  const reasons = reasonsPreview(getTxReasons(tx), 3);

                  return (
                    <li
                      key={safeText(key, String(idx))}
                      className={`px-5 py-4 cursor-pointer transition-colors ${
                        isSelected ? 'bg-slate-900/60 ring-1 ring-blue-500/30' : 'hover:bg-slate-900/70'
                      }`}
                      onClick={() => setSelectedTx(tx)}
                      title="Click to investigate this transaction"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="text-sm text-white truncate">
                            {getTxMerchant(tx)} • {getTxAmountText(tx)}
                          </div>
                          <div className="text-xs text-slate-400 truncate">
                            {/* We still show tx.user_id in the feed because it's part of the event data,
                                but it does NOT change the single active userId used for profile. */}
                            {safeText(getTxUserId(tx), 'unknown-user')} • {safeLocationText(locationValue)} •{' '}
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
                          {formatRiskScore(tx?.risk_analysis?.risk_score ?? tx?.risk_analysis?.score, 4)}
                        </span>
                        {reasons.length ? (
                          <>
                            {' '}
                            • <span className="text-slate-300">{reasons.join(' • ')}</span>
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
      </main>

      {/* Modal overlay for selected transaction (summary + reasons + raw JSON) */}
      <AnimatePresence>
        {isModalOpen ? (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            aria-modal="true"
            role="dialog"
          >
            {/* Backdrop */}
            <motion.button
              className="absolute inset-0 w-full h-full bg-black/70"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTx(null)}
              aria-label="Close modal"
              type="button"
            />

            {/* Panel */}
            <motion.div
              className="relative w-full max-w-5xl bg-slate-950/80 backdrop-blur border border-slate-800 rounded-2xl overflow-hidden shadow-2xl"
              initial={{ y: 18, scale: 0.98, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 18, scale: 0.98, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            >
              <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-white font-semibold truncate">Investigation Details</h2>
                  <p className="text-xs text-slate-400">Press ESC or click outside to close</p>
                </div>

                <button
                  onClick={() => setSelectedTx(null)}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white"
                  type="button"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Human-readable summary */}
              <div className="p-5 border-b border-slate-800">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-xs text-slate-400">Transaction</div>
                    <div className="mt-1 text-lg text-white font-semibold truncate">
                      {getTxMerchant(selectedTx)} • {getTxAmountText(selectedTx)}
                    </div>

                    <div className="mt-1 text-xs text-slate-400 truncate">
                      Active user: <span className="text-slate-200 font-semibold">{safeText(userId, '—')}</span>
                      {' • '}
                      {selectedTx?.timestamp ? new Date(selectedTx.timestamp).toLocaleString() : '—'}
                    </div>

                    <div className="mt-2 text-xs text-slate-400">
                      Risk score:{' '}
                      <span className="text-slate-100 font-semibold">
                        {formatRiskScore(selectedTx?.risk_analysis?.risk_score ?? selectedTx?.risk_analysis?.score, 4)}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <div
                      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold ${riskColor(
                        selectedTx?.risk_analysis?.decision,
                      )}`}
                    >
                      {riskIcon(selectedTx?.risk_analysis?.decision)}
                      {safeText(selectedTx?.risk_analysis?.decision || '—').toUpperCase()}
                    </div>

                    <button
                      onClick={investigateSelectedUser}
                      className="mt-3 w-full text-xs px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:bg-slate-700"
                      disabled={!String(userId || '').trim()}
                      type="button"
                      title="Reload profile for active user"
                    >
                      Investigate user
                    </button>
                  </div>
                </div>

                {/* Explainability chips */}
                <div className="mt-4">
                  <div className="text-xs text-slate-400 mb-2">AI reasons</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedReasons.length ? (
                      selectedReasons.map((r, idx) => (
                        <span
                          key={`${r}-${idx}`}
                          className="text-[11px] px-2 py-1 rounded-full border border-slate-700 bg-slate-900/50 text-slate-200"
                          title={r}
                        >
                          {r}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400">No reasons provided.</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Raw JSON */}
              <div className="p-5">
                <div className="text-xs text-slate-400 mb-2">Raw event payload</div>
                <pre className="text-xs text-slate-200 overflow-auto bg-slate-950/60 border border-slate-800 rounded-xl p-4 max-h-[55vh]">
{JSON.stringify(selectedTx, null, 2)}
                </pre>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}