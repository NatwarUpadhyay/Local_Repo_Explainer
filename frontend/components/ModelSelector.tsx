'use client';

import { useState, useEffect } from 'react';

interface Model {
  id: string;
  name: string;
  size: string;
  description: string;
  download_url: string;
  file_name: string;
}

interface ModelSelectorProps {
  onModelSelect?: (modelId: string, modelPath: string, customFile?: File) => void;
  selectedModel?: string;
  customModelFile?: File | null;
}

const AVAILABLE_MODELS: Model[] = [
  {
    id: 'qwen-2.5-coder-7b',
    name: 'Qwen 2.5 Coder 7B ⭐ BEST',
    size: '4.7 GB',
    description: '🏆 Top choice for code analysis. Excels at understanding complex codebases. 16GB+ RAM recommended.',
    download_url: 'https://huggingface.co/Qwen/Qwen2.5-Coder-7B-Instruct-GGUF/resolve/main/qwen2.5-coder-7b-instruct-q4_k_m.gguf',
    file_name: 'qwen2.5-coder-7b-instruct-q4_k_m.gguf'
  },
  {
    id: 'deepseek-coder-6.7b',
    name: 'DeepSeek Coder 6.7B',
    size: '3.9 GB',
    description: '🎯 Trained on 2T code tokens. Exceptional at code review & bug detection. 12GB+ RAM needed.',
    download_url: 'https://huggingface.co/TheBloke/deepseek-coder-6.7B-instruct-GGUF/resolve/main/deepseek-coder-6.7b-instruct.Q4_K_M.gguf',
    file_name: 'deepseek-coder-6.7b-instruct.Q4_K_M.gguf'
  },
  {
    id: 'codellama-7b',
    name: 'CodeLlama 7B Instruct',
    size: '3.8 GB',
    description: '💻 Meta\'s code-specialized model. Great for Python, JS, Java, C++. 12GB+ RAM required.',
    download_url: 'https://huggingface.co/TheBloke/CodeLlama-7B-Instruct-GGUF/resolve/main/codellama-7b-instruct.Q4_K_M.gguf',
    file_name: 'codellama-7b-instruct.Q4_K_M.gguf'
  },
  {
    id: 'llama-3.2-3b',
    name: 'Llama 3.2 3B',
    size: '2.0 GB',
    description: '🚀 General-purpose with good code skills. 8GB+ RAM. Balanced speed & quality.',
    download_url: 'https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf',
    file_name: 'Llama-3.2-3B-Instruct-Q4_K_M.gguf'
  },
  {
    id: 'qwen-2.5-coder-1.5b',
    name: 'Qwen 2.5 Coder 1.5B',
    size: '1.1 GB',
    description: '⚡ Lightweight code expert. Fast on any PC. 6GB+ RAM. Good for quick analysis.',
    download_url: 'https://huggingface.co/Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF/resolve/main/qwen2.5-coder-1.5b-instruct-q4_k_m.gguf',
    file_name: 'qwen2.5-coder-1.5b-instruct-q4_k_m.gguf'
  },
  {
    id: 'phi-3-mini',
    name: 'Phi-3 Mini 3.8B',
    size: '2.3 GB',
    description: '📚 Microsoft\'s efficient model. Strong reasoning for its size. 8GB+ RAM.',
    download_url: 'https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-gguf/resolve/main/Phi-3-mini-4k-instruct-q4.gguf',
    file_name: 'Phi-3-mini-4k-instruct-q4.gguf'
  },
  {
    id: 'llama-3.2-1b',
    name: 'Llama 3.2 1B ⚡',
    size: '810 MB',
    description: '🚀 Ultra-fast & lightweight. Perfect for quick analysis on any PC. 4GB+ RAM.',
    download_url: 'https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf',
    file_name: 'Llama-3.2-1B-Instruct-Q4_K_M.gguf'
  },
  {
    id: 'tinyllama-1.1b',
    name: 'TinyLlama 1.1B',
    size: '670 MB',
    description: '🔥 Smallest & fastest. Great for low-spec machines. 3GB+ RAM sufficient.',
    download_url: 'https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf',
    file_name: 'tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf'
  },
  {
    id: 'stablelm-2-1.6b',
    name: 'StableLM 2 1.6B',
    size: '980 MB',
    description: '💎 Stability AI\'s compact model. Good code understanding. 4GB+ RAM.',
    download_url: 'https://huggingface.co/stabilityai/stablelm-2-1_6b-GGUF/resolve/main/stablelm-2-1_6b-Q4_K_M.gguf',
    file_name: 'stablelm-2-1_6b-Q4_K_M.gguf'
  }
];

