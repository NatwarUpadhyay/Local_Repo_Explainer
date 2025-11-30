'use client';

import { useState } from 'react';

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

interface ArchitectureTreeProps {
  nodes: any[];
  edges: any[];
  modelPath: string;
  jobId: string;
}

export default function ArchitectureTree({ nodes, edges, modelPath, jobId }: ArchitectureTreeProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['directories', 'files']));
  const [analyzingNode, setAnalyzingNode] = useState<string | null>(null);
  const [nodeAnalysis, setNodeAnalysis] = useState<Map<string, string>>(new Map());
  const [nodeVulnerability, setNodeVulnerability] = useState<Map<string, string>>(new Map());
  const [filters, setFilters] = useState({
    repository: true,
    directory: true,
    file: true
  });

  // Build simple flattened structure grouped by type
  const buildGroupedStructure = () => {
    // Group all nodes by type
    const fileNodes = nodes.filter(n => n.type === 'file');
    const dirNodes = nodes.filter(n => n.type === 'directory');
    const repoNode = nodes.find(n => n.type === 'repository');

    // Build dependency map for quick lookup
    const dependencyMap = new Map<string, string[]>();
    edges.forEach(edge => {
      if (!dependencyMap.has(edge.from)) {
        dependencyMap.set(edge.from, []);
      }
      dependencyMap.get(edge.from)?.push(edge.to);
    });

    return {
      repository: repoNode,
      directories: dirNodes.map(d => ({
        ...d,
        dependsOn: dependencyMap.get(d.id) || []
      })),
      files: fileNodes.map(f => ({
        ...f,
        dependsOn: dependencyMap.get(f.id) || []
      }))
    };
  };

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const analyzeNode = async (node: any) => {
    setAnalyzingNode(node.id);

    try {
      // Build context for the node including dependencies
      const dependsOnText = node.dependsOn && node.dependsOn.length > 0 
        ? `Depends on: ${node.dependsOn.map((id: string) => nodes.find(n => n.id === id)?.label || id).join(', ')}`
        : '';
      
      const context = `
Node: ${node.label}
Type: ${node.type}
${node.language ? `Language: ${node.language}` : ''}
${node.size ? `Size: ${(node.size / 1024).toFixed(2)} KB` : ''}
${node.description ? `Description: ${node.description}` : ''}
${node.dependencies && node.dependencies.length > 0 ? `Internal Dependencies: ${node.dependencies.join(', ')}` : ''}
${dependsOnText}
`.trim();

      const response = await fetch('http://localhost:8000/api/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: jobId,
          message: `Analyze this ${node.type} component: ${node.label}. Explain its purpose, how it fits into the project architecture, key responsibilities, and how it interacts with other components. Be specific and technical.`,
          context: context,
          model_path: modelPath
        })
      });

      const data = await response.json();
      const newAnalysis = new Map(nodeAnalysis);
      newAnalysis.set(node.id, data.response);
      setNodeAnalysis(newAnalysis);

      // Also fetch vulnerability analysis
      const vulnResponse = await fetch('http://localhost:8000/api/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: jobId,
          message: `Perform a security vulnerability analysis for this ${node.type}: ${node.label}. Identify potential security risks, vulnerabilities, and provide specific recommendations. Include severity levels (CRITICAL/HIGH/MEDIUM/LOW).`,
          context: context,
          model_path: modelPath
        })
      });

      const vulnData = await vulnResponse.json();
      const newVuln = new Map(nodeVulnerability);
      newVuln.set(node.id, vulnData.response);
      setNodeVulnerability(newVuln);
    } catch (error) {
      console.error('Analysis error:', error);
      const newAnalysis = new Map(nodeAnalysis);
      newAnalysis.set(node.id, `Error analyzing node: ${error}`);
      setNodeAnalysis(newAnalysis);
    } finally {
      setAnalyzingNode(null);
    }
  };

  const renderNodeCard = (node: any, showDependencies: boolean = true): JSX.Element => {
    const isAnalyzing = analyzingNode === node.id;
    const analysis = nodeAnalysis.get(node.id);
    const vulnerability = nodeVulnerability.get(node.id);

    const getIcon = () => {
      if (node.type === 'repository') return '📦';
      if (node.type === 'directory') return '📁';
      if (node.language === 'py' || node.language === 'python') return '🐍';
      if (node.language === 'js' || node.language === 'javascript') return '⚡';
      if (node.language === 'ts' || node.language === 'typescript') return '💠';
      if (node.language === 'java') return '☕';
      if (node.language === 'go') return '🐹';
      if (node.language === 'rust') return '🦀';
      if (node.language === 'html') return '🌐';
      if (node.language === 'css') return '🎨';
      return '📄';
    };

    const getTypeColor = () => {
      if (node.type === 'repository') return 'rgba(139, 92, 246, 0.15)';
      if (node.type === 'directory') return 'rgba(59, 130, 246, 0.15)';
      return 'rgba(16, 185, 129, 0.15)';
    };

    const getBorderColor = () => {
      if (node.type === 'repository') return 'rgba(139, 92, 246, 0.5)';
      if (node.type === 'directory') return 'rgba(59, 130, 246, 0.5)';
      return 'rgba(16, 185, 129, 0.5)';
    };

    return (
      <div key={node.id} style={{ marginBottom: '12px' }}>
        <div
          style={{
            background: getTypeColor(),
            border: `2px solid ${getBorderColor()}`,
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            alignItems: 'start',
            gap: '16px',
            transition: 'all 0.2s',
            position: 'relative'
          }}
        >
          {/* Node Icon */}
          <span style={{ fontSize: '2rem', minWidth: '40px' }}>{getIcon()}</span>

          {/* Node Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
              <span style={{ fontSize: '1.1rem', fontWeight: '700', color: '#fff' }}>
                {node.label}
              </span>
              {node.language && (
                <span style={{
                  fontSize: '0.7rem',
                  background: 'rgba(139, 92, 246, 0.4)',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  color: '#fff',
                  fontWeight: '600'
                }}>
                  {node.language.toUpperCase()}
                </span>
              )}
              {node.size && (
                <span style={{
                  fontSize: '0.75rem',
                  color: 'rgba(255, 255, 255, 0.6)'
                }}>
                  {(node.size / 1024).toFixed(1)} KB
                </span>
              )}
            </div>
            
            {node.description && (
              <div style={{
                fontSize: '0.9rem',
                color: 'rgba(255, 255, 255, 0.8)',
                marginBottom: '12px',
                fontStyle: 'italic',
                lineHeight: '1.5'
              }}>
                {node.description}
              </div>
            )}

            {/* Dependencies */}
            {showDependencies && node.dependsOn && node.dependsOn.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                <div style={{ 
                  fontSize: '0.75rem', 
                  color: 'rgba(255, 255, 255, 0.6)', 
                  marginBottom: '6px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  🔗 Dependencies ({node.dependsOn.length})
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {node.dependsOn.slice(0, 5).map((depId: string, i: number) => {
                    const depNode = nodes.find(n => n.id === depId);
                    return (
                      <span key={i} style={{
                        fontSize: '0.75rem',
                        background: 'rgba(236, 72, 153, 0.25)',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        color: 'rgba(255, 255, 255, 0.9)',
                        border: '1px solid rgba(236, 72, 153, 0.4)',
                        fontWeight: '500'
                      }}>
                        {depNode?.label || depId}
                      </span>
                    );
                  })}
                  {node.dependsOn.length > 5 && (
                    <span style={{ 
                      fontSize: '0.75rem', 
                      color: 'rgba(255, 255, 255, 0.5)', 
                      padding: '6px 12px',
                      fontWeight: '500'
                    }}>
                      +{node.dependsOn.length - 5} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Analyze Button */}
          <button
            onClick={() => analyzeNode(node)}
            disabled={isAnalyzing}
            style={{
              padding: '10px 20px',
              background: isAnalyzing 
                ? 'rgba(139, 92, 246, 0.3)' 
                : 'linear-gradient(135deg, #8b5cf6, #ec4899)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '0.9rem',
              fontWeight: '700',
              cursor: isAnalyzing ? 'wait' : 'pointer',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
              boxShadow: isAnalyzing ? 'none' : '0 4px 12px rgba(139, 92, 246, 0.3)',
              minWidth: '160px'
            }}
            onMouseEnter={(e) => {
              if (!isAnalyzing) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(139, 92, 246, 0.5)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = isAnalyzing ? 'none' : '0 4px 12px rgba(139, 92, 246, 0.3)';
            }}
          >
            {isAnalyzing ? '🔄 Analyzing...' : '🔍 Analyze Locally'}
          </button>
        </div>

        {/* Analysis Result */}
        {analysis && (
          <div style={{
            marginTop: '8px',
            marginLeft: '56px',
            padding: '20px',
            background: 'rgba(0, 0, 0, 0.4)',
            border: '2px solid rgba(139, 92, 246, 0.4)',
            borderRadius: '12px',
            borderLeft: '4px solid rgba(139, 92, 246, 0.8)'
          }}>
            <div style={{
              fontSize: '0.75rem',
              color: 'rgba(139, 92, 246, 1)',
              marginBottom: '12px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>🤖</span> AI ANALYSIS
            </div>
            <div style={{
              fontSize: '0.95rem',
              color: 'rgba(255, 255, 255, 0.95)',
              lineHeight: '1.7',
              whiteSpace: 'pre-wrap'
            }}>
              {analysis}
            </div>
          </div>
        )}

        {/* Vulnerability Analysis Result */}
        {vulnerability && (
          <div style={{
            marginTop: '8px',
            marginLeft: '56px',
            padding: '20px',
            background: 'rgba(255, 68, 68, 0.1)',
            border: '2px solid rgba(255, 68, 68, 0.4)',
            borderRadius: '12px',
            borderLeft: '4px solid rgba(255, 68, 68, 0.8)'
          }}>
            <div style={{
              fontSize: '0.75rem',
              color: 'rgba(255, 107, 107, 1)',
              marginBottom: '12px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>⚠️</span> SECURITY VULNERABILITY ANALYSIS
            </div>
            <div style={{
              fontSize: '0.95rem',
              color: '#ff4444',
              lineHeight: '1.7',
              whiteSpace: 'pre-wrap'
            }}>
              {vulnerability}
            </div>
          </div>
        )}
      </div>
    );
  };

  const structure = buildGroupedStructure();

  return (
    <div style={{
      background: 'rgba(0, 0, 0, 0.3)',
      borderRadius: '20px',
      padding: '32px',
      border: '2px solid rgba(139, 92, 246, 0.3)',
      maxHeight: '900px',
      overflowY: 'auto'
    }}>
      {/* Filter Controls */}
      <div style={{
        marginBottom: '20px',
        padding: '16px',
        background: 'rgba(139, 92, 246, 0.15)',
        borderRadius: '12px',
        border: '2px solid rgba(139, 92, 246, 0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        flexWrap: 'wrap'
      }}>
        <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'rgba(255, 255, 255, 0.9)' }}>
          🔍 Show:
        </span>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          fontSize: '0.9rem',
          color: 'rgba(255, 255, 255, 0.9)',
          padding: '8px 14px',
          background: filters.repository ? 'rgba(139, 92, 246, 0.3)' : 'rgba(0, 0, 0, 0.3)',
          borderRadius: '8px',
          border: `2px solid ${filters.repository ? 'rgba(139, 92, 246, 0.6)' : 'rgba(255, 255, 255, 0.2)'}`,
          transition: 'all 0.2s'
        }}>
          <input
            type="checkbox"
            checked={filters.repository}
            onChange={(e) => setFilters({ ...filters, repository: e.target.checked })}
            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
          />
          <span>📦 Repository</span>
        </label>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          fontSize: '0.9rem',
          color: 'rgba(255, 255, 255, 0.9)',
          padding: '8px 14px',
          background: filters.directory ? 'rgba(59, 130, 246, 0.3)' : 'rgba(0, 0, 0, 0.3)',
          borderRadius: '8px',
          border: `2px solid ${filters.directory ? 'rgba(59, 130, 246, 0.6)' : 'rgba(255, 255, 255, 0.2)'}`,
          transition: 'all 0.2s'
        }}>
          <input
            type="checkbox"
            checked={filters.directory}
            onChange={(e) => setFilters({ ...filters, directory: e.target.checked })}
            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
          />
          <span>📁 Directories</span>
        </label>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          fontSize: '0.9rem',
          color: 'rgba(255, 255, 255, 0.9)',
          padding: '8px 14px',
          background: filters.file ? 'rgba(16, 185, 129, 0.3)' : 'rgba(0, 0, 0, 0.3)',
          borderRadius: '8px',
          border: `2px solid ${filters.file ? 'rgba(16, 185, 129, 0.6)' : 'rgba(255, 255, 255, 0.2)'}`,
          transition: 'all 0.2s'
        }}>
          <input
            type="checkbox"
            checked={filters.file}
            onChange={(e) => setFilters({ ...filters, file: e.target.checked })}
            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
          />
          <span>📄 Files</span>
        </label>
      </div>

      <div style={{
        marginBottom: '24px',
        padding: '16px',
        background: 'rgba(59, 130, 246, 0.15)',
        borderRadius: '12px',
        border: '2px solid rgba(59, 130, 246, 0.3)',
        fontSize: '0.9rem',
        color: 'rgba(255, 255, 255, 0.9)',
        lineHeight: '1.6'
      }}>
        💡 <strong>Interactive Architecture:</strong> All components are listed below grouped by type. Click "Analyze Locally" on any component to get detailed AI insights about its purpose, responsibilities, and dependencies.
      </div>

      {/* Repository Section */}
      {filters.repository && structure.repository && (
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{
            fontSize: '1.3rem',
            fontWeight: '700',
            marginBottom: '16px',
            color: '#a78bfa',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span>📦</span> Repository
          </h3>
          {renderNodeCard(structure.repository, false)}
        </div>
      )}

      {/* Directories Section */}
      {filters.directory && structure.directories.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <button
            onClick={() => toggleNode('directories')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              background: 'rgba(59, 130, 246, 0.2)',
              border: '2px solid rgba(59, 130, 246, 0.4)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(59, 130, 246, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
            }}
          >
            <span style={{ fontSize: '1.5rem' }}>
              {expandedNodes.has('directories') ? '▼' : '▶'}
            </span>
            <h3 style={{
              fontSize: '1.3rem',
              fontWeight: '700',
              color: '#60a5fa',
              margin: 0
            }}>
              📁 Directories ({structure.directories.length})
            </h3>
          </button>
          {expandedNodes.has('directories') && (
            <div style={{ marginLeft: '24px' }}>
              {structure.directories.map((dir: any) => renderNodeCard(dir))}
            </div>
          )}
        </div>
      )}

      {/* Files Section */}
      {filters.file && structure.files.length > 0 && (
        <div>
          <button
            onClick={() => toggleNode('files')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              background: 'rgba(16, 185, 129, 0.2)',
              border: '2px solid rgba(16, 185, 129, 0.4)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(16, 185, 129, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)';
            }}
          >
            <span style={{ fontSize: '1.5rem' }}>
              {expandedNodes.has('files') ? '▼' : '▶'}
            </span>
            <h3 style={{
              fontSize: '1.3rem',
              fontWeight: '700',
              color: '#34d399',
              margin: 0
            }}>
              📄 Files ({structure.files.length})
            </h3>
          </button>
          {expandedNodes.has('files') && (
            <div style={{ marginLeft: '24px' }}>
              {structure.files.map((file: any) => renderNodeCard(file))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
