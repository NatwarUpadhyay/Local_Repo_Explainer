# 🎯 LocalRepoExplainer - Start Here!

## ✅ What This Application Does

LocalRepoExplainer is a **complete, privacy-first agentic AI code analyzer** with autonomous multi-agent architecture:

### Agentic AI Core ✅
- **Multi-Agent Pipeline** - Autonomous agents for parsing, analysis, and generation
- **Chain-of-Thought (CoT) Reasoning** - Transparent step-by-step logic for architecture insights
- **Intelligent Orchestration** - Self-directed workflow management with Celery agents
- **Autonomous Language Detection** - AI-driven identification of 20+ programming languages
- **Natural Language Generation** - Human-readable explanations from AI agents
- **Privacy-First** - 100% local processing, no code leaves your machine

### Agentic Components ✅
- **Model Management API** (`backend/app/api/models.py`) - Agent model selection and validation
- **LLM Service** (`backend/app/services/llm_service.py`) - CoT prompt engineering and reasoning
- **Worker Agents** (`backend/app/worker.py`) - Autonomous job processing with intelligent orchestration
- **Model Selector UI** (`frontend/components/ModelSelector.tsx`) - AI model configuration interface
- **Main Orchestrator** (`frontend/app/page.tsx`) - Complete agentic workflow coordination
- **Automation Scripts** - `download_model.py`, `setup_venv.ps1`, `run.ps1` for streamlined deployment

### Documentation ✅
- **[QUICKSTART.md](./QUICKSTART.md)** - Quick start guide
- **[PROJECT_REFERENCE.md](./PROJECT_REFERENCE.md)** - Complete technical documentation (2785+ lines)
- **[CLEANUP_SUMMARY.md](./CLEANUP_SUMMARY.md)** - Repository structure and cleanup log

---

## 🚀 Quick Start

### Option 1: Automated Setup (Recommended)

```powershell
# One-time setup (installs dependencies, downloads model)
.\setup_venv.ps1

# Start all services
.\run.ps1
```

### Option 2: Manual Setup

#### 1. Download the Model (~5 minutes)

```powershell
python download_model.py
```

Downloads **Llama-3.2-1B-Instruct-Q4_K_M.gguf** (~760 MB) to `models/` folder.

#### 2. Start All Services

**Terminal 1: Backend API**
```powershell
.\venv\Scripts\python.exe -m uvicorn backend.app.main:app --reload --port 8000
```

**Terminal 2: Celery Worker**
```powershell
.\venv\Scripts\python.exe -m celery -A backend.app.worker worker --loglevel=info -P solo
```

**Terminal 3: Frontend**
```powershell
cd frontend
npm run dev
```

**Terminal 4: Redis** (separate window)
```powershell
redis-server
```

---

## 🌐 Access Points

Once services are running:

- **Frontend:** http://localhost:3000
- **API Docs:** http://localhost:8000/docs
- **Health Check:** http://localhost:8000/health

---

## 🎨 Using the Application

### Step 1: Select a Model

**Option A: Use Pre-Downloaded Model**
- If you ran `setup_venv.ps1`, Llama 3.2 1B is already available
- Click "Upload Your Own Model"
- Browse to `models/Llama-3.2-1B-Instruct-Q4_K_M.gguf`

**Option B: Choose Another Model**
- Select from 9 recommended models
- Click download link to get the .gguf file
- Upload via the UI

### Step 2: Provide Code

**GitHub URL:**
```
https://github.com/psf/requests
```

**Or Upload:**
- Drag & drop .zip or .tar.gz file
- Or click "Browse"

### Step 3: Analyze

- Click "Analyze Repository"
- Watch real-time progress (4 stages)
- Analysis takes 20-60 seconds

### Step 4: Explore Results

**Tree View:**
- Click "Analyze Locally" on any component
- View AI-generated insights
- Check security vulnerabilities (red box)

#### Option C: Manual API Test
```powershell
# List models
curl http://localhost:8000/api/v1/models

# Validate model
curl -X POST http://localhost:8000/api/v1/models/test -H "Content-Type: application/json" -d "{\"model_path\": \"./models/Llama-3.2-1B-Instruct-Q4_K_M.gguf\"}"

# Create analysis job
curl -X POST http://localhost:8000/api/v1/jobs/ -H "Content-Type: application/json" -d "{\"repo_url\": \"https://github.com/psf/requests\", \"model_id\": \"llama-3.2-1b\", \"model_path\": \"./models/Llama-3.2-1B-Instruct-Q4_K_M.gguf\"}"
```

