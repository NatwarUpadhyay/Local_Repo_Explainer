<img width="764" height="697" alt="Screenshot 2025-11-30 141120" src="https://github.com/user-attachments/assets/981e02cf-dc25-4fec-87fc-2db9651f8323" />

# 🚀 LocalRepoExplainer - Agentic AI Code Analysis

**Understand code in seconds** with autonomous AI agents and Chain-of-Thought reasoning. Built for developers and teams who value **privacy, intelligence, and control**.

> 🤖 **Powered by Agentic AI:** Multi-agent pipeline with intelligent orchestration, autonomous decision-making, and step-by-step reasoning for deep code understanding.

## ✨ Key Features

### 🔒 100% Private & Local
- All analysis runs on your machine
- No code sent to external servers
- Choose from 9+ local LLM models
- Complete data sovereignty

### 🎨 Modern Interface
- Dark theme with smooth animations
- Dual visualization: Tree View + Graph View
- Real-time progress tracking
- Interactive dependency exploration

### 🌐 Multi-Language Support
- Python, JavaScript, TypeScript, Java, C/C++, C#, Go, Rust, PHP, Ruby, Swift, Kotlin, and more
- Automatic language detection
- Framework-aware parsing

### 🤖 Agentic AI Pipeline
- **Chain-of-Thought (CoT) Reasoning:** Step-by-step architecture analysis with transparent logic
- **Multi-Agent Orchestration:** Parser agents → Graph builder agents → LLM analysis agents
- **Autonomous Code Intelligence:** Self-directed language detection and framework recognition
- **Natural Language Generation:** Human-readable explanations from AI agents

---

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- Node.js 16+
- Redis (or use Docker for Redis only)

### Running Locally

### Option 1: Quick Start with PowerShell (Windows)

```powershell
# One-time setup (installs dependencies, downloads model)
.\setup_venv.ps1

# Start all services
.\run.ps1
```

### Option 2: Manual Setup

1. **Install dependencies:**

   ```powershell
   # Create virtual environment
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   
   # Install backend dependencies
   pip install -r backend\requirements.txt
   pip install -r worker\requirements.txt
   
   # Install frontend dependencies
   cd frontend
   npm install
   cd ..
   ```

2. **Download LLM model:**

   ```powershell
   python download_model.py
   ```

3. **Start services:**

   ```powershell
   # Terminal 1: Backend API
   .\venv\Scripts\python.exe -m uvicorn backend.app.main:app --reload --port 8000
   
   # Terminal 2: Celery Worker
   .\venv\Scripts\python.exe -m celery -A backend.app.worker worker --loglevel=info -P solo
   
   # Terminal 3: Frontend
   cd frontend
   npm run dev
   ```

### Access the Application

- **Web UI:** http://localhost:3000
- **API Docs:** http://localhost:8000/docs
- **Health Check:** http://localhost:8000/health

### Docker Deployment (Optional)

Docker configurations are provided but the recommended setup is local virtual environment for better performance with LLM models.

```bash
# If you prefer Docker
docker-compose up --build
```

---

## 📚 Documentation

- **[QUICKSTART.md](./QUICKSTART.md)** - Quick start guide for new users
- **[START_HERE.md](./START_HERE.md)** - Detailed getting started instructions
- **[PROJECT_REFERENCE.md](./PROJECT_REFERENCE.md)** - Complete technical documentation
- **[CLEANUP_SUMMARY.md](./CLEANUP_SUMMARY.md)** - Repository cleanup and structure

---

## 🏗️ Architecture

```
LocalRepoExplainer/
├── backend/          # FastAPI REST API
├── frontend/         # Next.js React UI
├── worker/           # Celery background tasks
├── cli/              # Command-line interface
├── charts/           # Kubernetes deployment
└── models/           # LLM models directory
```

**Tech Stack:**
- **Backend:** FastAPI, Celery (Agentic Workers), SQLite
- **Frontend:** Next.js 14, React, TypeScript
- **AI Engine:** llama-cpp-python with Chain-of-Thought prompting, GGUF models
- **Agent Communication:** Redis message queue for multi-agent coordination
- **Intelligent Parsers:** tree-sitter with autonomous language detection (20+ languages)

---

## 📖 Usage

1. Open http://localhost:3000
2. Select or upload an LLM model
3. Enter a GitHub repository URL or upload code
4. Click "Analyze Repository"
5. Explore results in Tree View or Graph View
6. Use "Analyze Locally" for detailed component insights
7. Check security vulnerabilities in the red-highlighted section

---

## 🤝 Contributing

This is a complete, production-ready application. For enterprise features (GraphQL API, vulnerability scanning, export capabilities, OAuth), see enhancement ideas in `PROJECT_REFERENCE.md`.

---

## 📄 License

MIT License - See LICENSE file for details

---

**Built with ❤️ for developers who value privacy and control**
