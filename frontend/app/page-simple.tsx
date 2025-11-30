'use client';

import { useState } from 'react';

export default function Home() {
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    alert('Form submitted with: ' + repoUrl);
    setLoading(false);
  };

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(to bottom, #000000, #1a1a2e)',
      color: 'white',
      padding: '40px 20px'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <h1 style={{
            fontSize: '4rem',
            fontWeight: 'bold',
            background: 'linear-gradient(to right, #a78bfa, #ec4899, #3b82f6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '20px'
          }}>
            Understand Code In Seconds
          </h1>
          <p style={{ fontSize: '1.25rem', color: '#9ca3af', marginBottom: '30px' }}>
            AI-powered repository analysis that reveals architecture, dependencies, and insights—instantly.
          </p>
          <p style={{ fontSize: '1rem', color: '#a78bfa' }}>
            🔒 Your code stays private. Always.
          </p>
        </div>

        {/* Input Form */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          borderRadius: '24px',
          padding: '40px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <form onSubmit={handleSubmit} style={{ marginBottom: 0 }}>
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
                padding: '16px 20px',
                fontSize: '1rem',
                borderRadius: '16px',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                marginBottom: '20px'
              }}
            />
            <button
              type="submit"
              disabled={loading || !repoUrl}
              style={{
                width: '100%',
                padding: '18px',
                fontSize: '1.125rem',
                fontWeight: 'bold',
                borderRadius: '16px',
                border: 'none',
                background: loading || !repoUrl 
                  ? '#4b5563' 
                  : 'linear-gradient(to right, #8b5cf6, #ec4899, #3b82f6)',
                color: 'white',
                cursor: loading || !repoUrl ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Analyzing...' : '✨ Analyze Repository'}
            </button>
          </form>
        </div>

        {/* Features */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '24px',
          marginTop: '60px'
        }}>
          {[
            { icon: '🚀', title: 'Lightning Fast', desc: 'Analyze 100K+ lines of code in seconds' },
            { icon: '🔒', title: '100% Private', desc: 'Your code never leaves your infrastructure' },
            { icon: '🎯', title: 'Multi-Language', desc: 'Python, JavaScript, TypeScript, and more' }
          ].map((feature, i) => (
            <div key={i} style={{
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '16px',
              padding: '30px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>{feature.icon}</div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '8px' }}>{feature.title}</h3>
              <p style={{ color: '#9ca3af' }}>{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
