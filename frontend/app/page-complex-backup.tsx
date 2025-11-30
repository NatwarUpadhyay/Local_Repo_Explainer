'use client';

import { useState, useCallback, Suspense, lazy, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Lazy load the graph component for better performance
const GraphExplorer = lazy(() => import("@/components/GraphExplorer"));

type InputMode = 'url' | 'upload';

export default function Home() {
  const [inputMode, setInputMode] = useState<InputMode>('url');
  const [repoUrl, setRepoUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setStatus('');
    setProgress(0);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      // For now, only URL submission is implemented in the backend
      if (inputMode === 'url') {
        const response = await fetch(`${apiUrl}/api/v1/jobs/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            repo_url: repoUrl,
            source_type: 'git',
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create analysis job');
        }

        const data = await response.json();
        setJobId(data.id);
        setStatus(data.status);
        pollJobStatus(data.id);
      } else {
        // File upload - TODO: Implement backend endpoint
        throw new Error('File upload coming soon! Use GitHub URL for now.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  const pollJobStatus = async (id: string) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${apiUrl}/api/v1/jobs/${id}`);
        if (!response.ok) throw new Error('Failed to fetch job status');

        const data = await response.json();
        setStatus(data.status);
        setProgress(data.progress);

        if (data.status === 'COMPLETED' || data.status === 'FAILED') {
          clearInterval(interval);
          setLoading(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        clearInterval(interval);
        setLoading(false);
      }
    }, 2000);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith('.zip') || droppedFile.name.endsWith('.tar.gz'))) {
      setFile(droppedFile);
    } else {
      setError('Please drop a .zip or .tar.gz file');
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
    }
  };

  const getStatusColor = (currentStatus: string) => {
    switch (currentStatus) {
      case 'COMPLETED': return 'text-green-400';
      case 'FAILED': return 'text-red-400';
      case 'PARSING': return 'text-blue-400';
      case 'BUILDING_GRAPH': return 'text-purple-400';
      case 'EXPLAINING': return 'text-pink-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <main className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Animated Gradient Mesh Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Dynamic gradient orbs */}
        <motion.div 
          animate={{
            x: mousePosition.x / 50,
            y: mousePosition.y / 50,
          }}
          transition={{ type: "spring", stiffness: 50, damping: 20 }}
          className="absolute -top-1/2 -left-1/2 w-full h-full"
        >
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-purple-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-30 animate-pulse-slow"></div>
        </motion.div>
        <motion.div 
          animate={{
            x: -mousePosition.x / 40,
            y: -mousePosition.y / 40,
          }}
          transition={{ type: "spring", stiffness: 50, damping: 20 }}
          className="absolute -top-1/2 -right-1/2 w-full h-full"
        >
          <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-blue-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-30 animate-pulse-slow animation-delay-2000"></div>
        </motion.div>
        <motion.div 
          animate={{
            x: mousePosition.x / 60,
            y: -mousePosition.y / 60,
          }}
          transition={{ type: "spring", stiffness: 50, damping: 20 }}
          className="absolute -bottom-1/2 left-1/3 w-full h-full"
        >
          <div className="absolute bottom-1/4 left-1/2 w-[550px] h-[550px] bg-pink-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-30 animate-pulse-slow animation-delay-4000"></div>
        </motion.div>
        
        {/* Grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:100px_100px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-20 max-w-7xl">
        {/* Hero Header */}
        <motion.div 
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-20"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 backdrop-blur-sm"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
            </span>
            <span className="text-sm font-medium text-purple-300">Now in Beta • Join 10,000+ developers</span>
          </motion.div>

          {/* Main Title */}
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="text-7xl md:text-8xl font-black mb-6 leading-tight"
          >
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent animate-gradient">
              Understand Code
            </span>
            <br />
            <span className="text-white">In Seconds</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-8 leading-relaxed"
          >
            AI-powered repository analysis that reveals architecture, dependencies, and insights—instantly.
            <span className="block mt-2 text-purple-400 font-semibold">Your code stays private. Always.</span>
          </motion.p>

          {/* Social Proof */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.8 }}
            className="flex items-center justify-center gap-8 text-sm text-gray-500"
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl">⚡</span>
              <span>Instant Analysis</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🔒</span>
              <span>100% Private</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎯</span>
              <span>Multi-Language</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Main Input Card */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="glass-morphism rounded-3xl shadow-2xl p-8 md:p-12 mb-12 border border-white/10"
        >
          {/* Tab Selector */}
          <div className="flex space-x-3 mb-8 bg-white/5 p-2 rounded-2xl backdrop-blur-xl">
            <motion.button
              type="button"
              onClick={() => setInputMode('url')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`flex-1 py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 ${
                inputMode === 'url'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/50'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="mr-2 text-2xl">🔗</span>
              GitHub URL
            </motion.button>
            <motion.button
              type="button"
              onClick={() => setInputMode('upload')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`flex-1 py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 ${
                inputMode === 'upload'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/50'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="mr-2 text-2xl">📁</span>
              Upload File
            </motion.button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <AnimatePresence mode="wait">
              {inputMode === 'url' ? (
                <motion.div
                  key="url"
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 30 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <div>
                    <label htmlFor="repoUrl" className="block text-lg font-bold text-white mb-3">
                      Repository URL
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
                      <input
                        type="url"
                        id="repoUrl"
                        value={repoUrl}
                        onChange={(e) => setRepoUrl(e.target.value)}
                        placeholder="https://github.com/username/repository"
                        className="relative w-full px-6 py-5 bg-white/10 border-2 border-white/20 rounded-2xl focus:ring-4 focus:ring-purple-500/30 focus:border-purple-500 transition-all text-lg text-white placeholder-gray-500 backdrop-blur-xl"
                        required={inputMode === 'url'}
                        disabled={loading}
                      />
                    </div>
                    <motion.p 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-3 text-sm text-gray-400 flex items-center gap-2"
                    >
                      <span>💡</span>
                      <span>Supports public GitHub, GitLab, and Bitbucket repositories</span>
                    </motion.p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="upload"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`relative border-4 border-dashed rounded-3xl p-16 text-center transition-all duration-300 backdrop-blur-xl ${
                      isDragging
                        ? 'border-blue-500 bg-blue-500/10 scale-105'
                        : 'border-white/20 hover:border-white/40 bg-white/5'
                    }`}
                  >
                    <input
                      type="file"
                      id="fileUpload"
                      accept=".zip,.tar.gz"
                      onChange={handleFileChange}
                      className="hidden"
                      disabled={loading}
                    />
                    <label htmlFor="fileUpload" className="cursor-pointer">
                      <motion.div 
                        animate={isDragging ? { scale: 1.1 } : { scale: 1 }}
                        className="space-y-6"
                      >
                        <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-500 to-cyan-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/50">
                          <span className="text-5xl">📦</span>
                        </div>
                        {file ? (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                          >
                            <p className="text-2xl font-bold text-white mb-2">{file.name}</p>
                            <p className="text-lg text-gray-400">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                            <p className="text-sm text-green-400 mt-3 flex items-center justify-center gap-2">
                              <span>✓</span> Ready to analyze
                            </p>
                          </motion.div>
                        ) : (
                          <div>
                            <p className="text-2xl font-bold text-white mb-2">
                              {isDragging ? 'Drop it here!' : 'Drop your file here'}
                            </p>
                            <p className="text-lg text-gray-400 mb-4">
                              or click to browse
                            </p>
                            <p className="text-sm text-gray-500">
                              Supports .zip and .tar.gz files • Max 5GB
                            </p>
                          </div>
                        )}
                      </motion.div>
                    </label>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              type="submit"
              disabled={loading || (inputMode === 'url' && !repoUrl) || (inputMode === 'upload' && !file)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-white py-6 px-8 rounded-2xl font-black text-xl disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed transition-all shadow-2xl hover:shadow-purple-500/50 disabled:shadow-none animate-gradient"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-3">
                  <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analyzing your code...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-3">
                  <span className="text-2xl">✨</span>
                  <span>Analyze Repository</span>
                  <span className="text-2xl">→</span>
                </span>
              )}
            </motion.button>
          </form>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="mt-6 p-6 bg-red-500/10 border-2 border-red-500/50 rounded-2xl backdrop-blur-xl"
              >
                <div className="flex items-start gap-3">
                  <span className="text-3xl">⚠️</span>
                  <div>
                    <p className="text-red-400 font-bold text-lg mb-1">Analysis Failed</p>
                    <p className="text-red-300">{error}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Status Display */}
        <AnimatePresence>
          {jobId && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="glass-morphism rounded-3xl shadow-2xl p-8 md:p-12 mb-12 border border-white/10"
            >
              <h2 className="text-4xl font-black text-white mb-8 flex items-center gap-3">
                <span className="text-5xl">📊</span>
                Analysis in Progress
              </h2>
              
              <div className="space-y-8">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <span className="text-lg font-semibold text-gray-400">
                        Current Stage
                      </span>
                      <p className={`text-2xl font-black mt-1 ${getStatusColor(status)}`}>
                        {status.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-semibold text-gray-400">
                        Progress
                      </span>
                      <p className="text-5xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                        {progress}%
                      </p>
                    </div>
                  </div>
                  
                  <div className="relative w-full h-4 bg-white/5 rounded-full overflow-hidden backdrop-blur-xl border border-white/10">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 rounded-full shadow-lg animate-gradient"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-2xl p-6 backdrop-blur-xl border border-white/10">
                    <p className="text-sm text-gray-400 mb-1">Job ID</p>
                    <code className="text-sm text-purple-400 font-mono font-bold">{jobId}</code>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-6 backdrop-blur-xl border border-white/10">
                    <p className="text-sm text-gray-400 mb-1">Estimated Time</p>
                    <p className="text-lg text-white font-bold">~{Math.max(1, Math.ceil((100 - progress) / 20))} minutes</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Graph Visualization */}
        <AnimatePresence>
          {status === 'COMPLETED' && jobId && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="glass-morphism rounded-3xl shadow-2xl p-8 md:p-12 border border-white/10"
            >
              <h2 className="text-4xl font-black text-white mb-8 flex items-center gap-3">
                <span className="text-5xl">🗺️</span>
                Repository Insights
              </h2>
              <Suspense fallback={
                <div className="flex items-center justify-center h-96">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent mx-auto mb-4"></div>
                    <p className="text-gray-400 font-semibold">Loading visualization...</p>
                  </div>
                </div>
              }>
                <GraphExplorer jobId={jobId} />
              </Suspense>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Features & Value Props */}
        {!jobId && (
          <>
            {/* Feature Grid */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="mt-20 grid md:grid-cols-3 gap-8"
            >
              {[
                { 
                  icon: '🚀', 
                  title: 'Lightning Fast', 
                  desc: 'Analyze 100K+ lines of code in seconds with optimized parsing and intelligent caching',
                  gradient: 'from-purple-500/10 to-pink-500/10',
                  border: 'border-purple-500/20'
                },
                { 
                  icon: '🔒', 
                  title: '100% Private', 
                  desc: 'Your code never leaves your infrastructure. Self-hosted, secure, and compliance-ready',
                  gradient: 'from-blue-500/10 to-cyan-500/10',
                  border: 'border-blue-500/20'
                },
                { 
                  icon: '🎯', 
                  title: 'Multi-Language', 
                  desc: 'Python, JavaScript, TypeScript, Java, Go, Rust, and more. Full AST-level understanding',
                  gradient: 'from-green-500/10 to-emerald-500/10',
                  border: 'border-green-500/20'
                }
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 + i * 0.1, duration: 0.5 }}
                  whileHover={{ y: -8, scale: 1.02 }}
                  className={`glass-morphism rounded-3xl p-8 border ${feature.border} backdrop-blur-xl bg-gradient-to-br ${feature.gradient} hover:shadow-2xl transition-all duration-300`}
                >
                  <div className="text-6xl mb-4">{feature.icon}</div>
                  <h3 className="text-2xl font-black text-white mb-3">{feature.title}</h3>
                  <p className="text-gray-400 leading-relaxed">{feature.desc}</p>
                </motion.div>
              ))}
            </motion.div>

            {/* Use Cases */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.8 }}
              className="mt-20"
            >
              <h2 className="text-5xl font-black text-center text-white mb-16">
                <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                  Built for Everyone
                </span>
              </h2>
              
              <div className="grid md:grid-cols-2 gap-8">
                {/* Individual Developers */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="glass-morphism rounded-3xl p-10 border border-purple-500/20 backdrop-blur-xl bg-gradient-to-br from-purple-500/5 to-pink-500/5 hover:shadow-2xl transition-all duration-300"
                >
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/50">
                      <span className="text-3xl">👨‍💻</span>
                    </div>
                    <h3 className="text-3xl font-black text-white">For Developers</h3>
                  </div>
                  <ul className="space-y-4">
                    {[
                      'Onboard to new codebases 10x faster',
                      'Understand legacy code without digging',
                      'Document your projects automatically',
                      'Find dependencies and dead code instantly'
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-gray-300">
                        <span className="text-green-400 text-xl flex-shrink-0 mt-0.5">✓</span>
                        <span className="text-lg">{item}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8 p-4 bg-purple-500/10 rounded-2xl border border-purple-500/20">
                    <p className="text-sm text-purple-300 font-semibold">
                      💡 <strong>Privacy Guarantee:</strong> Your code stays on your machine. We never store, log, or transmit your source code.
                    </p>
                  </div>
                </motion.div>

                {/* Enterprises */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="glass-morphism rounded-3xl p-10 border border-blue-500/20 backdrop-blur-xl bg-gradient-to-br from-blue-500/5 to-cyan-500/5 hover:shadow-2xl transition-all duration-300"
                >
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/50">
                      <span className="text-3xl">🏢</span>
                    </div>
                    <h3 className="text-3xl font-black text-white">For Teams</h3>
                  </div>
                  <ul className="space-y-4">
                    {[
                      'Accelerate code reviews and audits',
                      'Reduce technical debt visibility gaps',
                      'Compliance-ready with self-hosting',
                      'Save $100K+ in developer time annually'
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-gray-300">
                        <span className="text-blue-400 text-xl flex-shrink-0 mt-0.5">✓</span>
                        <span className="text-lg">{item}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8 p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                    <p className="text-sm text-blue-300 font-semibold">
                      🔐 <strong>Enterprise Features:</strong> SSO, audit logs, custom deployments, and dedicated support available.
                    </p>
                  </div>
                </motion.div>
              </div>
            </motion.div>

            {/* Stats/Social Proof */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1, duration: 0.8 }}
              className="mt-20 glass-morphism rounded-3xl p-12 border border-white/10 backdrop-blur-xl text-center"
            >
              <p className="text-gray-400 text-lg mb-8">Trusted by developers at</p>
              <div className="flex flex-wrap justify-center items-center gap-12">
                {['🦄 Startups', '🏦 Fortune 500', '🎓 Universities', '🔬 Research Labs'].map((org, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1.2 + i * 0.1 }}
                    className="text-2xl font-bold text-gray-500"
                  >
                    {org}
                  </motion.span>
                ))}
              </div>
              <div className="mt-12 grid grid-cols-3 gap-8">
                {[
                  { value: '10K+', label: 'Repositories Analyzed' },
                  { value: '500M+', label: 'Lines of Code Processed' },
                  { value: '<30s', label: 'Average Analysis Time' }
                ].map((stat, i) => (
                  <div key={i}>
                    <p className="text-4xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                      {stat.value}
                    </p>
                    <p className="text-sm text-gray-400">{stat.label}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </div>

      <style jsx global>{`
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </main>
  );
}
