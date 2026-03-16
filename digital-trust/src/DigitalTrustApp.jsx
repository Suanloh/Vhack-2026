import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Activity,
  BarChart3,
  Globe,
  Fingerprint,
  Cpu,
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Smartphone,
  Wifi,
  Server,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";

const COLORS = {
  approve: "#22c55e",
  flag: "#eab308",
  block: "#ef4444",
  primary: "#6366f1",
  secondary: "#8b5cf6",
  accent: "#06b6d4",
  bg: "#0a0a0a",
  card: "#161616",
  border: "#222",
  text: "#e0e0e0",
  muted: "#888",
};

const generateTransaction = () => {
  const cities = [
    "Lagos",
    "Nairobi",
    "Manila",
    "Dhaka",
    "Lima",
    "Accra",
    "Kampala",
    "Bogota",
    "Jakarta",
    "Karachi",
  ];
  const devices = [
    "Android Phone",
    "Feature Phone",
    "iOS Phone",
    "Tablet",
    "Shared Terminal",
  ];
  const types = [
    "P2P Transfer",
    "Bill Payment",
    "Mobile Top-up",
    "Merchant Pay",
    "Cash-out",
  ];
  const isFraud = Math.random() < 0.08;
  const amount = isFraud
    ? Math.floor(Math.random() * 900 + 500)
    : Math.floor(Math.random() * 200 + 5);
  const hour = Math.floor(Math.random() * 24);
  const riskFactors = [];

  if (amount > 400) riskFactors.push("High amount");
  if (hour >= 1 && hour <= 5) riskFactors.push("Unusual hour");
  if (Math.random() < 0.15) riskFactors.push("New device");
  if (Math.random() < 0.1) riskFactors.push("VPN detected");
  if (Math.random() < 0.12) riskFactors.push("Velocity spike");

  const anomalyScore = isFraud
    ? Math.random() * 0.4 + 0.6
    : Math.random() * 0.5 + 0.02;
  const decision =
    anomalyScore > 0.75 ? "BLOCK" : anomalyScore > 0.45 ? "FLAG" : "APPROVE";
  const latency = Math.floor(Math.random() * 120 + 30);

  return {
    id: `TX-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
    amount,
    city: cities[Math.floor(Math.random() * cities.length)],
    device: devices[Math.floor(Math.random() * devices.length)],
    type: types[Math.floor(Math.random() * types.length)],
    hour,
    anomalyScore,
    decision,
    latency,
    isFraud,
    riskFactors,
    ipReputation: Math.random() * 100,
    deviceTrust: Math.random() * 100,
    behaviorMatch: isFraud ? Math.random() * 40 : Math.random() * 40 + 60,
    timestamp: new Date(),
  };
};

const DecisionBadge = ({ decision }) => {
  const config = {
    APPROVE: {
      bg: "bg-green-900/40",
      border: "border-green-700",
      text: "text-green-400",
      Icon: ShieldCheck,
    },
    FLAG: {
      bg: "bg-yellow-900/40",
      border: "border-yellow-700",
      text: "text-yellow-400",
      Icon: ShieldAlert,
    },
    BLOCK: {
      bg: "bg-red-900/40",
      border: "border-red-700",
      text: "text-red-400",
      Icon: ShieldX,
    },
  };
  const c = config[decision];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${c.bg} ${c.border} ${c.text} border`}
    >
      <c.Icon size={12} />
      {decision}
    </span>
  );
};

const StatCard = ({ icon: Icon, label, value, sub, color }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-neutral-900 border border-neutral-800 rounded-lg p-4"
  >
    <div className="flex items-center gap-2 mb-2">
      <Icon size={16} style={{ color }} />
      <span className="text-xs text-neutral-500 uppercase tracking-wider">
        {label}
      </span>
    </div>
    <div className="text-2xl font-bold text-white">{value}</div>
    {sub && <div className="text-xs text-neutral-500 mt-1">{sub}</div>}
  </motion.div>
);

