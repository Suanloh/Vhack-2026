import React, { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AlertTriangle, CheckCircle, Ban, TrendingUp, Activity, Shield } from 'lucide-react';
import { motion } from 'framer-motion';

// ===== HYBRID URL DETECTION =====
const BACKEND_URL = (() => {
  // Dev mode: frontend on port 5173, backend on 8000
  if (window.location.port === '5173') {
    return 'http://localhost:8000';
  }
  // Production: same origin
  return window.location.origin;
})();

const getWsUrl = () => {
  const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  
  // Dev mode: separate backend server
  if (window.location.port === '5173') {
    return `ws://localhost:8000/transactions/live`;
  }
  
  // Production: same host
  return `${wsProtocol}://${window.location.host}/transactions/live`;
};

console.log('Backend URL:', BACKEND_URL);
console.log('WebSocket URL:', getWsUrl());

export default function DigitalTrustApp() {
  const [transactions, setTransactions] = useState([]);
  const [riskStats, setRiskStats] = useState({ approve: 0, flag: 0, block: 0 });
  const [chartData, setChartData] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [selectedTx, setSelectedTx] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // WebSocket connection for live transactions
  useEffect(() => {
    const ws = new WebSocket(getWsUrl());

    ws.onopen = () => {
      setConnectionStatus('connected');
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const { transaction, risk_analysis } = data;

        setTransactions(prev => {
          const updated = [{ ...transaction, risk_analysis }, ...prev].slice(0, 20);
          return updated;
        });

        const decision = risk_analysis.decision;
        setRiskStats(prev => ({
          ...prev,
          [decision.toLowerCase()]: prev[decision.toLowerCase()] + 1
        }));

        setChartData(prev => {
          const timestamp = new Date().toLocaleTimeString();
          const updated = [...prev, {
            time: timestamp,
            approve: decision === 'APPROVE' ? 1 : 0,
            flag: decision === 'FLAG' ? 1 : 0,
            block: decision === 'BLOCK' ? 1 : 0
          }].slice(-10);
          return updated;
        });
      } catch (error) {
        console.error('Error parsing WebSocket data:', error);
      }
    };

    ws.onerror = (error) => {
      setConnectionStatus('error');
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      setConnectionStatus('disconnected');
      setTimeout(() => {
        setConnectionStatus('connecting');
      }, 3000);
    };

    return () => ws.close();
  }, []);

  // Simulate attack
  const simulateAttack = async () => {
    setIsSimulating(true);
    try {
      const response = await fetch(`${BACKEND_URL}/simulate-attack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ num_transactions: 5 })
      });
      const result = await response.json();
      console.log(result);
    } catch (error) {
      console.error('Attack simulation failed:', error);
    }
    setIsSimulating(false);
  };

  const getRiskColor = (decision) => {
    switch (decision) {
      case 'APPROVE': return 'bg-green-50 border-green-200';
      case 'FLAG': return 'bg-yellow-50 border-yellow-200';
      case 'BLOCK': return 'bg-red-50 border-red-200';
      default: return 'bg-gray-50';
    }
  };

  const getRiskIcon = (decision) => {
    switch (decision) {
      case 'APPROVE': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'FLAG': return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'BLOCK': return <Ban className="w-5 h-5 text-red-600" />;
      default: return null;
    }
  };

  const getRiskBadgeColor = (decision) => {
    switch (decision) {
      case 'APPROVE': return 'bg-green-100 text-green-800';
      case 'FLAG': return 'bg-yellow-100 text-yellow-800';
      case 'BLOCK': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const pieData = [
    { name: 'APPROVE', value: riskStats.approve, color: '#10b981' },
    { name: 'FLAG', value: riskStats.flag, color: '#f59e0b' },
    { name: 'BLOCK', value: riskStats.block, color: '#ef4444' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-950 border-b border-slate-700 sticky top-0 z-50">
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
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500' : 
                connectionStatus === 'connecting' ? 'bg-yellow-500' : 
                'bg-red-500'
              }`}></div>
              <span className="text-sm text-slate-300">
                {connectionStatus === 'connected' ? 'Connected' : 
                 connectionStatus === 'connecting' ? 'Connecting...' : 
                 'Disconnected'}
              </span>
            </div>
            
            <motion.button
              onClick={simulateAttack}
              disabled={isSimulating}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-600 text-white rounded-lg font-semibold transition-colors"
            >
              {isSimulating ? 'Simulating...' : '🔴 Simulate Attack'}
            </motion.button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-green-900 to-green-800 p-6 rounded-lg border border-green-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-200 text-sm font-semibold">APPROVED</p>
                <p className="text-white text-3xl font-bold mt-2">{riskStats.approve}</p>
              </div>
              <CheckCircle className="w-12 h-12 text-green-400 opacity-50" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-yellow-900 to-yellow-800 p-6 rounded-lg border border-yellow-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-200 text-sm font-semibold">FLAGGED</p>
                <p className="text-white text-3xl font-bold mt-2">{riskStats.flag}</p>
              </div>
              <AlertTriangle className="w-12 h-12 text-yellow-400 opacity-50" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-red-900 to-red-800 p-6 rounded-lg border border-red-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-200 text-sm font-semibold">BLOCKED</p>
                <p className="text-white text-3xl font-bold mt-2">{riskStats.block}</p>
              </div>
              <Ban className="w-12 h-12 text-red-400 opacity-50" />
            </div>
          </motion.div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Bar Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-2 bg-slate-800 rounded-lg p-6 border border-slate-700"
          >
            <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Transaction Timeline
            </h2>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                  <XAxis dataKey="time" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                    labelStyle={{ color: '#e2e8f0' }}
                  />
                  <Bar dataKey="approve" stackId="a" fill="#10b981" />
                  <Bar dataKey="flag" stackId="a" fill="#f59e0b" />
                  <Bar dataKey="block" stackId="a" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-300 flex items-center justify-center text-slate-400">
                Waiting for transactions...
              </div>
            )}
          </motion.div>

          {/* Pie Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-slate-800 rounded-lg p-6 border border-slate-700"
          >
            <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Distribution
            </h2>
            {(riskStats.approve + riskStats.flag + riskStats.block) > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', color: '#e2e8f0' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-300 flex items-center justify-center text-slate-400">
                No data yet
              </div>
            )}
          </motion.div>
        </div>

        {/* Transactions Feed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-slate-700">
            <h2 className="text-white font-bold text-lg">Live Transactions</h2>
          </div>
          
          <div className="divide-y divide-slate-700 max-h-96 overflow-y-auto">
            {transactions.length > 0 ? (
              transactions.map((tx, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`p-4 cursor-pointer hover:bg-slate-700/50 transition-colors border-l-4 ${
                    tx.risk_analysis.decision === 'APPROVE' ? 'border-l-green-500' :
                    tx.risk_analysis.decision === 'FLAG' ? 'border-l-yellow-500' :
                    'border-l-red-500'
                  }`}
                  onClick={() => setSelectedTx(tx)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {getRiskIcon(tx.risk_analysis.decision)}
                      <div>
                        <p className="text-white font-semibold">{tx.user_id}</p>
                        <p className="text-slate-400 text-sm">{tx.location.city}, {tx.location.country}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold">${tx.amount.toFixed(2)}</p>
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mt-1 ${getRiskBadgeColor(tx.risk_analysis.decision)}`}>
                        {tx.risk_analysis.decision}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Risk Score: {(tx.risk_analysis.risk_score * 100).toFixed(0)}%</span>
                    <span className="text-slate-500">{tx.device_type}</span>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-400">
                Waiting for transactions... Make sure backend is running!
              </div>
            )}
          </div>
        </motion.div>

        {/* Transaction Details Modal */}
        {selectedTx && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedTx(null)}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-800 rounded-lg border border-slate-700 p-6 max-w-2xl w-full max-h-96 overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white text-xl font-bold">Transaction Details</h3>
                <button
                  onClick={() => setSelectedTx(null)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 text-slate-300">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-slate-400 text-sm">Transaction ID</p>
                    <p className="text-white font-mono text-sm">{selectedTx.transaction_id}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">User ID</p>
                    <p className="text-white">{selectedTx.user_id}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">Amount</p>
                    <p className="text-white font-bold">${selectedTx.amount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">Location</p>
                    <p className="text-white">{selectedTx.location.city}, {selectedTx.location.country}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">Device</p>
                    <p className="text-white">{selectedTx.device_type}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">IP Address</p>
                    <p className="text-white font-mono">{selectedTx.ip_address}</p>
                  </div>
                </div>

                <div className="border-t border-slate-700 pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    {getRiskIcon(selectedTx.risk_analysis.decision)}
                    <p className="text-white font-bold text-lg">{selectedTx.risk_analysis.decision}</p>
                    <span className={`ml-auto px-3 py-1 rounded-full text-sm font-semibold ${getRiskBadgeColor(selectedTx.risk_analysis.decision)}`}>
                      {(selectedTx.risk_analysis.risk_score * 100).toFixed(0)}% Risk
                    </span>
                  </div>
                  
                  <div className="bg-slate-700/50 rounded p-3 mt-3">
                    <p className="text-slate-300 text-sm font-semibold mb-2">Risk Factors:</p>
                    <ul className="space-y-1 text-sm text-slate-400">
                      {selectedTx.risk_analysis.explanation.map((exp, idx) => (
                        <li key={idx}>• {exp}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </main>
    </div>
  );
}