# Digital Trust – Real-Time Fraud Shield for the Unbanked (Case Study 2)

## 📌 Overview
This project explores the design and implementation of an AI-powered fraud detection system tailored for unbanked populations. Unlike conventional rule-based systems, the solution leverages behavioral profiling, anomaly detection, and contextual data integration to identify fraudulent transactions in real time—without disrupting legitimate user activity.
## 🚨 Problem Statement
Traditional fraud detection systems often fail to keep pace with evolving fraud tactics. They struggle with:
- Detecting sophisticated or adaptive fraud patterns
- Operating in real time without slowing down transactions
- Minimizing false positives that frustrate legitimate users
This project addresses the urgent need for AI-driven fraud detection that balances security, speed, and user trust.
## 🛠️ Technical Challenges
The solution tackles several key challenges:
- **Behavioral Profiling:** Building baselines of “normal” user activity (frequency, amount, location, time).
- **Real-Time Anomaly Scoring:** Scoring transactions in milliseconds to decide whether to Approve, Flag, or Block.
- **Imbalanced Class Handling:** Using techniques like SMOTE or focal loss to manage datasets where fraud cases are rare.
- **Contextual Data Integration:** Incorporating external signals (IP reputation, device fingerprints) to improve accuracy.
## ⚙️ Technical Feasibility & Constraints
- **Low Latency:** Models must operate in real time to avoid slowing down checkout processes.
- **False Positive Control:** Reducing unnecessary blocks to maintain user trust.
- **Privacy-First Approach:** Ensuring ethical handling of sensitive financial data and maintaining data integrity.
## 📂 Structure
```
Vhack-2026 (branch: main)
├── .gitignore
├── package.json
├── package-lock.json
├── temp.txt
|
├── backend/
│   ├── fraud_engine.py
│   ├── main.py
│   ├── models.py
│   ├── requirements.txt
│   └── transaction_simulator.py
|
└── digital-trust/
    ├── .gitignore
    ├── README.md
    ├── eslint.config.js
    ├── index.html
    ├── package.json
    ├── package-lock.json
    ├── postcss.config.js
    ├── tailwind.config.js
    ├── vite.config.js
    |
    ├── public/
    │   ├── favicon.svg
    │   └── icons.svg
    |
    └── src/
        ├── App.css
        ├── App.jsx
        ├── DigitalTrustApp.jsx
        ├── index.css
        ├── main.jsx
        |
        └── assets/
            ├── hero.png
            ├── react.svg
            └── vite.svg
```
## 🚀 Quick Start
## Prerequisites

- Python 3.10+
- Node.js (LTS version)
- npm (comes with Node.js)

### Set up virtual environmnet
at terminal type
```bash
py -m venv .venv
#or change py to python/python3
python -m venv .venv
```
For quick start, press
1. CTRL + SHIFT + P
2. Select "Python: Select Interpreter"
3. Select " +create virtual Environment..."

It will pop out a green (.venv) in your terminal
### 1. Start the Backend (Terminal 1)

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
```

### 2. Start the Frontend (Terminal 2)

```bash
cd digital trust
npm install
npm run dev
```

You should see:
```
✔ Compiled successfully.
✔ Built successfully.
** Angular Live Development Server is listening on localhost:5173 **
```

### 3. Open the Application

Open your browser and go to: **http://localhost:5173**

## What You'll See

- **Dashboard**: Live transaction feed with real-time fraud detection
- **Risk Meter**: Visual gauge showing the current risk score
- **AI Explanation**: Why each transaction was approved, flagged, or blocked
- **Behavior Analytics**: User spending patterns and device usage
- **Fraud Map**: World map showing transaction locations
- **Attack Simulator**: Button to inject fraudulent transactions for demo

## Test the Features

1. **Watch Live Transactions**: Transactions appear automatically every 2-5 seconds
2. **Simulate Fraud**: Go to "Attack Simulator" and click "Simulate Fraud Attack"
3. **View Analytics**: Navigate to "Behavior Analytics" to see user profiles
4. **Check the Map**: Go to "Fraud Map" to see transaction locations

## Troubleshooting

### Backend won't start
```bash
# Check if port 8000 is in use
lsof -i :8000
# Use a different port
uvicorn main:app --reload --port 8001
```

### Frontend won't start
```bash
# Clear npm cache and reinstall
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
ng serve
```

### No transactions appearing
1. Check browser console (F12) for errors
2. Verify backend is running on http://127.0.0.1:8000
3. Check Network tab to see WebSocket connection

## ✅ Key Outcomes
Real-time fraud detection with millisecond-level scoring
Improved accuracy through contextual data integration
Reduced false positives, enhancing user trust
Privacy-first design principles


## Deployed Links
1. backend deployed links (Render): https://vhack-2026.onrender.com
2. Frontend deployed links (Vercel): https://vhack-2026-beta.vercel.app
