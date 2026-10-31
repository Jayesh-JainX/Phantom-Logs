# 👻 Phantom Logs

**Turn Boring 3:00 AM Server & Smart-Home Logs into a Chilling Ghost Story**

[![Live Demo](https://img.shields.io/badge/Live_Demo-Visit_Phantom_Logs-9333ea?style=for-the-badge)](https://phantom-logs.vercel.app)

---

## 📸 Demo Preview

![Phantom Logs Demo Screenshot](./frontend\public\demo.png)

🔗 **Try it Live:** [https://phantom-logs.vercel.app](https://phantom-logs.vercel.app)

---

## 🕯️ The Vibe

Every developer and smart-home owner has boring logs sitting around—like 3:00 AM git commit histories, crashed terminal outputs, or late-night smart-home sensor events (`[02:14 AM] Living Room Motion Detected`).

What if those glitches weren't bugs, but something lurking inside your machine?

## 🔮 How It Works

1. **Paste Your Logs:** Drop in raw terminal output, git history, or smart-home activity (or click **"Load haunted 3:00 AM sample logs"** to test it instantly).
2. **Optional Quick-Redact:** Scrub sensitive IPs and secret keys with one click right in your browser.
3. **Uncover the Haunting:** Our AI **Paranormal Systems Investigator** reads the exact timestamps and error codes to generate a complete **Paranormal Incident Report**:
   - 🚨 **Spectral Threat Level:** A spooky classification rating (e.g., _"Class 4 Poltergeist in node_modules"_).
   - ⚡ **Possessed Telemetry Anomalies:** Real log lines translated into eerie observations.
   - 📖 **What Happened While You Slept:** A chilling 2-paragraph ghost story woven directly from your timestamps.

---

## 🛡️ Why Open-Source AI? (Privacy & Security)

Server logs, git histories, and smart-home telemetry contain deeply sensitive data—IP addresses, internal file paths, and the exact hours you are asleep in your home. Pasting raw system logs into a closed commercial product that stores your prompts is a major privacy risk.

**Phantom Logs** is built for privacy first:

- **Zero Database Storage:** Nothing you paste is ever saved to a database.
- **Stateless Memory:** Powered by an open-weight model with an in-memory backend, your logs are turned into a ghost story and immediately purged from RAM.
- **One-Click Local Redaction:** Built-in browser redaction lets you mask IPs and API tokens before your logs ever leave the page.

---

## 🚀 Quick Start (Run Locally)

1. **Start the Backend:**

   ```bash
   cd backend
   npm install
   # Add your OPENROUTER_API_KEY to a .env file
   node index.js
   ```

2. **Start the Frontend:**

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **Open http://localhost:3000, click "Load haunted 3:00 AM sample logs", and click "Uncover the Haunting".**
