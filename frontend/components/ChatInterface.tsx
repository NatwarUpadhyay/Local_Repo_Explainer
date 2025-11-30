'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatInterfaceProps {
  jobId: string;
  repoData: any;
  modelId: string;
  modelPath: string;
}

export default function ChatInterface({ jobId, repoData, modelId, modelPath }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "👋 Hi! I've analyzed this repository. Ask me anything about the code, architecture, dependencies, or implementation details!",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sanitiseText = (value?: string, limit = 1200) => {
    if (!value) return '';
    const trimmed = value.trim();
    return trimmed.length > limit ? `${trimmed.slice(0, limit)}...` : trimmed;
  };

  const buildContextPayload = () => {
    if (!repoData?.result) {
      return `Repository: ${repoData?.repo_url || 'Local Upload'}`;
    }

    const { result } = repoData;
    const languages = Array.from(
      new Set(
        (result.nodes || [])
          .map((node: any) => node.language)
          .filter((lang?: string) => Boolean(lang))
      )
    ) as string[];

    const describedNodes = (result.nodes || [])
      .filter((node: any) => node.description)
      .slice(0, 5)
      .map(
        (node: any) =>
          `${node.label || node.id}: ${sanitiseText(node.description, 300)}`
      );

    const sections = [
      `Repository: ${repoData.repo_url || 'Local Upload'}`,
      `Files analyzed: ${result.files_analyzed ?? result.nodes?.length ?? 0}`,
      languages.length ? `Languages detected: ${languages.join(', ')}` : null,
      sanitiseText(result.overview)
        ? `Overview:\n${sanitiseText(result.overview)}`
        : null,
      sanitiseText(result.vulnerability_analysis)
        ? `Security notes:\n${sanitiseText(result.vulnerability_analysis)}`
        : null,
      describedNodes.length
        ? `Key components:\n- ${describedNodes.join('\n- ')}`
        : null,
    ];

    return sections.filter(Boolean).join('\n\n');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      // Build rich context from repo insights
      const context = buildContextPayload();

      const response = await fetch(`${apiUrl}/api/v1/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: jobId,
          message: input,
          context: context,
          model_id: modelId,
          model_path: modelPath
        })
      });

      if (!response.ok) {
        throw new Error('Chat request failed');
      }

      const data = await response.json();
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response || 'Sorry, I could not generate a response.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        role: 'assistant',
        content: '⚠️ Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestedQuestions = [
    "What is the main purpose of this repository?",
    "Explain the architecture and key components",
    "What dependencies are used and why?",
    "Are there any potential issues or improvements?",
    "How is the code organized?"
  ];

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.04)',
      backdropFilter: 'blur(30px)',
      borderRadius: '28px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      overflow: 'hidden',
      boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      marginTop: '40px'
    }}>
      {/* Header */}
      <div style={{
        padding: '24px 32px',
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(59, 130, 246, 0.2))',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '2rem' }}>💬</span>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '4px' }}>
              Chat with Your Repository
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.6)' }}>
              Ask questions about the analyzed codebase
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            padding: '8px 16px',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '600',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
          onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
        >
          {isCollapsed ? 'Expand' : 'Collapse'}
        </button>
      </div>

      {!isCollapsed && (
        <>
          {/* Messages */}
          <div style={{
            padding: '24px 32px',
            maxHeight: '500px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {messages.map((message, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                  animation: 'fadeIn 0.3s ease-in'
                }}
              >
                <div style={{
                  maxWidth: '75%',
                  padding: '16px 20px',
                  borderRadius: '16px',
                  background: message.role === 'user' 
                    ? 'linear-gradient(135deg, #8b5cf6, #6366f1)'
                    : 'rgba(255, 255, 255, 0.08)',
                  border: message.role === 'user' 
                    ? 'none'
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#fff',
                  fontSize: '0.9375rem',
                  lineHeight: '1.6',
                  boxShadow: message.role === 'user'
                    ? '0 4px 20px rgba(139, 92, 246, 0.3)'
                    : 'none'
                }}>
                  <div style={{ marginBottom: '8px' }}>
                    {message.content}
                  </div>
                  <div style={{ 
                    fontSize: '0.75rem', 
                    color: message.role === 'user' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.5)',
                    textAlign: 'right'
                  }}>
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{
                  padding: '16px 20px',
                  borderRadius: '16px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#a78bfa',
                  fontSize: '0.9375rem'
                }}>
                  <span style={{ animation: 'pulse 1.5s ease-in-out infinite' }}>Thinking...</span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Questions */}
          {messages.length === 1 && (
            <div style={{
              padding: '0 32px 16px 32px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px'
            }}>
              {suggestedQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => setInput(question)}
                  style={{
                    background: 'rgba(139, 92, 246, 0.1)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    borderRadius: '20px',
                    padding: '8px 16px',
                    color: '#c4b5fd',
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontWeight: '500'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = 'rgba(139, 92, 246, 0.2)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'rgba(139, 92, 246, 0.1)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {question}
                </button>
              ))}
            </div>
          )}

          {/* Input Form */}
          <form onSubmit={handleSubmit} style={{
            padding: '24px 32px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about the codebase..."
                disabled={isLoading}
                style={{
                  flex: 1,
                  padding: '14px 20px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '2px solid rgba(139, 92, 246, 0.3)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '0.9375rem',
                  outline: 'none',
                  transition: 'all 0.2s'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.6)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)'}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                style={{
                  padding: '14px 28px',
                  background: input.trim() && !isLoading
                    ? 'linear-gradient(135deg, #8b5cf6, #6366f1)'
                    : 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '0.9375rem',
                  fontWeight: 'bold',
                  cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
                  transition: 'all 0.3s',
                  boxShadow: input.trim() && !isLoading
                    ? '0 4px 20px rgba(139, 92, 246, 0.4)'
                    : 'none'
                }}
                onMouseOver={(e) => {
                  if (input.trim() && !isLoading) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 30px rgba(139, 92, 246, 0.5)';
                  }
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  if (input.trim() && !isLoading) {
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(139, 92, 246, 0.4)';
                  }
                }}
              >
                {isLoading ? '...' : 'Send'}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