## 📊 What to Expect

### Timeline
- **Model Download**: 5-10 minutes (one-time, ~760 MB)
- **First Analysis**: 30-60 seconds (includes model loading)
- **Subsequent Analyses**: 15-30 seconds (model stays loaded)

### System Requirements
- **CPU**: Any modern CPU (4+ cores recommended)
- **RAM**: 2-4 GB available
- **Disk**: 1 GB free space
- **Internet**: Only for initial model download

**Graph View:**
- Interactive dependency graph
- Click nodes, pan, zoom
- Filter by scope (Repository/Directory/File)

**Chat Interface:**
- Ask questions about the codebase
- Get AI-powered answers instantly

---

## 📊 What to Expect

### Performance
- **First Analysis:** 30-60 seconds (model loads into RAM)
- **Subsequent:** 20-40 seconds (model cached)
- **Small repos:** 15-25 seconds
- **Large repos:** 40-90 seconds

### System Requirements
- **CPU:** Any modern CPU (4+ cores recommended)
- **RAM:** 4-8 GB available (more = faster)
- **Disk:** 2 GB free space
- **Internet:** Only for initial model download

### Analysis Quality
Llama 3.2 1B generates:
- Repository overview and architecture
- Key components identification
- Technology stack detection
- Security considerations
- Code quality insights

---

## ✅ Implemented Agentic Features

The application is **production-ready** with these autonomous AI capabilities:

### Agentic AI Pipeline
- ✅ Local LLM agents (9+ models with CoT reasoning)
- ✅ Multi-agent orchestration (Parser → Analyzer → Generator)
- ✅ Autonomous language detection (20+ languages)
- ✅ Chain-of-Thought analysis with transparent logic
- ✅ Intelligent workflow automation

### Code Intelligence
- ✅ Tree + Graph visualization with AI-driven layout
- ✅ Conversational AI chat interface
- ✅ Real-time agent pipeline progress tracking
- ✅ Smart model upload/selection
- ✅ Repository analysis (GitHub/upload) with automated orchestration
- ✅ Dark theme with fluid animations

## 🔮 Future Enhancements

Features below are **not yet implemented**. See `PROJECT_REFERENCE.md` for implementation details:

- 🔮 Multi-level drill-down graphs
- 🔮 GraphQL API
- 🔮 Automated vulnerability scanning
- 🔮 Export (JSON, SVG, PNG, PDF, HTML)
- 🔮 Enterprise auth (OAuth2, RBAC, audit logs)
- 🔮 Performance optimization (100K+ LOC)
- 🔮 Prometheus/Grafana monitoring

---

## 📝 Quick Reference

### Project Structure
```
LocalRepoExplainer/
├── backend/              # FastAPI + API + Services
├── frontend/             # Next.js + React Components
├── worker/               # Celery + Language Parsers
├── cli/                  # Command-line interface
├── charts/               # Kubernetes deployment
├── models/               # LLM models directory
│   └── Llama-3.2-1B-Instruct-Q4_K_M.gguf
├── download_model.py     # Model downloader
├── setup_venv.ps1        # One-time setup
└── run.ps1               # Start all services
```

### API Endpoints
- `GET /api/v1/models` - List available models
- `POST /api/v1/models/test` - Validate model file
- `POST /api/v1/jobs` - Create analysis job
- `GET /api/v1/jobs/{id}` - Get job status
- `GET /api/v1/jobs/{id}/graph` - Get graph results

### Environment Variables
Optional `.env` file:
```bash
LOCAL_MODEL_PATH=./models/Llama-3.2-1B-Instruct-Q4_K_M.gguf
DATABASE_URL=sqlite:///./repoinsight.db
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
```

---

## 🐛 Troubleshooting

### Model Not Found
```powershell
python download_model.py
```

### Redis Not Running
```powershell
# Windows (via Chocolatey)
choco install redis-64
redis-server

# Or use Docker
docker run -d -p 6379:6379 redis
```

