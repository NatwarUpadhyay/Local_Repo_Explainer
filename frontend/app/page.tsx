'use client';

import { useState, useEffect } from 'react';
import ModelSelector from '@/components/ModelSelector';
import ResultsView from '@/components/ResultsView';
import ChatInterface from '@/components/ChatInterface';

type InputMode = 'url' | 'upload';

export default function Home() {
  const [inputMode, setInputMode] = useState<InputMode>('url');
  const [repoUrl, setRepoUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const [jobData, setJobData] = useState<any>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [normalizedMouse, setNormalizedMouse] = useState({ x: 0.5, y: 0.5 });
  const [selectedModelId, setSelectedModelId] = useState('');
  const [selectedModelPath, setSelectedModelPath] = useState('');
  const [customModelFile, setCustomModelFile] = useState<File | null>(null);
  const [hasModelUploaded, setHasModelUploaded] = useState(false);
  const [expandedFeature, setExpandedFeature] = useState<number | null>(null);
  const [showChat, setShowChat] = useState(false);
  
  // Advanced LLM parameters
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(800);
  const [topP, setTopP] = useState(0.9);
  
  // Rotating tips for analysis progress
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const analysisTips = [
    "🛠️ Analysis time depends on your system specifications and repository size",
    "🔍 Drilling down each component to understand dependencies",
    "🧠 LLM is examining code structure, patterns, and relationships",
    "📊 Building comprehensive dependency graph with multi-level details",
    "🔎 Analyzing imports, function calls, and class hierarchies",
    "⚡ Processing speed varies based on available CPU and RAM",
    "🎯 Extracting insights from each file for detailed visualization",
    "🔒 Your code stays private — all processing happens locally"
  ];

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
      // Normalize mouse position to -1 to 1 range for smoother effects
      setNormalizedMouse({
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: (e.clientY / window.innerHeight) * 2 - 1
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);
  
  // Rotate tips during analysis
  useEffect(() => {
    if (jobId && status !== 'COMPLETED' && status !== 'FAILED') {
      const interval = setInterval(() => {
        setCurrentTipIndex((prev) => (prev + 1) % analysisTips.length);
      }, 4000); // Change tip every 4 seconds
      return () => clearInterval(interval);
    }
  }, [jobId, status, analysisTips.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setStatus('');
    setProgress(0);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      if (inputMode === 'url') {
        const response = await fetch(`${apiUrl}/api/v1/jobs/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            repo_url: repoUrl, 
            source_type: 'git',
            model_id: selectedModelId,
            model_path: selectedModelPath
          }),
        });

        if (!response.ok) throw new Error('Failed to create analysis job');
        const data = await response.json();
        setJobId(data.id);
        setStatus(data.status);
        pollJobStatus(data.id);
      } else {
        // File upload: create FormData and upload
        if (!file) throw new Error('No file selected');
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('model_id', selectedModelId);
        formData.append('model_path', selectedModelPath);
        
        const response = await fetch(`${apiUrl}/api/v1/jobs/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) throw new Error('Failed to upload and analyze file');
        const data = await response.json();
        setJobId(data.id);
        setStatus(data.status);
        pollJobStatus(data.id);
        setLoading(false);
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

        if (data.status === 'COMPLETED') {
          console.log('Job completed! Data:', data);
          setJobData(data);
          // Update model path from job results
          if (data.result?.model_path) {
            setSelectedModelPath(data.result.model_path);
          }
          clearInterval(interval);
          setLoading(false);
        } else if (data.status === 'FAILED') {
          setError(data.result?.error || 'Analysis failed');
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith('.zip') || droppedFile.name.endsWith('.tar.gz'))) {
      setFile(droppedFile);
      setError('');
    } else {
      setError('Please drop a .zip or .tar.gz file');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
    }
  };

  const handleModelSelect = (modelId: string, modelPath: string, customFile?: File) => {
    setSelectedModelId(modelId);
    setSelectedModelPath(modelPath);
    if (customFile) {
      setCustomModelFile(customFile);
    }
    setHasModelUploaded(true);
  };

  return (
    <main style={{
      minHeight: '100vh',
      background: '#000000',
      color: 'white',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* ULTRA-DYNAMIC Animated Background - World-class parallax & mouse reactivity */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
        {/* Primary Purple Orb - Strong parallax with scale */}
        <div style={{
          position: 'absolute',
          top: '15%',
          left: '10%',
          width: '900px',
          height: '900px',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.55) 0%, rgba(139, 92, 246, 0.25) 40%, rgba(139, 92, 246, 0) 70%)',
          filter: 'blur(100px)',
          transform: `translate(${normalizedMouse.x * 90}px, ${normalizedMouse.y * 90}px) scale(${1 + normalizedMouse.x * 0.1})`,
          transition: 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          animation: 'float 10s ease-in-out infinite',
          willChange: 'transform'
        }} />
        
        {/* Secondary Blue Orb - Counter-movement with rotation */}
        <div style={{
          position: 'absolute',
          top: '40%',
          right: '10%',
          width: '850px',
          height: '850px',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.5) 0%, rgba(59, 130, 246, 0.22) 40%, rgba(59, 130, 246, 0) 70%)',
          filter: 'blur(110px)',
          transform: `translate(${normalizedMouse.x * -110}px, ${normalizedMouse.y * -100}px) rotate(${normalizedMouse.x * 18}deg) scale(${1 - normalizedMouse.y * 0.08})`,
          transition: 'transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          animation: 'float 14s ease-in-out infinite',
          animationDelay: '1s',
          willChange: 'transform'
        }} />
        
        {/* Tertiary Pink Orb - Extreme diagonal movement */}
        <div style={{
          position: 'absolute',
          bottom: '18%',
          left: '42%',
          width: '800px',
          height: '800px',
          background: 'radial-gradient(circle, rgba(236, 72, 153, 0.48) 0%, rgba(236, 72, 153, 0.2) 40%, rgba(236, 72, 153, 0) 70%)',
          filter: 'blur(105px)',
          transform: `translate(${normalizedMouse.x * 130}px, ${normalizedMouse.y * -120}px) scale(${1 + normalizedMouse.y * 0.12})`,
          transition: 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          animation: 'float 12s ease-in-out infinite',
          animationDelay: '2s',
          willChange: 'transform'
        }} />
        
        {/* Accent Cyan Orb - Reactive depth layer */}
        <div style={{
          position: 'absolute',
          top: '12%',
          right: '28%',
          width: '650px',
          height: '650px',
          background: 'radial-gradient(circle, rgba(6, 182, 212, 0.42) 0%, rgba(6, 182, 212, 0.15) 40%, rgba(6, 182, 212, 0) 70%)',
          filter: 'blur(92px)',
          transform: `translate(${normalizedMouse.x * -70}px, ${normalizedMouse.y * 80}px) scale(${1 + normalizedMouse.x * 0.06})`,
          transition: 'transform 0.18s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          animation: 'float 15s ease-in-out infinite',
          animationDelay: '3s',
          willChange: 'transform'
        }} />
        
        {/* Accent Orange/Red Orb - Rotational parallax */}
        <div style={{
          position: 'absolute',
          bottom: '16%',
          right: '18%',
          width: '700px',
          height: '700px',
          background: 'radial-gradient(circle, rgba(249, 115, 22, 0.38) 0%, rgba(239, 68, 68, 0.18) 40%, rgba(239, 68, 68, 0) 70%)',
          filter: 'blur(98px)',
          transform: `translate(${normalizedMouse.x * -85}px, ${normalizedMouse.y * 70}px) rotate(${normalizedMouse.y * -15}deg)`,
          transition: 'transform 0.22s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          animation: 'float 11s ease-in-out infinite',
          animationDelay: '4s',
          willChange: 'transform'
        }} />
        
        {/* Extra Emerald Orb - Center depth */}
        <div style={{
          position: 'absolute',
          top: '48%',
          left: '28%',
          width: '720px',
          height: '720px',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.35) 0%, rgba(16, 185, 129, 0.14) 40%, rgba(16, 185, 129, 0) 70%)',
          filter: 'blur(108px)',
          transform: `translate(${normalizedMouse.x * 100}px, ${normalizedMouse.y * -95}px) scale(${1 - normalizedMouse.x * 0.08})`,
          transition: 'transform 0.28s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          animation: 'float 13s ease-in-out infinite',
          animationDelay: '2.5s',
          willChange: 'transform'
        }} />
        
        {/* Interactive spotlight following cursor - creates dramatic lighting */}
        <div style={{
          position: 'absolute',
          left: mousePosition.x - 400,
          top: mousePosition.y - 400,
          width: '800px',
          height: '800px',
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.05) 50%, transparent 70%)',
          filter: 'blur(90px)',
          transition: 'left 0.08s ease-out, top 0.08s ease-out',
          mixBlendMode: 'overlay',
          willChange: 'left, top'
        }} />
        
        {/* Reactive Grid Pattern - Strong parallax movement */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)',
          backgroundSize: '75px 75px',
          backgroundPosition: `${normalizedMouse.x * 35}px ${normalizedMouse.y * 35}px`,
          maskImage: 'radial-gradient(ellipse 85% 65% at 50% 0%, black 25%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 85% 65% at 50% 0%, black 25%, transparent 100%)',
          transition: 'background-position 0.22s ease-out',
          willChange: 'background-position'
        }} />
        
        {/* Animated scan lines - cyberpunk aesthetic */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.018) 2px, rgba(255,255,255,0.018) 4px)',
          animation: 'scan 8s linear infinite',
          mixBlendMode: 'overlay'
        }} />
        
        {/* Enhanced noise texture - film grain effect */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 400 400\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.95\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\' opacity=\'0.06\'/%3E%3C/svg%3E")',
          opacity: 0.55,
          mixBlendMode: 'soft-light'
        }} />
        
        {/* Dynamic vignette that follows cursor - creates focal depth */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle 800px at ${mousePosition.x}px ${mousePosition.y}px, transparent 0%, rgba(0,0,0,0.28) 55%, rgba(0,0,0,0.55) 100%)`,
          pointerEvents: 'none',
          transition: 'background 0.15s ease-out'
        }} />
      </div>

      <div style={{ 
        maxWidth: '1100px', 
        margin: '0 auto', 
        position: 'relative', 
        zIndex: 10,
        padding: '0 20px'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '80px', paddingTop: '40px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '40px',
            padding: '10px 20px',
            borderRadius: '9999px',
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(236, 72, 153, 0.15))',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 8px 32px rgba(139, 92, 246, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
              boxShadow: '0 0 10px rgba(139, 92, 246, 0.8), 0 0 20px rgba(236, 72, 153, 0.6)',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }} />
            <span style={{ 
              fontSize: '0.875rem', 
              fontWeight: 600,
              background: 'linear-gradient(135deg, #c4b5fd, #f0abfc)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '0.5px'
            }}>
              Now in Beta • Join 10,000+ developers
            </span>
          </div>

          <h1 style={{
            fontSize: 'clamp(2.5rem, 7vw, 6rem)',
            fontWeight: '900',
            background: 'linear-gradient(135deg, #ffffff 0%, #e0e7ff 30%, #f0abfc 60%, #3b82f6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '24px',
            lineHeight: 1.1,
            letterSpacing: '-0.03em',
            textShadow: '0 0 80px rgba(139, 92, 246, 0.5)'
          }}>
            Understand Code<br />Locally
          </h1>
          
          <p style={{ 
            fontSize: '1.25rem', 
            color: 'rgba(255, 255, 255, 0.7)', 
            marginBottom: '20px', 
            maxWidth: '650px', 
            margin: '0 auto 20px',
            fontWeight: 400,
            lineHeight: 1.6,
            letterSpacing: '0.01em'
          }}>
            Agentic AI pipeline with Chain-of-Thought reasoning—autonomous agents analyze architecture, dependencies, and patterns with transparent logic.
          </p>
          <p style={{ 
            fontSize: '1rem', 
            fontWeight: 600,
            background: 'linear-gradient(135deg, #a78bfa, #f0abfc)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}>
            <span style={{ filter: 'drop-shadow(0 0 8px rgba(139, 92, 246, 0.6))' }}>🔒</span>
            Your code never leaves your machine. Zero trust. Maximum privacy.
          </p>
        </div>

        {/* Input Form */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.04)',
          backdropFilter: 'blur(30px)',
          borderRadius: '28px',
          padding: '48px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          marginBottom: '40px',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
        }}>
          {/* Tab Selector */}
          <div style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '32px',
            background: 'rgba(0, 0, 0, 0.3)',
            padding: '8px',
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.05)'
          }}>
            <button
              type="button"
              onClick={() => setInputMode('url')}
              style={{
                flex: 1,
                padding: '16px 24px',
                borderRadius: '16px',
                border: 'none',
                fontWeight: 'bold',
                fontSize: '1.125rem',
                cursor: 'pointer',
                transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                background: inputMode === 'url' 
                  ? 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)' 
                  : 'transparent',
                color: inputMode === 'url' ? 'white' : 'rgba(255, 255, 255, 0.5)',
                boxShadow: inputMode === 'url' 
                  ? '0 10px 40px rgba(139, 92, 246, 0.4), 0 0 80px rgba(236, 72, 153, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)' 
                  : 'none',
                transform: inputMode === 'url' ? 'scale(1.02)' : 'scale(1)',
                position: 'relative'
              }}
              onMouseOver={(e) => {
                if (inputMode !== 'url') {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
                }
              }}
              onMouseOut={(e) => {
                if (inputMode !== 'url') {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)';
                }
              }}
            >
              🔗 GitHub URL
            </button>
            <button
              type="button"
              onClick={() => setInputMode('upload')}
              style={{
                flex: 1,
                padding: '16px 24px',
                borderRadius: '16px',
                border: 'none',
                fontWeight: 'bold',
                fontSize: '1.125rem',
                cursor: 'pointer',
                transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                background: inputMode === 'upload' 
                  ? 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)' 
                  : 'transparent',
                color: inputMode === 'upload' ? 'white' : 'rgba(255, 255, 255, 0.5)',
                boxShadow: inputMode === 'upload' 
                  ? '0 10px 40px rgba(59, 130, 246, 0.4), 0 0 80px rgba(6, 182, 212, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)' 
                  : 'none',
                transform: inputMode === 'upload' ? 'scale(1.02)' : 'scale(1)',
                position: 'relative'
              }}
              onMouseOver={(e) => {
                if (inputMode !== 'upload') {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
                }
              }}
              onMouseOut={(e) => {
                if (inputMode !== 'upload') {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)';
                }
              }}
            >
              📁 Upload File
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {inputMode === 'url' ? (
              <div>
                <label style={{ display: 'block', fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '12px' }}>
                  Repository URL
                </label>
                <input
                  type="url"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/username/repository"
                  required
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '18px 24px',
                    fontSize: '1rem',
                    borderRadius: '16px',
                    border: '2px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    marginBottom: '12px',
                    outline: 'none',
                    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#8b5cf6';
                    e.target.style.boxShadow = '0 0 0 4px rgba(139, 92, 246, 0.1), 0 0 20px rgba(139, 92, 246, 0.3)';
                    e.target.style.background = 'rgba(139, 92, 246, 0.05)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                    e.target.style.boxShadow = 'none';
                    e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                  }}
                />
                <p style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
                  💡 Supports public GitHub, GitLab, and Bitbucket repositories
                </p>
              </div>
            ) : (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{
                  border: `4px dashed ${isDragging ? '#3b82f6' : 'rgba(255, 255, 255, 0.2)'}`,
                  borderRadius: '28px',
                  padding: '60px 40px',
                  textAlign: 'center',
                  transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                  background: isDragging ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                  cursor: 'pointer',
                  transform: isDragging ? 'scale(1.02)' : 'scale(1)',
                  boxShadow: isDragging ? '0 0 60px rgba(59, 130, 246, 0.4), inset 0 0 60px rgba(59, 130, 246, 0.1)' : 'none'
                }}
              >
                <input
                  type="file"
                  id="fileUpload"
                  accept=".zip,.tar.gz"
                  onChange={handleFileChange}
                  disabled={loading}
                  style={{ display: 'none' }}
                />
                <label htmlFor="fileUpload" style={{ cursor: 'pointer', display: 'block' }}>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    margin: '0 auto 24px',
                    background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
                    borderRadius: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2.5rem',
                    boxShadow: '0 20px 60px rgba(59, 130, 246, 0.5), 0 0 80px rgba(6, 182, 212, 0.3)',
                    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'scale(1.1) rotate(5deg)';
                    e.currentTarget.style.boxShadow = '0 30px 80px rgba(59, 130, 246, 0.6), 0 0 100px rgba(6, 182, 212, 0.4)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
                    e.currentTarget.style.boxShadow = '0 20px 60px rgba(59, 130, 246, 0.5), 0 0 80px rgba(6, 182, 212, 0.3)';
                  }}>
                    📦
                  </div>
                  {file ? (
                    <div>
                      <p style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '8px' }}>{file.name}</p>
                      <p style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <p style={{ fontSize: '0.875rem', color: '#10b981', marginTop: '12px' }}>
                        ✓ Ready to analyze
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '8px' }}>
                        {isDragging ? 'Drop it here!' : 'Drop your file here'}
                      </p>
                      <p style={{ fontSize: '1rem', color: '#9ca3af', marginBottom: '8px' }}>
                        or click to browse
                      </p>
                      <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        Upload your <strong>entire codebase</strong> as .zip or .tar.gz • Max 5GB
                      </p>
                    </div>
                  )}
                </label>
              </div>
            )}

            {/* Model Selection */}
            <div style={{ marginTop: '24px' }}>
              <ModelSelector 
                onModelSelect={handleModelSelect}
                selectedModel={selectedModelId}
                customModelFile={customModelFile}
              />
            </div>

            {/* Advanced LLM Options */}
            <div style={{ marginTop: '24px' }}>
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '12px 20px',
                  color: '#a78bfa',
                  fontSize: '0.9375rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  justifyContent: 'space-between'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(139, 92, 246, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                }}
              >
                <span>⚙️ Advanced LLM Options</span>
                <span style={{ transform: showAdvanced ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.3s' }}>▼</span>
              </button>

              {showAdvanced && (
                <div style={{
                  marginTop: '16px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  borderRadius: '16px',
                  padding: '24px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  {/* Temperature */}
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9375rem', fontWeight: '600' }}>
                      <span>Temperature: {temperature.toFixed(2)}</span>
                      <span style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>Controls randomness</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={temperature}
                      onChange={(e) => setTemperature(parseFloat(e.target.value))}
                      style={{ width: '100%', accentColor: '#8b5cf6' }}
                    />
                    <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '6px' }}>
                      Lower (0.0-0.3): More focused, deterministic analysis. Higher (0.7-1.0): More creative, varied explanations.
                    </p>
                  </div>

                  {/* Max Tokens */}
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9375rem', fontWeight: '600' }}>
                      <span>Max Tokens: {maxTokens}</span>
                      <span style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>Output length limit</span>
                    </label>
                    <input
                      type="range"
                      min="200"
                      max="2000"
                      step="100"
                      value={maxTokens}
                      onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                      style={{ width: '100%', accentColor: '#8b5cf6' }}
                    />
                    <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '6px' }}>
                      Lower (200-500): Concise summaries. Higher (800-2000): Detailed, comprehensive analysis with more context.
                    </p>
                  </div>

                  {/* Top P */}
                  <div>
                    <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9375rem', fontWeight: '600' }}>
                      <span>Top P: {topP.toFixed(2)}</span>
                      <span style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>Nucleus sampling</span>
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.05"
                      value={topP}
                      onChange={(e) => setTopP(parseFloat(e.target.value))}
                      style={{ width: '100%', accentColor: '#8b5cf6' }}
                    />
                    <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '6px' }}>
                      Lower (0.1-0.5): More focused vocabulary. Higher (0.9-1.0): Broader word selection, more diverse analysis.
                    </p>
                  </div>

                  <div style={{
                    marginTop: '20px',
                    padding: '16px',
                    background: 'rgba(139, 92, 246, 0.1)',
                    borderRadius: '12px',
                    border: '1px solid rgba(139, 92, 246, 0.2)'
                  }}>
                    <p style={{ fontSize: '0.8125rem', color: '#c4b5fd', marginBottom: '8px', fontWeight: '600' }}>
                      💡 Recommended Settings
                    </p>
                    <p style={{ fontSize: '0.75rem', color: '#a78bfa' }}>
                      • <strong>Code Analysis:</strong> Temp 0.3, Tokens 800, Top-P 0.9<br />
                      • <strong>Quick Summary:</strong> Temp 0.5, Tokens 400, Top-P 0.9<br />
                      • <strong>Detailed Report:</strong> Temp 0.7, Tokens 1500, Top-P 0.95
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Upload Downloaded or Custom Model - Horizontal Box */}
            <div style={{ marginTop: '24px' }}>
              <div style={{
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(236, 72, 153, 0.1) 100%)',
                backdropFilter: 'blur(20px)',
                borderRadius: '20px',
                padding: '24px 32px',
                border: '2px solid rgba(139, 92, 246, 0.3)',
                boxShadow: '0 10px 40px rgba(139, 92, 246, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: '24px',
                justifyContent: 'space-between'
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '2rem' }}>📦</span>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>
                      Upload Your Downloaded or Custom Model
                    </h3>
                  </div>
                  <p style={{ fontSize: '0.875rem', color: '#c4b5fd', margin: 0 }}>
                    After downloading a model above, upload the GGUF file here to start analysis
                  </p>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  {customModelFile ? (
                    <div style={{
                      padding: '12px 20px',
                      background: 'rgba(16, 185, 129, 0.2)',
                      borderRadius: '12px',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <span style={{ fontSize: '1.5rem' }}>✓</span>
                      <div>
                        <div style={{ fontSize: '0.9375rem', fontWeight: '600', color: '#6ee7b7' }}>
                          {customModelFile.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#86efac' }}>
                          {(customModelFile.size / 1024 / 1024).toFixed(2)} MB
                        </div>
                      </div>
                    </div>
                  ) : (
                    !hasModelUploaded && (
                      <div style={{
                        padding: '12px 20px',
                        background: 'rgba(239, 68, 68, 0.15)',
                        borderRadius: '12px',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <span style={{ fontSize: '1.25rem' }}>⚠️</span>
                        <span style={{ fontSize: '0.875rem', color: '#fca5a5', fontWeight: '500' }}>
                          No model uploaded yet
                        </span>
                      </div>
                    )
                  )}
                  
                  <input
                    type="file"
                    id="customModelUpload"
                    accept=".gguf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file && file.name.endsWith('.gguf')) {
                        setCustomModelFile(file);
                        setSelectedModelId('custom');
                        setSelectedModelPath(file.name);
                        setHasModelUploaded(true);
                      } else {
                        alert('Please select a valid GGUF model file');
                      }
                    }}
                    style={{ display: 'none' }}
                  />
                  <label
                    htmlFor="customModelUpload"
                    style={{
                      padding: '14px 28px',
                      background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                      borderRadius: '12px',
                      border: 'none',
                      color: 'white',
                      fontSize: '1rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                      boxShadow: '0 10px 30px rgba(139, 92, 246, 0.4)',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'scale(1.05)';
                      e.currentTarget.style.boxShadow = '0 15px 40px rgba(139, 92, 246, 0.6)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = '0 10px 30px rgba(139, 92, 246, 0.4)';
                    }}
                  >
                    📂 {customModelFile ? 'Change Model' : 'Upload Model File'}
                  </label>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !hasModelUploaded || (inputMode === 'url' && !repoUrl) || (inputMode === 'upload' && !file)}
              style={{
                width: '100%',
                padding: '22px',
                marginTop: '32px',
                fontSize: '1.25rem',
                fontWeight: 'bold',
                borderRadius: '18px',
                border: 'none',
                background: loading || !hasModelUploaded || (inputMode === 'url' && !repoUrl) || (inputMode === 'upload' && !file)
                  ? 'rgba(75, 85, 99, 0.5)' 
                  : 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 50%, #3b82f6 100%)',
                color: 'white',
                cursor: loading || !hasModelUploaded || (inputMode === 'url' && !repoUrl) || (inputMode === 'upload' && !file) ? 'not-allowed' : 'pointer',
                transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: loading || !hasModelUploaded || (inputMode === 'url' && !repoUrl) || (inputMode === 'upload' && !file) 
                  ? 'none' 
                  : '0 20px 60px rgba(139, 92, 246, 0.5), 0 0 80px rgba(236, 72, 153, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseOver={(e) => {
                if (!loading && hasModelUploaded && ((inputMode === 'url' && repoUrl) || (inputMode === 'upload' && file))) {
                  e.currentTarget.style.transform = 'scale(1.02) translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 30px 80px rgba(139, 92, 246, 0.6), 0 0 100px rgba(236, 72, 153, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)';
                }
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'scale(1) translateY(0)';
                if (!loading && hasModelUploaded && ((inputMode === 'url' && repoUrl) || (inputMode === 'upload' && file))) {
                  e.currentTarget.style.boxShadow = '0 20px 60px rgba(139, 92, 246, 0.5), 0 0 80px rgba(236, 72, 153, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
                }
              }}
            >
              {loading ? (
                <span>⏳ Analyzing your code...</span>
              ) : (
                <span>✨ Analyze Repository →</span>
              )}
            </button>
          </form>

          {error && (
            <div style={{
              marginTop: '24px',
              padding: '20px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '2px solid rgba(239, 68, 68, 0.5)',
              borderRadius: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                <div>
                  <p style={{ fontWeight: 'bold', color: '#fca5a5', marginBottom: '4px' }}>Analysis Failed</p>
                  <p style={{ color: '#fecaca' }}>{error}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Progress Display */}
        {jobId && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.04)',
            backdropFilter: 'blur(30px)',
            borderRadius: '28px',
            padding: '48px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            marginBottom: '40px',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
          }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '2.5rem' }}>📊</span>
              Analysis in Progress
            </h2>
            
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                  <span style={{ fontSize: '0.875rem', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
                    Current Stage
                  </span>
                  <p style={{ 
                    fontSize: '1.5rem', 
                    fontWeight: 'bold',
                    color: status === 'COMPLETED' ? '#10b981' : 
                           status === 'FAILED' ? '#ef4444' : 
                           status === 'PARSING' ? '#3b82f6' : 
                           status === 'BUILDING_GRAPH' ? '#8b5cf6' : '#ec4899'
                  }}>
                    {status.replace(/_/g, ' ')}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.875rem', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
                    Progress
                  </span>
                  <p style={{ 
                    fontSize: '2.5rem', 
                    fontWeight: 'bold',
                    background: 'linear-gradient(to right, #a78bfa, #ec4899)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}>
                    {progress}%
                  </p>
                </div>
              </div>
              
              <div style={{
                width: '100%',
                height: '16px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '9999px',
                overflow: 'hidden',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                position: 'relative'
              }}>
                <div style={{
                  width: `${progress}%`,
                  height: '100%',
                  background: 'linear-gradient(to right, #8b5cf6, #ec4899, #3b82f6)',
                  borderRadius: '9999px',
                  transition: 'width 0.5s ease-out',
                  boxShadow: '0 0 20px rgba(139, 92, 246, 0.5)'
                }} />
              </div>
            </div>

            {/* Detailed Status Cue Cards */}
            {status !== 'COMPLETED' && status !== 'FAILED' && (
              <div style={{ marginTop: '32px', marginBottom: '24px' }}>
                {/* Current Activity Card */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(59, 130, 246, 0.2))',
                  border: '2px solid rgba(139, 92, 246, 0.4)',
                  borderRadius: '20px',
                  padding: '28px',
                  marginBottom: '20px',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.15), transparent 70%)',
                    animation: 'pulse 2s ease-in-out infinite'
                  }} />
                  
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                      <div style={{
                        fontSize: '3rem',
                        animation: 'bounce 1s ease-in-out infinite'
                      }}>
                        {status === 'PENDING' ? '🔄' : status === 'PARSING' ? '📖' : status === 'ANALYZING' ? '🧠' : '⚙️'}
                      </div>
                      <div>
                        <h3 style={{ 
                          fontSize: '1.5rem', 
                          fontWeight: 'bold', 
                          marginBottom: '12px',
                          background: 'linear-gradient(135deg, #ffffff, #c4b5fd)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text'
                        }}>
                          {status === 'PENDING' && 'Initializing Analysis Engine'}
                          {status === 'PARSING' && 'Parsing Repository Structure'}
                          {status === 'ANALYZING' && 'Deep Code Analysis in Progress'}
                          {status === 'BUILDING_GRAPH' && 'Building Multi-Level Dependency Graph'}
                          {!['PENDING', 'PARSING', 'ANALYZING', 'BUILDING_GRAPH'].includes(status) && 'Processing Your Repository...'}
                        </h3>
                        <p style={{ 
                          fontSize: '1.0625rem', 
                          color: '#e0d4ff',
                          marginBottom: '12px',
                          fontWeight: '500',
                          lineHeight: '1.6'
                        }}>
                          {analysisTips[currentTipIndex]}
                        </p>
                        <p style={{ 
                          fontSize: '0.875rem', 
                          color: 'rgba(255, 255, 255, 0.6)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          {status === 'PENDING' && '⏱️ Estimated: 10-30 seconds • Setting up environment'}
                          {status === 'PARSING' && '⏱️ Estimated: 30-90 seconds • Depends on repository size'}
                          {status === 'ANALYZING' && '⏱️ Estimated: 2-5 minutes • LLM processing each file with AI'}
                          {status === 'BUILDING_GRAPH' && '⏱️ Estimated: 20-60 seconds • Creating interactive visualization'}
                        </p>
                      </div>
                    </div>
                    
                    {/* Animated progress dots */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      marginTop: '16px'
                    }}>
                      {analysisTips.map((_, index) => (
                        <div
                          key={index}
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: index === currentTipIndex ? '#a78bfa' : 'rgba(255, 255, 255, 0.2)',
                            transition: 'all 0.3s ease'
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Processing Stages Breakdown */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '16px'
                }}>
                  {/* Stage 1: Initialization */}
                  <div style={{
                    background: status === 'PENDING' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                    border: `2px solid ${status === 'PENDING' ? 'rgba(59, 130, 246, 0.5)' : 'rgba(255, 255, 255, 0.1)'}`,
                    borderRadius: '16px',
                    padding: '20px',
                    transition: 'all 0.3s'
                  }}>
                    <div style={{ fontSize: '2rem', marginBottom: '12px' }}>
                      {status === 'PENDING' ? '🔄' : '✓'}
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#fff', marginBottom: '8px' }}>
                      1. Initialize
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                      {status === 'PENDING' ? 'Setting up environment...' : 'Complete'}
                    </div>
                  </div>

                  {/* Stage 2: Parsing */}
                  <div style={{
                    background: status === 'PARSING' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                    border: `2px solid ${status === 'PARSING' ? 'rgba(139, 92, 246, 0.5)' : 'rgba(255, 255, 255, 0.1)'}`,
                    borderRadius: '16px',
                    padding: '20px',
                    transition: 'all 0.3s'
                  }}>
                    <div style={{ fontSize: '2rem', marginBottom: '12px' }}>
                      {status === 'PARSING' ? '📖' : status === 'PENDING' ? '⏸️' : '✓'}
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#fff', marginBottom: '8px' }}>
                      2. Parse Files
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                      {status === 'PARSING' ? 'Reading codebase...' : status === 'PENDING' ? 'Waiting...' : 'Complete'}
                    </div>
                  </div>

                  {/* Stage 3: Analysis */}
                  <div style={{
                    background: status === 'ANALYZING' ? 'rgba(236, 72, 153, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                    border: `2px solid ${status === 'ANALYZING' ? 'rgba(236, 72, 153, 0.5)' : 'rgba(255, 255, 255, 0.1)'}`,
                    borderRadius: '16px',
                    padding: '20px',
                    transition: 'all 0.3s'
                  }}>
                    <div style={{ fontSize: '2rem', marginBottom: '12px' }}>
                      {status === 'ANALYZING' ? '🧠' : ['PENDING', 'PARSING'].includes(status) ? '⏸️' : '✓'}
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#fff', marginBottom: '8px' }}>
                      3. LLM Analysis
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                      {status === 'ANALYZING' ? 'AI processing code...' : ['PENDING', 'PARSING'].includes(status) ? 'Waiting...' : 'Complete'}
                    </div>
                  </div>

                  {/* Stage 4: Graph Building */}
                  <div style={{
                    background: status === 'BUILDING_GRAPH' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                    border: `2px solid ${status === 'BUILDING_GRAPH' ? 'rgba(16, 185, 129, 0.5)' : 'rgba(255, 255, 255, 0.1)'}`,
                    borderRadius: '16px',
                    padding: '20px',
                    transition: 'all 0.3s'
                  }}>
                    <div style={{ fontSize: '2rem', marginBottom: '12px' }}>
                      {status === 'BUILDING_GRAPH' ? '⚙️' : ['PENDING', 'PARSING', 'ANALYZING'].includes(status) ? '⏸️' : '✓'}
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#fff', marginBottom: '8px' }}>
                      4. Build Graph
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                      {status === 'BUILDING_GRAPH' ? 'Creating visualization...' : ['PENDING', 'PARSING', 'ANALYZING'].includes(status) ? 'Waiting...' : 'Complete'}
                    </div>
                  </div>
                </div>

                {/* System Activity Indicator */}
                <div style={{
                  marginTop: '20px',
                  padding: '16px 24px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: '#10b981',
                    animation: 'pulse 1.5s ease-in-out infinite',
                    boxShadow: '0 0 20px rgba(16, 185, 129, 0.8)'
                  }} />
                  <span style={{ fontSize: '0.9375rem', color: '#6ee7b7', fontWeight: '600' }}>
                    ✓ System is actively processing your repository
                  </span>
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.05)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '4px' }}>Job ID</p>
                <code style={{ fontSize: '0.875rem', color: '#a78bfa', fontFamily: 'monospace', fontWeight: 'bold' }}>{jobId}</code>
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.05)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '4px' }}>Estimated Time</p>
                <p style={{ fontSize: '1.125rem', fontWeight: 'bold' }}>~{Math.max(1, Math.ceil((100 - progress) / 20))} minutes</p>
              </div>
            </div>
          </div>
        )}

        {/* Results Display */}
        {jobData && (
          <div style={{ marginBottom: '40px' }}>
            <ResultsView jobData={jobData} />
            
            {/* Chat Interface Callout - shown after analysis completes */}
            {status === 'COMPLETED' && (
              <div style={{
                marginTop: '40px',
                marginBottom: '32px',
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(6, 182, 212, 0.2))',
                border: '2px solid rgba(16, 185, 129, 0.4)',
                borderRadius: '24px',
                padding: '32px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '3.5rem', marginBottom: '16px' }}>💬</div>
                <h3 style={{
                  fontSize: '1.75rem',
                  fontWeight: 'bold',
                  marginBottom: '12px',
                  background: 'linear-gradient(135deg, #6ee7b7, #06b6d4)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  🎉 Chat with Your Repository Now!
                </h3>
                <p style={{ 
                  fontSize: '1.125rem', 
                  color: 'rgba(255, 255, 255, 0.8)',
                  marginBottom: '16px',
                  lineHeight: '1.6'
                }}>
                  Analysis complete! Ask questions about your codebase, get insights on dependencies,
                  understand architecture patterns, or explore any aspect of your repository.
                </p>
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '24px',
                  marginTop: '20px',
                  flexWrap: 'wrap',
                  fontSize: '0.875rem'
                }}>
                  {[
                    { icon: '🔍', text: 'Ask about dependencies' },
                    { icon: '📊', text: 'Explore architecture' },
                    { icon: '💡', text: 'Get code insights' },
                    { icon: '⚡', text: 'Instant AI responses' }
                  ].map((feature) => (
                    <div key={feature.text} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 16px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      color: '#fff',
                      fontWeight: '600'
                    }}>
                      <span style={{ fontSize: '1.25rem' }}>{feature.icon}</span>
                      <span>{feature.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Chat Interface - shown after analysis completes */}
            {status === 'COMPLETED' && (
              <ChatInterface 
                jobId={jobId!} 
                repoData={jobData}
                modelId={selectedModelId}
                modelPath={selectedModelPath}
              />
            )}
          </div>
        )}

        {/* Features Section */}
        {!jobId && (
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '24px',
              marginTop: '60px'
            }}>
              {[
                { 
                  icon: '🚀', 
                  title: 'Agentic AI Pipeline', 
                  desc: 'Multi-agent architecture with Chain-of-Thought reasoning—autonomous parsing, analysis, and generation in seconds', 
                  gradient: 'linear-gradient(135deg, #8b5cf6, #ec4899)' 
                },
                { 
                  icon: '🔒', 
                  title: '100% Private', 
                  desc: 'Your code never leaves your infrastructure. Self-hosted, secure, and fully local.', 
                  gradient: 'linear-gradient(135deg, #10b981, #06b6d4)' 
                },
                { 
                  icon: '🌐', 
                  title: 'AI-Driven Language Detection', 
                  desc: 'Autonomous agents intelligently parse 20+ languages with framework-aware analysis: Python, JavaScript, TypeScript, Java, C/C++, C#, Go, Rust, and more.', 
                  gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                  details: '🐍 Python (Django, Flask, FastAPI) • 💛 JavaScript (Node.js, React, Vue) • 📘 TypeScript (Angular, Next.js) • ☕ Java (Spring, Maven, Gradle) • ⚙️ C/C++ (CMake, Makefiles) • 🔷 C# (.NET Core, NuGet) • 🐹 Go (Go modules) • 🦀 Rust (Cargo) • 🐘 PHP (Composer, Laravel) • 💎 Ruby (Rails, Bundler) • 🍎 Swift (CocoaPods, SPM) • 🤖 Kotlin (Android, Gradle) + 8 more languages with AI-powered framework detection'
                },
                { 
                  icon: '📊', 
                  title: 'Multi-Level Graphs', 
                  desc: 'Interactive dependency visualization: Package → Module → Class → Function drill-down', 
                  gradient: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
                  details: 'Navigate your codebase visually with hierarchical drill-down: 📦 Package Level: See ecosystem dependencies • 📂 Module Level: Explore internal structure • 🏗️ Class Level: Understand relationships • ⚡ Function Level: Trace execution paths. Click any node to zoom in, revealing deeper layers of your architecture with smooth animations.'
                },
                { 
                  icon: '🔍', 
                  title: 'GraphQL API', 
                  desc: 'Flexible querying of dependency graphs with powerful filtering and traversal capabilities', 
                  gradient: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                  details: 'Query your codebase like a database: dependencies(filter: {type: "external"}) • traverse(from: "module", depth: 3) • search(pattern: ".*Service") • Custom filters, aliases, pagination, and nested queries. Build custom analysis tools on top of our GraphQL endpoint.'
                },
                { 
                  icon: '🛡️', 
                  title: 'Vulnerability Scanning', 
                  desc: 'Detect security issues, outdated dependencies, and potential code vulnerabilities', 
                  gradient: 'linear-gradient(135deg, #ef4444, #f59e0b)',
                  details: 'Stay secure with automated checks: CVE Database Lookup for known vulnerabilities • Dependency Age Analysis to find outdated packages • Security Score Calculation (0-100) • License Compliance Checking • Remediation Suggestions with upgrade paths. Integrates with NIST NVD and GitHub Advisory Database.'
                },
                { 
                  icon: '💬', 
                  title: 'Conversational AI Agent', 
                  desc: 'Chat with your repository using natural language. Autonomous agent provides instant insights with CoT reasoning', 
                  gradient: 'linear-gradient(135deg, #06b6d4, #10b981)',
                  details: 'Unlock agentic AI insights: "What does this module do?" • "Find all database queries" • "Explain this function" • "Show me security risks" • Uses local LLM agents (your choice of 9 models) with Chain-of-Thought reasoning to understand your code privately. Natural language queries turn into precise answers. Your conversations never leave your machine.'
                },
                { 
                  icon: '📥', 
                  title: 'Export Results', 
                  desc: 'Export analysis in JSON, SVG, PNG, PDF, or interactive HTML formats for sharing', 
                  gradient: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
                  details: 'Share insights in any format: 📄 JSON: Raw data for CI/CD pipelines • 🎨 SVG: Vector graphics for documentation • 🖼️ PNG: High-res images for presentations • 📑 PDF: Professional reports with charts • 🌐 HTML: Interactive dashboards for teams. Customize themes, layouts, and included metrics.'
                },
                { 
                  icon: '🔐', 
                  title: 'Enterprise Ready', 
                  desc: 'OAuth2/JWT auth, RBAC, audit logs, monitoring with Prometheus/Grafana integration', 
                  gradient: 'linear-gradient(135deg, #6366f1, #ec4899)',
                  details: 'Production-grade features: 🔑 OAuth2/SAML/JWT authentication • 👥 Role-Based Access Control (RBAC) • 📝 Comprehensive audit logging • 📊 Prometheus metrics + Grafana dashboards • 🐳 Docker/Kubernetes deployment • ⚖️ Horizontal scaling with load balancing • 🔄 High availability setup. Enterprise support available.'
                }
              ].map((feature, i) => (
                <div key={i} 
                onClick={() => {
                  if (feature.details) {
                    setExpandedFeature(expandedFeature === i ? null : i);
                  }
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  borderRadius: '28px',
                  padding: '40px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                  cursor: feature.details ? 'pointer' : 'default',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-12px)';
                  e.currentTarget.style.boxShadow = '0 30px 80px rgba(139, 92, 246, 0.3)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                }}>
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '4px',
                    background: feature.gradient,
                    opacity: 0.8
                  }} />
                  <div style={{ fontSize: '3.5rem', marginBottom: '20px', filter: 'drop-shadow(0 0 20px rgba(139, 92, 246, 0.3))' }}>{feature.icon}</div>
                  <h3 style={{ 
                    fontSize: '1.5rem', 
                    fontWeight: 'bold', 
                    marginBottom: '16px',
                    background: feature.gradient,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}>{feature.title}</h3>
                  <p style={{ color: 'rgba(255, 255, 255, 0.7)', lineHeight: 1.7, fontSize: '1rem' }}>{feature.desc}</p>
                  
                  {feature.details && expandedFeature === i && (
                    <div style={{
                      marginTop: '24px',
                      padding: '28px',
                      background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.2))',
                      borderRadius: '16px',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      animation: 'fadeIn 0.4s ease-out',
                      boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.3)'
                    }}>
                      {feature.details.split('•').filter(item => item.trim()).map((item, idx) => {
                        const cleanItem = item.trim();
                        // Skip if it's just formatting text
                        if (!cleanItem || cleanItem.length < 10) return null;
                        
                        return (
                          <div key={idx} style={{
                            display: 'flex',
                            gap: '12px',
                            marginBottom: idx < feature.details.split('•').length - 2 ? '16px' : '0',
                            paddingLeft: '8px'
                          }}>
                            <span style={{ 
                              color: '#a78bfa', 
                              fontSize: '1.2rem',
                              fontWeight: 'bold',
                              minWidth: '20px'
                            }}>
                              •
                            </span>
                            <p style={{ 
                              color: 'rgba(255, 255, 255, 0.9)', 
                              lineHeight: 1.7, 
                              fontSize: '0.9375rem',
                              margin: 0,
                              flex: 1
                            }}>
                              {cleanItem}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  {feature.details && (
                    <div style={{
                      marginTop: '16px',
                      fontSize: '0.8125rem',
                      color: 'rgba(255, 255, 255, 0.5)',
                      fontStyle: 'italic',
                      textAlign: 'center'
                    }}>
                      {expandedFeature === i ? '↑ Click to collapse' : '↓ Click to learn more'}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Feature Implementation Notice */}
            <div style={{
              marginTop: '60px',
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(251, 146, 60, 0.1))',
              border: '2px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '24px',
              padding: '32px 40px',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 20px 40px rgba(245, 158, 11, 0.15)'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '16px', textAlign: 'center' }}>📋</div>
              <h3 style={{ 
                fontSize: '1.375rem', 
                fontWeight: 'bold', 
                marginBottom: '16px', 
                textAlign: 'center',
                color: '#fbbf24'
              }}>
                Feature Implementation Status
              </h3>
              <div style={{ 
                fontSize: '0.9375rem', 
                lineHeight: 1.8, 
                color: 'rgba(255, 255, 255, 0.85)',
                textAlign: 'center',
                maxWidth: '800px',
                margin: '0 auto'
              }}>
                <p style={{ marginBottom: '16px' }}>
                  ✅ <strong>Currently Implemented:</strong> Agentic AI Pipeline with Multi-Agent Architecture • Chain-of-Thought (CoT) Reasoning • Autonomous Language Detection (20+) • AI-Powered Dependency Analysis • Tree & Graph Visualizations • Conversational AI Agent • Real-Time Orchestration • Local LLM Processing • 100% Private Operation
                </p>
                <p style={{ 
                  fontSize: '0.875rem', 
                  color: 'rgba(255, 255, 255, 0.7)',
                  paddingTop: '16px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  🔮 <strong>Advanced Features</strong> (GraphQL API, Vulnerability Scanning, Export Results, Enterprise Auth) are <strong>planned enhancements</strong>. 
                  <br />
                  Want to build these? Check out <code style={{ 
                    background: 'rgba(255, 255, 255, 0.1)', 
                    padding: '2px 8px', 
                    borderRadius: '6px',
                    fontSize: '0.8125rem'
                  }}>PROJECT_REFERENCE.md</code> in the repo for detailed implementation roadmaps!
                </p>
              </div>
            </div>
          </>
        )}

        {/* Analysis Progress Tracker - Always Visible */}
        <div style={{
            marginTop: '60px',
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1))',
            border: '2px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '28px',
            padding: '40px',
            textAlign: 'center',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 25px 50px rgba(59, 130, 246, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
          }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '32px' }}>
              🔐 Secure Analysis Pipeline
            </h3>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '48px', flexWrap: 'wrap', maxWidth: '900px', margin: '0 auto' }}>
              <div style={{ textAlign: 'center', maxWidth: '180px' }}>
                <div style={{ 
                  fontSize: '2.5rem', 
                  marginBottom: '12px',
                  opacity: hasModelUploaded ? 1 : 0.3,
                  transition: 'opacity 0.3s'
                }}>
                  {hasModelUploaded ? '✅' : '⏳'}
                </div>
                <div style={{ 
                  fontSize: '0.9375rem', 
                  color: hasModelUploaded ? '#10b981' : '#6b7280',
                  fontWeight: 600,
                  marginBottom: '8px'
                }}>
                  1. Model Selected
                </div>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                  {hasModelUploaded ? 'LLM ready for analysis' : 'Choose your AI model'}
                </div>
              </div>

              <div style={{ textAlign: 'center', maxWidth: '180px' }}>
                <div style={{ 
                  fontSize: '2.5rem', 
                  marginBottom: '12px',
                  opacity: (repoUrl || file) ? 1 : 0.3,
                  transition: 'opacity 0.3s'
                }}>
                  {(repoUrl || file) ? '✅' : '⏳'}
                </div>
                <div style={{ 
                  fontSize: '0.9375rem', 
                  color: (repoUrl || file) ? '#10b981' : '#6b7280',
                  fontWeight: 600,
                  marginBottom: '8px'
                }}>
                  2. Repository Provided
                </div>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                  {(repoUrl || file) ? 'Code loaded securely' : 'Upload or paste URL'}
                </div>
              </div>

              <div style={{ textAlign: 'center', maxWidth: '180px' }}>
                <div style={{ 
                  fontSize: '2.5rem', 
                  marginBottom: '12px',
                  opacity: status ? 1 : 0.3,
                  transition: 'opacity 0.3s'
                }}>
                  {status === 'COMPLETED' ? '✅' : status ? '🔄' : '⏳'}
                </div>
                <div style={{ 
                  fontSize: '0.9375rem', 
                  color: status === 'COMPLETED' ? '#10b981' : status ? '#3b82f6' : '#6b7280',
                  fontWeight: 600,
                  marginBottom: '8px'
                }}>
                  3. Analysis Status
                </div>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                  {status === 'COMPLETED' ? 'Insights generated' : status ? 'Processing privately...' : 'Ready to analyze'}
                </div>
              </div>

              <div style={{ textAlign: 'center', maxWidth: '180px' }}>
                <div style={{ 
                  fontSize: '2.5rem', 
                  marginBottom: '12px',
                  opacity: status === 'COMPLETED' ? 1 : 0.3,
                  transition: 'opacity 0.3s'
                }}>
                  {status === 'COMPLETED' ? '💬' : '🔒'}
                </div>
                <div style={{ 
                  fontSize: '0.9375rem', 
                  color: status === 'COMPLETED' ? '#10b981' : '#6b7280',
                  fontWeight: 600,
                  marginBottom: '8px'
                }}>
                  4. Chat Unlocked
                </div>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                  {status === 'COMPLETED' ? 'Ask anything about your code' : 'Complete analysis first'}
                </div>
              </div>
            </div>
            <p style={{ 
              marginTop: '32px', 
              color: 'rgba(255, 255, 255, 0.6)', 
              fontSize: '0.875rem',
              fontStyle: 'italic'
            }}>
            🔒 Your code never leaves your machine • Zero trust • Maximum privacy
          </p>
        </div>
      </div>      {/* Floating Chat Button */}
      <div 
        onClick={() => {
          if (status === 'COMPLETED') {
            setShowChat(!showChat);
          }
        }}
        style={{
          position: 'fixed',
          bottom: '32px',
          right: '32px',
          width: '70px',
          height: '70px',
          borderRadius: '50%',
          background: status === 'COMPLETED' 
            ? 'linear-gradient(135deg, #8b5cf6, #ec4899)' 
            : 'rgba(100, 100, 100, 0.5)',
          border: '2px solid rgba(255, 255, 255, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2rem',
          cursor: status === 'COMPLETED' ? 'pointer' : 'not-allowed',
          boxShadow: status === 'COMPLETED' 
            ? '0 8px 32px rgba(139, 92, 246, 0.4)' 
            : '0 4px 16px rgba(0, 0, 0, 0.3)',
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          zIndex: 1000,
          animation: status === 'COMPLETED' ? 'pulse 2s ease-in-out infinite' : 'none'
        }}
        onMouseOver={(e) => {
          if (status === 'COMPLETED') {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 12px 40px rgba(139, 92, 246, 0.6)';
          }
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = status === 'COMPLETED' 
            ? '0 8px 32px rgba(139, 92, 246, 0.4)' 
            : '0 4px 16px rgba(0, 0, 0, 0.3)';
        }}
      >
        {status === 'COMPLETED' ? '💬' : '🔒'}
        
        {status !== 'COMPLETED' && (
          <div style={{
            position: 'absolute',
            bottom: '85px',
            right: '0',
            background: 'rgba(0, 0, 0, 0.9)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            padding: '16px 20px',
            width: '280px',
            fontSize: '0.8125rem',
            color: 'rgba(255, 255, 255, 0.9)',
            lineHeight: 1.6,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            pointerEvents: 'none',
            textAlign: 'left',
            opacity: 0,
            animation: 'fadeIn 0.3s ease-out 0.5s forwards'
          }}>
            <div style={{ fontWeight: 600, marginBottom: '8px', color: '#fff' }}>
              🔒 Chat Locked
            </div>
            Complete your repository analysis to unlock private AI chat.
            <div style={{ 
              marginTop: '12px', 
              paddingTop: '12px', 
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              fontSize: '0.75rem',
              color: 'rgba(255, 255, 255, 0.6)',
              fontStyle: 'italic'
            }}>
              Your code never leaves your machine • Zero trust • Maximum privacy
            </div>
          </div>
        )}
      </div>

      {/* Chat Popup */}
      {showChat && status === 'COMPLETED' && (
        <div style={{
          position: 'fixed',
          bottom: '120px',
          right: '32px',
          width: '420px',
          maxHeight: '600px',
          background: 'rgba(20, 20, 30, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '24px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)',
          zIndex: 999,
          overflow: 'hidden',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <div style={{
            padding: '20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(236, 72, 153, 0.2))'
          }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.125rem' }}>💬 Chat with Your Repo</div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', marginTop: '4px' }}>
                Powered by Agentic AI • Chain-of-Thought Reasoning • 100% Private
              </div>
            </div>
            <button 
              onClick={() => setShowChat(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '1.5rem',
                cursor: 'pointer',
                padding: '4px 8px',
                transition: 'color 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.color = '#fff'}
              onMouseOut={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}
            >
              ✕
            </button>
          </div>
          <div style={{ height: '500px', overflowY: 'auto' }}>
            <ChatInterface 
              jobId={jobId!} 
              repoData={jobData} 
              modelId={selectedModelId}
              modelPath={selectedModelPath}
            />
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          33% { transform: translateY(-20px) translateX(10px); }
          66% { transform: translateY(10px) translateX(-10px); }
        }
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
        @keyframes scan {
          0% { transform: translateY(0); }
          100% { transform: translateY(100%); }
        }
        input::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }
        * {
          box-sizing: border-box;
        }
      `}} />
    </main>
  );
}
