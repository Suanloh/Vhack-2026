import React, { useState, useEffect } from 'react';
import { Shield, CheckCircle, AlertTriangle, Ban } from 'lucide-react';
import { motion } from 'framer-motion';

// ===== HYBRID URL DETECTION =====
const BACKEND_URL = (() => {
  // Dev mode: frontend on port 5173, backend on 8000
  if (typeof window !== 'undefined' && window.location.port === '5173') {
    return 'http://localhost:8000';
  }
  // Production: same origin
  return typeof window !== 'undefined' ? window.location.origin : '';
})();

const getWsUrl = () => {
  if (typeof window === 'undefined') return '';
  const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  
  // Dev mode: separate backend server
  if (window.location.port === '5173') {
    return `ws://localhost:8000/transactions/live`;
  }
  
  // Production: same host
  return `${wsProtocol}://${window.location.host}/transactions/live`;
};

export default function DigitalTrustApp() {
  const [transactions, setTransactions] = useState([]);
  const [riskStats, setRiskStats] = useState({ approve: 0, flag: 0, block: 0 });
  const [chartData, setChartData] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [connectionError, setConnectionError] = useState('');
  const [selectedTx, setSelectedTx] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // WebSocket connection for live transactions
  useEffect(() => {
    let ws;
    let reconnectTimeout;

    // Wrapper function to allow recursive reconnection
    const connect = () => {
      console.log('Attempting WebSocket connection to:', getWsUrl());
      ws = new WebSocket(getWsUrl());

      ws.onopen = () => {
        setConnectionStatus('connected');
        setConnectionError('');
        console.log('✅ WebSocket connected successfully');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const { transaction, risk_analysis } = data;

          setTransactions(prev => {
            const updated = [{ ...transaction, risk_analysis }, ...prev].slice(0, 20);
            return updated;
          });

          // Ensure safe fallback if decision is missing
          const decision = risk_analysis?.decision || 'APPROVE';
          
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
        const errorMsg = `❌ WebSocket connection failed. Ensure backend is running at ${BACKEND_URL}`;
        setConnectionError(errorMsg);
        console.error(errorMsg);
      };

      ws.onclose = () => {
        setConnectionStatus('disconnected');
        console.log('WebSocket disconnected, retrying in 3 seconds...');
        // Set to connecting immediately so the UI reflects the attempt
        setConnectionStatus('connecting'); 
        reconnectTimeout = setTimeout(connect, 3000);
      };
    };

    // Initiate first connection
    connect();

    // Cleanup on unmount
    return () => {
      console.log('Cleaning up WebSocket connection');
      clearTimeout(reconnectTimeout);
      if (ws) {
        // Remove the onclose handler so it doesn't trigger a reconnect when the component unmounts
        ws.onclose = null; 
        ws.close();
      }
    };
  }, []); // Empty dependency array is now safe because `connect` handles its own logic

  // Simulate attack
  const simulateAttack = async () => {
    setIsSimulating(true);
    try {
      console.log('Sending attack simulation to:', `${BACKEND_URL}/simulate-attack`);
      const response = await fetch(`${BACKEND_URL}/simulate-attack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ num_transactions: 5 })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('✅ Attack simulated successfully:', result);
    } catch (error) {
      console.error('❌ Attack simulation failed:', error);
      alert(`Simulation Error: ${error.message} \n\nCheck if CORS is enabled on the backend for http://localhost:5173.`);
    } finally {
      setIsSimulating(false);
    }
  };

  // Helper Functions
  const getRiskIcon = (decision) => {
    switch (decision?.toUpperCase()) {
      case 'APPROVE': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'FLAG': return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'BLOCK': return <Ban className="w-5 h-5 text-red-600" />;
      default: return null;
    }
  };

  const getRiskBadgeColor = (decision) => {
    switch (decision?.toUpperCase()) {
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
            {connectionError && (
              <div className="text-xs text-red-400 max-w-xs text-right">
                {connectionError}
              </div>
            )}

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
              disabled={isSimulating || connectionStatus !== 'connected'}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-600 text-white rounded-lg font-semibold transition-colors flex items-center justify-center min-w-[160px]"
              title={connectionStatus !== 'connected' ? 'Connect to backend first' : ''}
            >
              {isSimulating ? 'Simulating...' : '🔴 Simulate Attack'}
            </motion.button>
          </div>
        </div>
      </header>

      {/* Main Content Area Placeholder - You can paste your existing dashboard components here */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="text-white">Dashboard Content Loading...</div>
      </main>
    </div>
  );
}