### Port Already in Use
```powershell
# Backend on different port
python -m uvicorn backend.app.main:app --reload --port 8001

# Frontend on different port
cd frontend && npm run dev -- -p 3001
```

### Worker Not Processing
```powershell
# Windows requires -P solo flag
python -m celery -A backend.app.worker worker --loglevel=info -P solo

# Check Redis connection
redis-cli ping  # Should return PONG
```

### Slow Inference
Edit `backend/app/services/llm_service.py`:
```python
# Reduce context for speed
n_ctx=1024  # Default is 2048

# Use more threads
n_threads=8  # Default is 4
```

---

## 🎨 Example Repositories

### Small (Fast - 15-25 seconds)
```
https://github.com/psf/requests
https://github.com/pallets/flask
```

### Medium (30-50 seconds)
```
https://github.com/fastapi/fastapi
https://github.com/django/django
```

### Your Own
Paste any public GitHub URL or upload your code!

---

## 📚 Learn More

- **[QUICKSTART.md](./QUICKSTART.md)** - Quick start guide
- **[README.md](./README.md)** - Project overview
- **[PROJECT_REFERENCE.md](./PROJECT_REFERENCE.md)** - Complete technical documentation (2785+ lines)
- **[CLEANUP_SUMMARY.md](./CLEANUP_SUMMARY.md)** - Repository structure

---

## 💡 Tips for Best Results

### Model Selection
- **1B models:** Fast, good for small repos
- **3B models:** Better quality, slower
- **7B+ models:** Best quality, requires more RAM

### Performance
- **First run:** Slower (model loads)
- **Subsequent:** Faster (model cached)
- **More RAM:** Better performance
- **SSD:** Faster model loading

### Analysis
- Smaller repos = faster analysis
- Python/JS/TS = best parser support
- Complex dependencies = more graph nodes
- Use chat for deeper insights

---

## 🚀 You're Ready!

Everything is set up. Start analyzing your code with:

1. Open http://localhost:3000
2. Select/upload a model
3. Enter GitHub URL or upload code
4. Click "Analyze Repository"
5. Explore results!

**Questions?** Check the documentation files or verify all services are running.

**Happy Analyzing! 🎉**
```
https://github.com/fastapi/fastapi
```
Expected time: 30-50 seconds

### Your Own Repository
Just paste any public GitHub URL!

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| `QUICKSTART_LLM.md` | 5-minute quick start |
| `TESTING_GUIDE.md` | Comprehensive testing instructions |
| `MODEL_INTEGRATION_SUMMARY.md` | Full technical details |
| `MODEL_SETUP_GUIDE.md` | Model configuration guide |

## 🎯 Success Checklist

Before testing, ensure:
- [ ] Model downloaded (`python download_model.py`)
- [ ] Redis running (`redis-server`)
- [ ] Backend API running (`uvicorn ...`)
- [ ] Worker running (`celery ...`)
- [ ] Frontend running (`npm run dev`)

Then run:
```powershell
python check_status.py
```

You should see: **"🎉 All checks passed! System is ready!"**

## 💡 What Makes This Special

### Traditional Approach
- Requires cloud API keys (OpenAI, Anthropic)
- Costs money per request
- Data sent to external servers
- Requires internet connection

### Your Local LLM Approach ✨
- **100% Free** - No API costs
- **100% Private** - Data never leaves your machine
- **100% Offline** - Works without internet
- **100% Customizable** - Use any GGUF model

## 🚀 Next Steps After Testing

1. **Try Different Models**
   - Qwen2.5-Coder (better for code)
   - Phi-3 Mini (more capable)
   - Your own fine-tuned models

2. **Customize Analysis**
   - Edit prompts in `llm_service.py`
   - Add custom analysis templates
   - Integrate with your workflow

3. **Deploy to Production**
   - Use Docker Compose
   - Add authentication
   - Set up monitoring

4. **Contribute**
   - Share your experience
   - Report issues
   - Suggest improvements

## 🎉 You're All Set!

Everything is ready. Just:
1. Download the model: `python download_model.py`
2. Start the services (4 terminals)
3. Open http://localhost:3000
4. Analyze your first repository!

**Questions?** Check the docs or run `python check_status.py` to diagnose issues.

**Happy Analyzing! 🚀**