const SectionHeader = ({ icon: Icon, title, subtitle }) => (
  <div className="mb-6">
    <div className="flex items-center gap-3 mb-1">
      <div className="p-2 bg-indigo-900/30 rounded-lg border border-indigo-800/50">
        <Icon size={20} className="text-indigo-400" />
      </div>
      <h3 className="text-xl font-bold text-white">{title}</h3>
    </div>
    {subtitle && (
      <p className="text-sm text-neutral-500 ml-12">{subtitle}</p>
    )}
  </div>
);

const BehavioralProfiling = ({ transactions }) => {
  const hourData = Array.from({ length: 24 }, (_, i) => {
    const txs = transactions.filter((t) => t.hour === i);
    return {
      hour: `${i}:00`,
      count: txs.length,
      avgAmount: txs.length
        ? Math.round(txs.reduce((s, t) => s + t.amount, 0) / txs.length)
        : 0,
      fraud: txs.filter((t) => t.isFraud).length,
    };
  });

  const cityData = {};
  transactions.forEach((t) => {
    if (!cityData[t.city]) cityData[t.city] = { count: 0, total: 0 };
    cityData[t.city].count++;
    cityData[t.city].total += t.amount;
  });
  const topCities = Object.entries(cityData)
    .map(([name, d]) => ({
      name,
      count: d.count,
      avg: Math.round(d.total / d.count),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const behaviorRadar = [
    {
      metric: "Frequency",
      user: 75 + Math.random() * 15,
      baseline: 70,
    },
    {
      metric: "Avg Amount",
      user: 60 + Math.random() * 20,
      baseline: 65,
    },
    {
      metric: "Time Pattern",
      user: 80 + Math.random() * 10,
      baseline: 85,
    },
    {
      metric: "Location",
      user: 55 + Math.random() * 25,
      baseline: 75,
    },
    {
      metric: "Device",
      user: 70 + Math.random() * 20,
      baseline: 80,
    },
    {
      metric: "Network",
      user: 65 + Math.random() * 20,
      baseline: 72,
    },
  ];

  return (
    <div>
      <SectionHeader
        icon={Activity}
        title="Behavioral Profiling"
        subtitle="Building a 'normal' baseline from transaction frequency, amount, location, and time patterns"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-neutral-400 mb-3">
            Hourly Transaction Pattern
          </h4>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={hourData}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorFraud" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" />
              <XAxis
                dataKey="hour"
                tick={{ fill: "#666", fontSize: 10 }}
                interval={5}
              />
              <YAxis tick={{ fill: "#666", fontSize: 10 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid #333",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#6366f1"
                fill="url(#colorCount)"
                name="Transactions"
              />
              <Area
                type="monotone"
                dataKey="fraud"
                stroke="#ef4444"
                fill="url(#colorFraud)"
                name="Fraud"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-neutral-400 mb-3">
            User vs. Baseline Behavior
          </h4>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={behaviorRadar}>
              <PolarGrid stroke="#333" />
              <PolarAngleAxis
                dataKey="metric"
                tick={{ fill: "#888", fontSize: 10 }}
              />
              <PolarRadiusAxis tick={false} axisLine={false} />
              <Radar
                name="User"
                dataKey="user"
                stroke="#6366f1"
                fill="#6366f1"
                fillOpacity={0.25}
              />
              <Radar
                name="Baseline"
                dataKey="baseline"
                stroke="#22c55e"
                fill="#22c55e"
                fillOpacity={0.1}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid #333",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: 12,
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, color: "#888" }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 md:col-span-2">
          <h4 className="text-sm font-semibold text-neutral-400 mb-3">
            Top Locations by Volume
          </h4>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={topCities} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#222" />
              <XAxis type="number" tick={{ fill: "#666", fontSize: 10 }} />
              <YAxis
                dataKey="name"
                type="category"
                tick={{ fill: "#aaa", fontSize: 11 }}
                width={70}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid #333",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} name="Transactions" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const AnomalyScoring = ({ transactions, latestTx }) => {
  const scoreHistory = transactions.slice(-30).map((t, i) => ({
    idx: i,
    score: (t.anomalyScore * 100).toFixed(1),
    amount: t.amount,
    decision: t.decision,
  }));

  const distribution = [
    {
      range: "0-25",
      count: transactions.filter((t) => t.anomalyScore * 100 <= 25).length,
      fill: "#22c55e",
    },
    {
      range: "25-45",
      count: transactions.filter(
        (t) => t.anomalyScore * 100 > 25 && t.anomalyScore * 100 <= 45
      ).length,
      fill: "#84cc16",
    },
    {
      range: "45-60",
      count: transactions.filter(
        (t) => t.anomalyScore * 100 > 45 && t.anomalyScore * 100 <= 60
      ).length,
      fill: "#eab308",
    },
    {
      range: "60-75",
      count: transactions.filter(
        (t) => t.anomalyScore * 100 > 60 && t.anomalyScore * 100 <= 75
      ).length,
      fill: "#f97316",
    },
    {
      range: "75-100",
      count: transactions.filter((t) => t.anomalyScore * 100 > 75).length,
      fill: "#ef4444",
    },
  ];

  return (
    <div>
      <SectionHeader
        icon={Zap}
        title="Real-Time Anomaly Scoring"
        subtitle="Sub-200ms scoring engine classifying transactions as Approve, Flag, or Block"
      />
      {latestTx && (
        <motion.div
          key={latestTx.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 mb-4"
        >
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Shield size={18} className="text-indigo-400" />
              <span className="font-mono text-sm text-neutral-300">
                {latestTx.id}
              </span>
            </div>
            <DecisionBadge decision={latestTx.decision} />
          </div>

          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-neutral-500">Anomaly Score</span>
              <span
                className="font-bold"
                style={{
                  color:
                    latestTx.anomalyScore > 0.75
                      ? COLORS.block
                      : latestTx.anomalyScore > 0.45
                        ? COLORS.flag
                        : COLORS.approve,
                }}
              >
                {(latestTx.anomalyScore * 100).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-neutral-800 rounded-full h-2.5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width: `${latestTx.anomalyScore * 100}%`,
                }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{
                  background:
                    latestTx.anomalyScore > 0.75
                      ? `linear-gradient(90deg, #f97316, #ef4444)`
                      : latestTx.anomalyScore > 0.45
                        ? `linear-gradient(90deg, #eab308, #f97316)`
                        : `linear-gradient(90deg, #22c55e, #84cc16)`,
                }}
              />
            </div>
            <div className="flex justify-between text-xs mt-1 text-neutral-600">
              <span>Safe</span>
              <span>|</span>
              <span>Review</span>
              <span>|</span>
              <span>Danger</span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div className="bg-neutral-800/50 rounded p-2">
              <span className="text-neutral-500 block">Amount</span>
              <span className="text-white font-semibold">
                ${latestTx.amount}
              </span>
            </div>
            <div className="bg-neutral-800/50 rounded p-2">
              <span className="text-neutral-500 block">Latency</span>
              <span className="text-cyan-400 font-semibold">
                {latestTx.latency}ms
              </span>
            </div>
            <div className="bg-neutral-800/50 rounded p-2">
              <span className="text-neutral-500 block">Location</span>
              <span className="text-white font-semibold">{latestTx.city}</span>
            </div>
            <div className="bg-neutral-800/50 rounded p-2">
              <span className="text-neutral-500 block">Type</span>
              <span className="text-white font-semibold">{latestTx.type}</span>
            </div>
          </div>

          {latestTx.riskFactors.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {latestTx.riskFactors.map((f, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-0.5 rounded-full bg-red-900/30 border border-red-800/50 text-red-400"
                >
                  ⚠ {f}
                </span>
              ))}
            </div>
          )}
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-neutral-400 mb-3">
            Score Timeline (Last 30)
          </h4>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={scoreHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" />
              <XAxis dataKey="idx" tick={{ fill: "#666", fontSize: 10 }} />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: "#666", fontSize: 10 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid #333",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={false}
                name="Anomaly Score"
              />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="#06b6d4"
                strokeWidth={1}
                dot={false}
                name="Amount ($)"
                yAxisId={0}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-neutral-400 mb-3">
            Score Distribution
          </h4>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={distribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" />
              <XAxis
                dataKey="range"
                tick={{ fill: "#888", fontSize: 10 }}
              />
              <YAxis tick={{ fill: "#666", fontSize: 10 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid #333",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="count" name="Transactions" radius={[4, 4, 0, 0]}>
                {distribution.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const ImbalancedHandling = ({ transactions }) => {
  const totalFraud = transactions.filter((t) => t.isFraud).length;
  const totalLegit = transactions.length - totalFraud;

  const pieData = [
    { name: "Legitimate", value: totalLegit, color: "#22c55e" },
    { name: "Fraud", value: Math.max(totalFraud, 1), color: "#ef4444" },
  ];

  const smoteData = [
    { name: "Original", fraud: totalFraud, legit: totalLegit },
    {
      name: "After SMOTE",
      fraud: Math.round(totalLegit * 0.35),
      legit: totalLegit,
    },
  ];

  const lossComparison = [
    { epoch: 1, crossEntropy: 0.72, focalLoss: 0.68 },
    { epoch: 2, crossEntropy: 0.61, focalLoss: 0.52 },
    { epoch: 3, crossEntropy: 0.55, focalLoss: 0.39 },
    { epoch: 4, crossEntropy: 0.51, focalLoss: 0.3 },
    { epoch: 5, crossEntropy: 0.48, focalLoss: 0.23 },
    { epoch: 6, crossEntropy: 0.46, focalLoss: 0.18 },
    { epoch: 7, crossEntropy: 0.44, focalLoss: 0.15 },
    { epoch: 8, crossEntropy: 0.43, focalLoss: 0.13 },
    { epoch: 9, crossEntropy: 0.42, focalLoss: 0.11 },
    { epoch: 10, crossEntropy: 0.41, focalLoss: 0.1 },
  ];

  const fraudRate =
    transactions.length > 0
      ? ((totalFraud / transactions.length) * 100).toFixed(1)
      : 0;

  return (
    <div>
      <SectionHeader
        icon={BarChart3}
        title="Imbalanced Class Handling"
        subtitle="SMOTE oversampling & Focal Loss to train effectively when fraud is rare (~2-8%)"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-white">
            {transactions.length}
          </div>
          <div className="text-xs text-neutral-500">Total Tx</div>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-red-400">{totalFraud}</div>
          <div className="text-xs text-neutral-500">Fraud</div>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-400">{totalLegit}</div>
          <div className="text-xs text-neutral-500">Legitimate</div>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-yellow-400">
            {fraudRate}%
          </div>
          <div className="text-xs text-neutral-500">Fraud Rate</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-neutral-400 mb-3">
            Class Imbalance
          </h4>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                dataKey="value"
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
                labelLine={false}
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid #333",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-neutral-400 mb-3">
            SMOTE Rebalancing
          </h4>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={smoteData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" />
              <XAxis
                dataKey="name"
                tick={{ fill: "#888", fontSize: 10 }}
              />
              <YAxis tick={{ fill: "#666", fontSize: 10 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid #333",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: 12,
                }}
              />
              <Bar
                dataKey="legit"
                fill="#22c55e"
                name="Legitimate"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="fraud"
                fill="#ef4444"
                name="Fraud"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-neutral-400 mb-3">
            Focal vs Cross-Entropy Loss
          </h4>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={lossComparison}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" />
              <XAxis
                dataKey="epoch"
                tick={{ fill: "#666", fontSize: 10 }}
              />
              <YAxis tick={{ fill: "#666", fontSize: 10 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid #333",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Line
                type="monotone"
                dataKey="crossEntropy"
                stroke="#f97316"
                strokeWidth={2}
                dot={false}
                name="Cross-Entropy"
              />
              <Line
                type="monotone"
                dataKey="focalLoss"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={false}
                name="Focal Loss"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const ContextualIntegration = ({ latestTx }) => {
  if (!latestTx) return null;

  const signals = [
    {
      icon: Globe,
      label: "IP Reputation",
      value: latestTx.ipReputation.toFixed(0),
      max: 100,
      color:
        latestTx.ipReputation > 60
          ? "#22c55e"
          : latestTx.ipReputation > 30
            ? "#eab308"
            : "#ef4444",
      detail:
        latestTx.ipReputation > 60
          ? "Clean IP"
          : latestTx.ipReputation > 30
            ? "Suspicious proxy"
            : "Known bad actor",
    },
    {
      icon: Fingerprint,
      label: "Device Trust",
      value: latestTx.deviceTrust.toFixed(0),
      max: 100,
      color:
        latestTx.deviceTrust > 60
          ? "#22c55e"
          : latestTx.deviceTrust > 30
            ? "#eab308"
            : "#ef4444",
      detail:
        latestTx.deviceTrust > 60
          ? "Recognized device"
          : latestTx.deviceTrust > 30
            ? "Partially matched"
            : "Unknown device",
    },
    {
      icon: Activity,
      label: "Behavior Match",
      value: latestTx.behaviorMatch.toFixed(0),
      max: 100,
      color:
        latestTx.behaviorMatch > 60
          ? "#22c55e"
          : latestTx.behaviorMatch > 30
            ? "#eab308"
            : "#ef4444",
      detail:
        latestTx.behaviorMatch > 60
          ? "Matches profile"
          : latestTx.behaviorMatch > 30
            ? "Slight deviation"
            : "Major deviation",
    },
    {
      icon: MapPin,
      label: "Geo Consistency",
      value: Math.floor(Math.random() * 40 + 50),
      max: 100,
      color: "#06b6d4",
      detail: `Last seen: ${latestTx.city}`,
    },
    {
      icon: Smartphone,
      label: "Device Fingerprint",
      value: Math.floor(Math.random() * 30 + 60),
      max: 100,
      color: "#8b5cf6",
      detail: latestTx.device,
    },
    {
      icon: Wifi,
      label: "Network Signal",
      value: Math.floor(Math.random() * 40 + 40),
      max: 100,
      color: "#f59e0b",
      detail: Math.random() > 0.5 ? "Mobile data" : "Wi-Fi network",
    },
  ];

  return (
    <div>
      <SectionHeader
        icon={Server}
        title="Contextual Data Integration"
        subtitle="Non-transactional signals: IP reputation, device fingerprints, geo, and network data"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {signals.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="bg-neutral-900 border border-neutral-800 rounded-lg p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <s.icon size={16} style={{ color: s.color }} />
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                {s.label}
              </span>
            </div>
            <div className="flex items-end gap-2 mb-2">
              <span
                className="text-3xl font-bold"
                style={{ color: s.color }}
              >
                {s.value}
              </span>
              <span className="text-xs text-neutral-600 mb-1">/ {s.max}</span>
            </div>
            <div className="w-full bg-neutral-800 rounded-full h-1.5 mb-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(s.value / s.max) * 100}%` }}
                transition={{ duration: 0.6 }}
                className="h-full rounded-full"
                style={{ backgroundColor: s.color }}
              />
            </div>
            <span className="text-xs text-neutral-500">{s.detail}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const TransactionLog = ({ transactions }) => {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? transactions.slice(-20).reverse() : transactions.slice(-5).reverse();

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-neutral-400">
          Live Transaction Log
        </h4>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
        >
          {expanded ? (
            <>
              Show Less <ChevronUp size={12} />
            </>
          ) : (
            <>
              Show More <ChevronDown size={12} />
            </>
          )}
        </button>
      </div>
      <div className="space-y-1 max-h-80 overflow-y-auto">
        <AnimatePresence>
          {visible.map((tx) => (
            <motion.div
              key={tx.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-between py-1.5 px-2 rounded text-xs hover:bg-neutral-800/50 border-b border-neutral-800/50"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-neutral-500 w-28 truncate">
                  {tx.id}
                </span>
                <span className="text-neutral-300 w-14">${tx.amount}</span>
                <span className="text-neutral-500 w-16 truncate">
                  {tx.city}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-neutral-600">{tx.latency}ms</span>
                <DecisionBadge decision={tx.decision} />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default function DigitalTrustApp() {
  const [transactions, setTransactions] = useState([]);
  const [isRunning, setIsRunning] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    const initial = Array.from({ length: 60 }, generateTransaction);
    setTransactions(initial);
  }, []);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTransactions((prev) => {
          const newTx = generateTransaction();
          const next = [...prev, newTx];
          return next.length > 500 ? next.slice(-500) : next;
        });
      }, 1800);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning]);

  const latestTx = transactions[transactions.length - 1];
  const approved = transactions.filter((t) => t.decision === "APPROVE").length;
  const flagged = transactions.filter((t) => t.decision === "FLAG").length;
  const blocked = transactions.filter((t) => t.decision === "BLOCK").length;
  const avgLatency =
    transactions.length > 0
      ? Math.round(
          transactions.reduce((s, t) => s + t.latency, 0) /
            transactions.length
        )
      : 0;

  const tabs = [
    "Anomaly Scoring",
    "Behavioral Profiling",
    "Imbalanced Handling",
    "Contextual Data",
  ];

  return (
    <div className="min-h-screen bg-black text-neutral-200" style={{ fontFamily: '"Inter", system-ui, sans-serif' }}>
      {/* HERO */}
      <header className="text-center py-16 px-4 bg-neutral-950 border-b border-neutral-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "radial-gradient(circle at 50% 0%, #6366f1 0%, transparent 50%)"
        }} />
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Shield size={40} className="text-indigo-400" />
          </div>
          <h1 className="text-5xl font-extrabold text-white tracking-tight mb-2">
            Digital Trust
          </h1>
          <p className="text-lg text-neutral-500 mb-4">
            Real-Time Fraud Shield for the Unbanked
          </p>
          <div className="inline-flex items-center gap-2 bg-neutral-900 border border-neutral-800 px-4 py-1.5 rounded-full text-xs text-neutral-400">
            <Cpu size={12} className="text-indigo-400" />
            Machine Learning • Anomaly Detection • Behavioral AI
          </div>
        </motion.div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        {/* PROBLEM */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white border-b border-neutral-800 pb-3 mb-4">
            The Problem
          </h2>
          <p className="text-base text-neutral-400 leading-relaxed">
            Conventional rule-based fraud detection systems are often inadequate
            in identifying sophisticated or evolving fraud patterns. For the
            unbanked, this leads to{" "}
            <strong className="text-red-400">False Declines</strong>—blocking
            legitimate users who don't have traditional banking histories. Our
            ML-powered shield addresses this by building behavioral baselines,
            scoring anomalies in real time, handling extreme class imbalance,
            and integrating contextual signals beyond the transaction itself.
          </p>
        </section>

        {/* LIVE DASHBOARD */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-2.5 h-2.5 rounded-full ${isRunning ? "bg-green-500 animate-pulse" : "bg-neutral-600"}`}
              />
              <h2 className="text-2xl font-bold text-white">
                Fraud Shield — Live
              </h2>
            </div>
            <button
              onClick={() => setIsRunning(!isRunning)}
              className="flex items-center gap-2 px-4 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-sm text-neutral-300 hover:bg-neutral-800 transition"
            >
              {isRunning ? (
                <>
                  <RefreshCw size={14} className="animate-spin" /> Streaming
                </>
              ) : (
                <>
                  <RefreshCw size={14} /> Paused
                </>
              )}
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <StatCard
              icon={Activity}
              label="Total"
              value={transactions.length}
              color="#8b5cf6"
            />
            <StatCard
              icon={CheckCircle}
              label="Approved"
              value={approved}
              sub={`${transactions.length ? ((approved / transactions.length) * 100).toFixed(0) : 0}%`}
              color={COLORS.approve}
            />
            <StatCard
              icon={AlertTriangle}
              label="Flagged"
              value={flagged}
              sub={`${transactions.length ? ((flagged / transactions.length) * 100).toFixed(0) : 0}%`}
              color={COLORS.flag}
            />
            <StatCard
              icon={XCircle}
              label="Blocked"
              value={blocked}
              sub={`${transactions.length ? ((blocked / transactions.length) * 100).toFixed(0) : 0}%`}
              color={COLORS.block}
            />
            <StatCard
              icon={Clock}
              label="Avg Latency"
              value={`${avgLatency}ms`}
              sub="< 200ms target"
              color={COLORS.accent}
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
            {tabs.map((tab, i) => (
              <button
                key={i}
                onClick={() => setActiveTab(i)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                  activeTab === i
                    ? "bg-indigo-900/40 text-indigo-300 border border-indigo-700"
                    : "bg-neutral-900 text-neutral-500 border border-neutral-800 hover:text-neutral-300"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="mb-6"
            >
              {activeTab === 0 && (
                <AnomalyScoring
                  transactions={transactions}
                  latestTx={latestTx}
                />
              )}
              {activeTab === 1 && (
                <BehavioralProfiling transactions={transactions} />
              )}
              {activeTab === 2 && (
                <ImbalancedHandling transactions={transactions} />
              )}
              {activeTab === 3 && (
                <ContextualIntegration latestTx={latestTx} />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Transaction Log */}
          <TransactionLog transactions={transactions} />
        </section>

        {/* TECHNICAL PILLARS */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white border-b border-neutral-800 pb-3 mb-6">
            Technical Pillars
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                icon: Activity,
                title: "Behavioral Profiling",
                desc: "Analyzing frequency, amount, location, and time to build a baseline of 'normal' for unbanked users.",
                color: "#6366f1",
              },
              {
                icon: Zap,
                title: "Anomaly Scoring",
                desc: "Developing a sub-200ms model to Approve, Flag, or Block transactions instantly.",
                color: "#06b6d4",
              },
              {
                icon: BarChart3,
                title: "Imbalanced Handling",
                desc: "Using SMOTE and Focal Loss to train on datasets where fraud is extremely rare.",
                color: "#eab308",
              },
              {
                icon: Server,
                title: "Contextual Integration",
                desc: "Incorporating IP reputation, device fingerprints, geo-consistency, and network signals.",
                color: "#8b5cf6",
              },
            ].map((pillar, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-neutral-950 border border-neutral-800 rounded-xl p-5 hover:border-neutral-700 transition"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="p-2 rounded-lg"
                    style={{
                      backgroundColor: `${pillar.color}15`,
                      border: `1px solid ${pillar.color}30`,
                    }}
                  >
                    <pillar.icon size={20} style={{ color: pillar.color }} />
                  </div>
                  <h4 className="text-base font-bold text-white">
                    {pillar.title}
                  </h4>
                </div>
                <p className="text-sm text-neutral-500 leading-relaxed">
                  {pillar.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </section>
      </main>

      <footer className="text-center py-8 text-neutral-600 text-xs border-t border-neutral-900">
        Digital Trust Case Study © 2026 | Built with React & ML
      </footer>
    </div>
  );
}