export default function ModelSelector({ onModelSelect, selectedModel: propSelectedModel, customModelFile }: ModelSelectorProps) {
  const [internalSelectedModel, setInternalSelectedModel] = useState<string>('');
  const selectedModel = propSelectedModel !== undefined ? propSelectedModel : internalSelectedModel;
  const [customFile, setCustomFile] = useState<File | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string>('');
  const [showTutorial, setShowTutorial] = useState(false);
  const [hasModel, setHasModel] = useState(false);

  const getSystemRequirements = (modelId: string) => {
    const requirements: Record<string, { cpu: string; ram: string; gpu: string; warning?: string }> = {
      'qwen-2.5-coder-7b': {
        cpu: '6+ cores recommended',
        ram: '16GB minimum, 32GB recommended',
        gpu: 'Highly recommended (6GB+ VRAM)',
        warning: '⚠️ Requires powerful hardware. Best for high-end systems.'
      },
      'deepseek-coder-6.7b': {
        cpu: '6+ cores recommended',
        ram: '12GB minimum, 24GB recommended',
        gpu: 'Recommended (6GB+ VRAM)',
        warning: '⚠️ Performance depends on system specs.'
      },
      'codellama-7b': {
        cpu: '6+ cores recommended',
        ram: '12GB minimum, 24GB recommended',
        gpu: 'Recommended (6GB+ VRAM)',
      },
      'llama-3.2-3b': {
        cpu: '4+ cores',
        ram: '8GB minimum, 16GB recommended',
        gpu: 'Recommended (4GB+ VRAM)',
      },
      'qwen-2.5-coder-1.5b': {
        cpu: '4+ cores recommended',
        ram: '6GB minimum',
        gpu: 'Optional (speeds up)',
      },
      'phi-3-mini': {
        cpu: '4+ cores',
        ram: '8GB minimum',
        gpu: 'Optional (4GB+ VRAM)',
      },
      'llama-3.2-1b': {
        cpu: '2+ cores',
        ram: '4GB minimum',
        gpu: 'Not required',
      },
      'tinyllama-1.1b': {
        cpu: '2+ cores',
        ram: '3GB minimum',
        gpu: 'Not required',
      },
      'stablelm-2-1.6b': {
        cpu: '2+ cores',
        ram: '4GB minimum',
        gpu: 'Not required',
      }
    };
    return requirements[modelId];
  };

  const handleModelChange = (modelId: string) => {
    // Toggle selection if clicking the same model
    if (selectedModel === modelId) {
      // If there's a custom model file uploaded, revert to showing that
      if (customModelFile) {
        setInternalSelectedModel('custom');
        if (onModelSelect) {
          onModelSelect('custom', customModelFile.name, customModelFile);
        }
      } else {
        setInternalSelectedModel('');
        setCustomFile(null);
        setDownloadError('');
        if (onModelSelect) {
          onModelSelect('', '');
        }
      }
      return;
    }
    
    setInternalSelectedModel(modelId);
    setCustomFile(null);
    setDownloadError('');
    
    if (modelId !== 'custom') {
      const model = AVAILABLE_MODELS.find(m => m.id === modelId);
      if (model && onModelSelect) {
        onModelSelect(modelId, `./models/${model.file_name}`);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.endsWith('.gguf')) {
      setCustomFile(file);
      if (onModelSelect) {
        // For custom uploads, pass the file object
        onModelSelect('custom', file.name, file);
      }
    } else {
      alert('Please select a valid GGUF model file');
    }
  };

  const downloadModel = async () => {
    const model = AVAILABLE_MODELS.find(m => m.id === selectedModel);
    if (!model || !model.download_url) return;

    setIsDownloading(true);
    setDownloadError('');
    setDownloadProgress(0);

    try {
      // Note: Direct browser download of large files from HuggingFace
      // This will trigger browser's native download
      const link = document.createElement('a');
      link.href = model.download_url;
      link.download = model.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Simulate progress for UI feedback
      let progress = 0;
      const interval = setInterval(() => {
        progress += 5;
        setDownloadProgress(progress);
        if (progress >= 100) {
          clearInterval(interval);
          setIsDownloading(false);
        }
      }, 500);
      
    } catch (error) {
      setDownloadError('Download failed. Please try again or download manually.');
      setIsDownloading(false);
    }
  };

  const selectedModelData = AVAILABLE_MODELS.find(m => m.id === selectedModel);

  return (
    <div>
      <label style={{ display: 'block', fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '12px', color: '#fff' }}>
        Select Model
      </label>

      {/* Model Status - Warning or Success */}
      {!selectedModel ? (
        <div style={{
          background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.2), rgba(239, 68, 68, 0.2))',
          border: '2px solid rgba(249, 115, 22, 0.5)',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>⚠️</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '8px', color: '#fff' }}>
            No Model Selected
          </div>
          <div style={{ fontSize: '0.9375rem', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '12px' }}>
            Please select a model below to start analyzing code
          </div>
          <div style={{ fontSize: '0.8125rem', color: '#fbbf24', marginTop: '12px' }}>
            💡 We recommend <strong>Llama 3.2 1B</strong> for most users
          </div>
        </div>
      ) : (
        <div style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(6, 182, 212, 0.2))',
          border: '2px solid rgba(16, 185, 129, 0.5)',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '20px',
          textAlign: 'center',
          animation: 'fadeIn 0.5s ease-in-out'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>✓</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '8px', color: '#fff' }}>
            Model Selected Successfully
          </div>
          <div style={{ fontSize: '0.9375rem', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '12px' }}>
            {selectedModel === 'custom' 
              ? 'Your Local Model is ready to use'
              : `${selectedModelData ? selectedModelData.name : 'Selected model'} is ready to download from the link below`
            }
          </div>
          <div style={{ fontSize: '0.8125rem', color: '#6ee7b7', marginTop: '12px' }}>
            {selectedModel === 'custom' 
              ? '✨ You can now analyze repositories with this model'
              : '📥 Download the model file and upload it to start analyzing'
            }
          </div>
        </div>
      )}

      {/* Model Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
        {AVAILABLE_MODELS.map((model) => (
          <div
            key={model.id}
            onClick={() => handleModelChange(model.id)}
            style={{
              background: selectedModel === model.id 
                ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(236, 72, 153, 0.2))'
                : 'rgba(255, 255, 255, 0.04)',
              border: selectedModel === model.id 
                ? '2px solid rgba(139, 92, 246, 0.5)' 
                : '2px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '20px',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseOver={(e) => {
              if (selectedModel !== model.id) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)';
                e.currentTarget.style.transform = 'translateY(-4px)';
              }
            }}
            onMouseOut={(e) => {
              if (selectedModel !== model.id) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
          >
            {/* Selected Badge */}
            {selectedModel === model.id && (
              <div style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                borderRadius: '9999px',
                padding: '4px 12px',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)'
              }}>
                ✓ Selected
              </div>
            )}

            <div style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '8px', color: '#fff' }}>
              {model.name}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#a78bfa', marginBottom: '12px', fontWeight: '600' }}>
              {model.size}
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'rgba(255, 255, 255, 0.7)', lineHeight: '1.5', marginBottom: '12px' }}>
              {model.description}
            </div>
            
            {/* System Requirements */}
            {model.id !== 'custom' && getSystemRequirements(model.id) && (
              <div style={{
                marginTop: '12px',
                padding: '12px',
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '8px',
                fontSize: '0.75rem'
              }}>
                <div style={{ fontWeight: 'bold', marginBottom: '6px', color: '#c4b5fd' }}>System Requirements:</div>
                <div style={{ color: '#ddd6fe', lineHeight: '1.6' }}>
                  • CPU: {getSystemRequirements(model.id)?.cpu}<br />
                  • RAM: {getSystemRequirements(model.id)?.ram}<br />
                  • GPU: {getSystemRequirements(model.id)?.gpu}
                </div>
                {getSystemRequirements(model.id)?.warning && (
                  <div style={{ marginTop: '8px', color: '#fbbf24', fontSize: '0.7rem' }}>
                    {getSystemRequirements(model.id)?.warning}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Download Section */}
      {selectedModelData && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.04)',
          borderRadius: '16px',
          padding: '20px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ fontSize: '0.9375rem', fontWeight: '600', color: '#fff' }}>
              Model Status
            </div>
            <button
              onClick={() => setShowTutorial(!showTutorial)}
              style={{
                background: 'rgba(139, 92, 246, 0.2)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '0.8125rem',
                color: '#a78bfa',
                cursor: 'pointer',
                fontWeight: '600',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(139, 92, 246, 0.3)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(139, 92, 246, 0.2)';
              }}
            >
              {showTutorial ? '📖 Hide' : '📖 Tutorial'}
            </button>
          </div>

          {/* Tutorial */}
          {showTutorial && (
            <div style={{
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
              fontSize: '0.8125rem',
              color: '#93c5fd'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '16px', fontSize: '1rem', color: '#60a5fa' }}>
                📥 Three Ways to Get Models
              </div>
              
              {/* Method 1 */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#93c5fd', fontSize: '0.9375rem' }}>
                  ⚡ Method 1: Quick Download (Recommended)
                </div>
                <ol style={{ marginLeft: '20px', marginTop: '6px', color: '#bfdbfe', lineHeight: '1.7' }}>
                  <li>Click <strong>"Download Model"</strong> button below</li>
                  <li>Your browser will download the file automatically</li>
                  <li>Progress bar shows download status</li>
                  <li>Once complete, model is ready to use!</li>
                </ol>
                <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(139, 92, 246, 0.15)', borderRadius: '6px', fontSize: '0.75rem', color: '#c4b5fd' }}>
                  💡 Tip: This is the <strong>easiest way</strong> for first-time users
                </div>
              </div>

              {/* Method 2 */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#93c5fd', fontSize: '0.9375rem' }}>
                  📤 Method 2: Upload Existing Model
                </div>
                <ol style={{ marginLeft: '20px', marginTop: '6px', color: '#bfdbfe', lineHeight: '1.7' }}>
                  <li>Select <strong>"📁 Upload Custom Model"</strong> above</li>
                  <li>Click the upload area</li>
                  <li>Choose your .gguf file</li>
                  <li>Model is ready immediately after selection</li>
                </ol>
                <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(139, 92, 246, 0.15)', borderRadius: '6px', fontSize: '0.75rem', color: '#c4b5fd' }}>
                  ℹ️ Note: Only <strong>.gguf</strong> format supported
                </div>
              </div>

              {/* Method 3 */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#93c5fd', fontSize: '0.9375rem' }}>
                  🌐 Method 3: Manual Download from HuggingFace
                </div>
                <ol style={{ marginLeft: '20px', marginTop: '6px', color: '#bfdbfe', lineHeight: '1.7' }}>
                  <li>Visit model link: <a href={selectedModelData.download_url} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', textDecoration: 'underline', fontWeight: 'bold' }}>HuggingFace</a></li>
                  <li>Click <strong>"Download"</strong> button on the page</li>
                  <li>Save .gguf file to your computer</li>
                  <li>Return here and use <strong>Method 2</strong> to upload</li>
                </ol>
              </div>

              {/* Hardware Warning */}
              <div style={{
                marginTop: '16px',
                padding: '12px',
                background: 'rgba(251, 191, 36, 0.15)',
                borderLeft: '4px solid #fbbf24',
                borderRadius: '8px'
              }}>
                <div style={{ fontWeight: 'bold', marginBottom: '6px', color: '#fbbf24', fontSize: '0.875rem' }}>
                  ⚠️ System Requirements
                </div>
                <div style={{ fontSize: '0.75rem', color: '#fef3c7', lineHeight: '1.6' }}>
                  • <strong>No GPU / &lt;8GB RAM</strong>: Use <strong>Llama 3.2 1B</strong><br />
                  • <strong>8-12GB RAM</strong>: Try <strong>Qwen 2.5 Coder 1.5B</strong><br />
                  • <strong>GPU + 16GB+ RAM</strong>: Use <strong>Llama 3.2 3B</strong><br />
                  <br />
                  <em>Unsure? Stick with Llama 3.2 1B - works everywhere!</em>
                </div>
              </div>
            </div>
          )}

          {/* Download Button */}
          {!isDownloading && (
            <button
              onClick={downloadModel}
              style={{
                width: '100%',
                padding: '14px',
                background: 'linear-gradient(135deg, #10b981, #06b6d4)',
                border: 'none',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '0.9375rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s',
                boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 24px rgba(16, 185, 129, 0.4)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(16, 185, 129, 0.3)';
              }}
            >
              📥 Download Model ({selectedModelData.size})
            </button>
          )}

          {/* Download Progress */}
          {isDownloading && (
            <div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '8px',
                fontSize: '0.875rem',
                color: '#a78bfa'
              }}>
                <span>Downloading...</span>
                <span>{downloadProgress}%</span>
              </div>
              <div style={{
                width: '100%',
                height: '8px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '9999px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${downloadProgress}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #10b981, #06b6d4)',
                  transition: 'width 0.3s',
                  borderRadius: '9999px'
                }} />
              </div>
            </div>
          )}

          {downloadError && (
            <div style={{
              marginTop: '12px',
              padding: '12px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              fontSize: '0.8125rem',
              color: '#fca5a5'
            }}>
              ⚠️ {downloadError}
            </div>
          )}

          <div style={{
            marginTop: '12px',
            fontSize: '0.75rem',
            color: '#6b7280',
            textAlign: 'center'
          }}>
            💡 Model will be saved to your <code style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>./models/</code> folder
          </div>
        </div>
      )}
    </div>
  );
}
