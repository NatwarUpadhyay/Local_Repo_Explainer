'use client';

import { useEffect, useRef, useState } from 'react';
import ArchitectureTree from './ArchitectureTree';
import GraphExplorer from './GraphExplorer';

interface Node {
  id: string;
  label: string;
  type: string;
  description?: string;
  language?: string;
  size?: number;
  dependencies?: string[];
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface Edge {
  from: string;
  to: string;
  label: string;
}

interface GraphData {
  nodes: Node[];
  edges: Edge[];
}

interface ResultsViewProps {
  jobData: {
    result: {
      overview: string;
      repository: string;
      files_analyzed: number;
      nodes: Node[];
      edges: Edge[];
      model_id?: string;
      model_path?: string;
    };
    repo_url: string;
    status: string;
  };
}

interface TreeNode {
  id: string;
  label: string;
  type: string;
  description?: string;
  language?: string;
  size?: number;
  dependencies?: string[];
  children?: TreeNode[];
  path: string;
}

export default function ResultsView({ jobData }: ResultsViewProps) {
  console.log('ResultsView received jobData:', jobData);
  
  // Safety check
  if (!jobData || !jobData.result) {
    return (
      <div style={{
        background: 'rgba(255, 68, 68, 0.1)',
        border: '2px solid rgba(255, 68, 68, 0.5)',
        borderRadius: '16px',
        padding: '20px',
        color: '#fff'
      }}>
        <h3>Error: No result data available</h3>
        <pre>{JSON.stringify(jobData, null, 2)}</pre>
      </div>
    );
  }
  
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [analyzingNode, setAnalyzingNode] = useState<string | null>(null);
  const [nodeAnalysis, setNodeAnalysis] = useState<Map<string, string>>(new Map());
  const [viewMode, setViewMode] = useState<'tree' | 'graph'>('tree');

  // Extract model name from path
  const getModelName = (modelPath: string | undefined): string => {
    if (!modelPath) return 'Unknown Model';
    // Extract filename from full path (handle both / and \)
    const filename = modelPath.split('/').pop() || modelPath.split('\\').pop() || modelPath;
    // Remove .gguf extension
    return filename.replace(/\.gguf$/i, '');
  };

  // Truncate long model names for display
  const getTruncatedModelName = (modelPath: string | undefined): string => {
    const fullName = getModelName(modelPath);
    if (fullName.length > 25) {
      return fullName.substring(0, 25) + '...';
    }
    return fullName;
  };

  if (!jobData?.result) return null;

  const { result } = jobData;

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.04)',
      backdropFilter: 'blur(30px)',
      borderRadius: '28px',
      padding: '48px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
          <span style={{ fontSize: '3rem' }}>✨</span>
          <div>
            <h2 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '8px' }}>
              Analysis Complete
            </h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '1rem' }}>
              Repository: <code style={{ 
                background: 'rgba(139, 92, 246, 0.2)', 
                padding: '4px 12px', 
                borderRadius: '8px',
                color: '#a78bfa',
                fontFamily: 'monospace'
              }}>{result.repository}</code>
            </p>
          </div>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '16px',
          marginTop: '24px'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(236, 72, 153, 0.1))',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid rgba(139, 92, 246, 0.3)'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📄</div>
            <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '4px' }}>
              Files Analyzed
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
              {result.files_analyzed}
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(6, 182, 212, 0.1))',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid rgba(59, 130, 246, 0.3)'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🔗</div>
            <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '4px' }}>
              Components
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
              {result.nodes?.length || 0}
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1))',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            position: 'relative'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🤖</div>
            <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '4px' }}>
              Model Location
            </div>
            <div 
              style={{ 
                fontSize: '1rem', 
                fontWeight: 'bold',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '100%'
              }}
              title={getModelName(result.model_path || result.model_id)}
            >
              {getTruncatedModelName(result.model_path || result.model_id)}
            </div>
          </div>
        </div>
      </div>

      {/* Overview */}
      <div style={{ marginBottom: '40px' }}>
        <h3 style={{ 
          fontSize: '1.5rem', 
          fontWeight: 'bold', 
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{ fontSize: '1.8rem' }}>📝</span>
          AI-Generated Overview
        </h3>
        <div style={{
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '16px',
          padding: '28px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          lineHeight: 1.8,
          fontSize: '1rem',
          color: 'rgba(255, 255, 255, 0.85)'
        }}>
          {result.overview.split('\n').map((paragraph, index) => {
            // Check if we're in the vulnerability section - more precise detection
            const allLines = result.overview.split('\n');
            const vulnerabilityStartIndex = allLines.findIndex(line => 
              line.includes('VULNERABILITY ANALYSIS') || line.includes('SECURITY ASSESSMENT')
            );
            const isInVulnerabilitySection = vulnerabilityStartIndex !== -1 && index >= vulnerabilityStartIndex;
            
            const textColor = isInVulnerabilitySection ? '#ff4444' : 'rgba(255, 255, 255, 0.85)';
            const headingColor = isInVulnerabilitySection ? '#ff6b6b' : '#a78bfa';
            
            // Handle headers (lines starting with ## or **)
            if (paragraph.trim().startsWith('**') && paragraph.trim().endsWith('**')) {
              const text = paragraph.replace(/\*\*/g, '');
              return (
                <h4 key={index} style={{
                  fontSize: '1.25rem',
                  fontWeight: 'bold',
                  marginTop: index > 0 ? '24px' : '0',
                  marginBottom: '12px',
                  color: text.includes('VULNERABILITY') || text.includes('SECURITY') ? '#ff6b6b' : '#a78bfa'
                }}>
                  {text}
                </h4>
              );
            }
            // Handle bullet points
            else if (paragraph.trim().startsWith('-')) {
              return (
                <div key={index} style={{
                  marginLeft: '20px',
                  marginBottom: '8px',
                  display: 'flex',
                  gap: '8px',
                  color: textColor
                }}>
                  <span style={{ color: headingColor }}>•</span>
                  <span>{paragraph.trim().substring(1).trim()}</span>
                </div>
              );
            }
            // Handle numbered lists
            else if (/^\d+\./.test(paragraph.trim())) {
              return (
                <div key={index} style={{
                  marginLeft: '20px',
                  marginBottom: '8px',
                  color: textColor
                }}>
                  {paragraph.trim()}
                </div>
              );
            }
            // Handle empty lines
            else if (paragraph.trim() === '') {
              return <div key={index} style={{ height: '12px' }} />;
            }
            // Regular paragraphs
            else {
              return (
                <p key={index} style={{ marginBottom: '16px', color: textColor }}>
                  {paragraph}
                </p>
              );
            }
          })}
        </div>
      </div>

      {/* Vulnerability Analysis Box */}
      {result.vulnerability_analysis && (
        <div style={{ marginBottom: '40px' }}>
          <h3 style={{ 
            fontSize: '1.5rem', 
            fontWeight: 'bold', 
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#ff6b6b'
          }}>
            <span style={{ fontSize: '1.8rem' }}>⚠️</span>
            Security Vulnerability Analysis
          </h3>
          <div style={{
            background: 'rgba(255, 68, 68, 0.1)',
            borderRadius: '16px',
            padding: '28px',
            border: '2px solid rgba(255, 68, 68, 0.4)',
            lineHeight: 1.8,
            fontSize: '1rem',
            color: '#ff4444'
          }}>
            {result.vulnerability_analysis.split('\n').map((paragraph, index) => {
              // Handle headers
              if (paragraph.trim().startsWith('**') && paragraph.trim().endsWith('**')) {
                const text = paragraph.replace(/\*\*/g, '');
                return (
                  <h4 key={index} style={{
                    fontSize: '1.15rem',
                    fontWeight: 'bold',
                    marginTop: index > 0 ? '20px' : '0',
                    marginBottom: '12px',
                    color: '#ff6b6b'
                  }}>
                    {text}
                  </h4>
                );
              }
              // Handle bullet points
              else if (paragraph.trim().startsWith('-')) {
                return (
                  <div key={index} style={{
                    marginLeft: '20px',
                    marginBottom: '8px',
                    display: 'flex',
                    gap: '8px'
                  }}>
                    <span style={{ color: '#ff6b6b' }}>•</span>
                    <span>{paragraph.trim().substring(1).trim()}</span>
                  </div>
                );
              }
              // Handle numbered lists
              else if (/^\d+\./.test(paragraph.trim())) {
                return (
                  <div key={index} style={{
                    marginLeft: '20px',
                    marginBottom: '8px'
                  }}>
                    {paragraph.trim()}
                  </div>
                );
              }
              // Handle empty lines
              else if (paragraph.trim() === '') {
                return <div key={index} style={{ height: '12px' }} />;
              }
              // Regular paragraphs
              else {
                return (
                  <p key={index} style={{ marginBottom: '16px' }}>
                    {paragraph}
                  </p>
                );
              }
            })}
          </div>
        </div>
      )}

      {/* Interactive Graph */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h3 style={{ 
            fontSize: '1.5rem', 
            fontWeight: 'bold', 
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{ fontSize: '1.8rem' }}>🗺️</span>
            Architecture View
          </h3>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {/* View Toggle */}
            <div style={{ display: 'flex', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '8px', padding: '4px' }}>
              <button
                onClick={() => setViewMode('tree')}
                style={{
                  padding: '8px 16px',
                  background: viewMode === 'tree' ? 'linear-gradient(135deg, #8b5cf6, #ec4899)' : 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                📋 Tree View
              </button>
              <button
                onClick={() => setViewMode('graph')}
                style={{
                  padding: '8px 16px',
                  background: viewMode === 'graph' ? 'linear-gradient(135deg, #8b5cf6, #ec4899)' : 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                🌐 Graph View
              </button>
            </div>
          </div>
        </div>
        
        {/* Conditional View Based on Toggle */}
        {viewMode === 'tree' ? (
          <ArchitectureTree
            nodes={result.nodes}
            edges={result.edges}
            modelPath={result.model_path || result.model_id || ''}
            jobId={'current'}
          />
        ) : (
          <GraphExplorer
            nodes={result.nodes}
            edges={result.edges}
            modelPath={result.model_path || result.model_id || ''}
            jobId={'current'}
          />
        )}
      </div>

      {/* Actions */}
      <div style={{ 
        display: 'flex', 
        gap: '16px', 
        marginTop: '32px',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => window.location.reload()}
          style={{
            flex: 1,
            minWidth: '200px',
            padding: '16px 32px',
            borderRadius: '12px',
            border: 'none',
            background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '1rem',
            cursor: 'pointer',
            transition: 'all 0.3s',
            boxShadow: '0 10px 30px rgba(139, 92, 246, 0.4)'
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
          🔄 Analyze Another Repository
        </button>
        
        <button
          onClick={() => {
            const data = JSON.stringify(result, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${result.repository}-analysis.json`;
            a.click();
          }}
          style={{
            flex: 1,
            minWidth: '200px',
            padding: '16px 32px',
            borderRadius: '12px',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            background: 'rgba(255, 255, 255, 0.05)',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '1rem',
            cursor: 'pointer',
            transition: 'all 0.3s'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.6)';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
          }}
        >
          💾 Download Report (JSON)
        </button>
      </div>
    </div>
  );
}
