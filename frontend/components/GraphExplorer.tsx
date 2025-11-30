'use client';

import { useEffect, useRef, useState } from 'react';

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

interface GraphExplorerProps {
  nodes: Node[];
  edges: Edge[];
  modelPath: string;
  jobId: string;
}

export default function GraphExplorer({ nodes, edges, modelPath, jobId }: GraphExplorerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [graphData, setGraphData] = useState<{ nodes: Node[], edges: Edge[] }>({ nodes: [], edges: [] });
  const [isDragging, setIsDragging] = useState(false);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [selectedNodeIndex, setSelectedNodeIndex] = useState(0);
  const [isHoveringCanvas, setIsHoveringCanvas] = useState(false);
  const [filters, setFilters] = useState({
    repository: true,
    directory: true,
    file: true,
    showEdges: true
  });
  const animationFrameId = useRef<number>();

  // Chain-of-Thought: Analyze repository structure and create logical layout
  useEffect(() => {
    if (!nodes || nodes.length === 0) return;

    console.log('🧠 CoT Step 1: Analyzing repository structure...');
    console.log('Total nodes:', nodes.length);
    console.log('Total edges:', edges.length);
    
    // Step 1: Categorize nodes by their role in the architecture
    const categorizedNodes = categorizeNodes(nodes, edges);
    console.log('📊 Categorized nodes:', categorizedNodes);

    // Step 2: Calculate hierarchical positions based on data flow
    const positionedNodes = calculateLogicalPositions(categorizedNodes, edges);
    console.log('📍 Positioned nodes:', positionedNodes.length);

    // Step 3: Apply force-directed adjustments for better spacing
    const finalNodes = applyForceDirectedLayout(positionedNodes, edges);
    console.log('✅ Final graph data ready');
    
    setGraphData({ nodes: finalNodes, edges });
  }, [nodes, edges]);

  // CoT Helper: Categorize nodes into architectural layers
  const categorizeNodes = (nodes: Node[], edges: Edge[]) => {
    const categories = {
      entry: [] as Node[],
      frontend: [] as Node[],
      backend: [] as Node[],
      services: [] as Node[],
      data: [] as Node[],
      utilities: [] as Node[],
      config: [] as Node[],
      tests: [] as Node[],
      other: [] as Node[]
    };

    nodes.forEach(node => {
      const label = node.label.toLowerCase();
      const path = node.id.toLowerCase();

      if (label.includes('main') || label.includes('index') || label === 'app' || 
          label.includes('__init__') || path.includes('entry')) {
        categories.entry.push(node);
      }
      else if (path.includes('frontend') || path.includes('components') || 
               path.includes('views') || path.includes('ui') || 
               label.includes('.tsx') || label.includes('.jsx') || label.includes('.vue')) {
        categories.frontend.push(node);
      }
      else if (path.includes('backend') || path.includes('api') || 
               path.includes('routes') || path.includes('controllers') ||
               label.includes('router') || label.includes('handler')) {
        categories.backend.push(node);
      }
      else if (path.includes('services') || path.includes('business') ||
               path.includes('logic') || label.includes('service')) {
        categories.services.push(node);
      }
      else if (path.includes('models') || path.includes('database') ||
               path.includes('schema') || path.includes('entities') ||
               label.includes('model') || label.includes('db')) {
        categories.data.push(node);
      }
      else if (path.includes('utils') || path.includes('helpers') ||
               path.includes('lib') || label.includes('util') || label.includes('helper')) {
        categories.utilities.push(node);
      }
      else if (label.includes('config') || label.includes('.json') ||
               label.includes('.yaml') || label.includes('.toml') ||
               label.includes('settings') || label.includes('.xml') || 
               label.includes('.properties')) {
        categories.config.push(node);
      }
      else if (path.includes('test') || path.includes('spec') ||
               label.includes('test_') || label.includes('.test.')) {
        categories.tests.push(node);
      }
      else {
        categories.other.push(node);
      }
    });

    return categories;
  };

  // CoT Helper: Calculate positions based on architectural flow
  const calculateLogicalPositions = (categories: any, edges: Edge[]) => {
    const positioned: Node[] = [];
    const canvasWidth = 1400;
    const canvasHeight = 900;
    const nodeSpacing = 100;

    // Define vertical layers (top to bottom flow)
    const layers = [
      { name: 'entry', y: 100 },
      { name: 'frontend', y: 250 },
      { name: 'backend', y: 400 },
      { name: 'services', y: 550 },
      { name: 'data', y: 700 }
    ];

    // Position utility/config/test nodes on the sides
    const sideCategories = [
      { name: 'config', x: 80, startY: 150 },
      { name: 'utilities', x: 1320, startY: 150 },
      { name: 'tests', x: 1320, startY: 500 }
    ];

    // Position main architectural layers
    layers.forEach((layer) => {
      const layerNodes = categories[layer.name];
      if (!layerNodes || layerNodes.length === 0) return;

      const totalWidth = Math.min((layerNodes.length - 1) * nodeSpacing, canvasWidth - 200);
      const startX = (canvasWidth - totalWidth) / 2;

      layerNodes.forEach((node: Node, index: number) => {
        positioned.push({
          ...node,
          x: startX + (index * nodeSpacing),
          y: layer.y,
          vx: 0,
          vy: 0
        });
      });
    });

    // Position side nodes
    sideCategories.forEach(category => {
      const categoryNodes = categories[category.name];
      if (!categoryNodes || categoryNodes.length === 0) return;

      categoryNodes.forEach((node: Node, index: number) => {
        positioned.push({
          ...node,
          x: category.x,
          y: category.startY + (index * 70),
          vx: 0,
          vy: 0
        });
      });
    });

    // Position "other" nodes in a grid at the bottom
    if (categories.other && categories.other.length > 0) {
      const cols = Math.ceil(Math.sqrt(categories.other.length));
      const spacing = Math.min(120, (canvasWidth - 200) / cols);
      const startX = 100;
      
      categories.other.forEach((node: Node, index: number) => {
        const row = Math.floor(index / cols);
        const col = index % cols;
        positioned.push({
          ...node,
          x: startX + (col * spacing),
          y: 780 + (row * 60),
          vx: 0,
          vy: 0
        });
      });
    }

    return positioned;
  };

  // CoT Helper: Apply force-directed adjustments for better spacing
  const applyForceDirectedLayout = (nodes: Node[], edges: Edge[]) => {
    const iterations = 30;
    const repulsionStrength = 2000;
    const attractionStrength = 0.005;
    const damping = 0.85;

    const simulatedNodes = nodes.map(n => ({ ...n }));

    for (let i = 0; i < iterations; i++) {
      // Repulsion between all nodes
      for (let j = 0; j < simulatedNodes.length; j++) {
        for (let k = j + 1; k < simulatedNodes.length; k++) {
          const n1 = simulatedNodes[j];
          const n2 = simulatedNodes[k];
          
          const dx = (n2.x || 0) - (n1.x || 0);
          const dy = (n2.y || 0) - (n1.y || 0);
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          
          if (distance < 120) {
            const force = repulsionStrength / (distance * distance);
            const fx = (dx / distance) * force;
            const fy = (dy / distance) * force;
            
            n1.vx = (n1.vx || 0) - fx * 0.05;
            n1.vy = (n1.vy || 0) - fy * 0.05;
            n2.vx = (n2.vx || 0) + fx * 0.05;
            n2.vy = (n2.vy || 0) + fy * 0.05;
          }
        }
      }

      // Attraction along edges
      edges.forEach(edge => {
        const from = simulatedNodes.find(n => n.id === edge.from);
        const to = simulatedNodes.find(n => n.id === edge.to);
        
        if (from && to) {
          const dx = (to.x || 0) - (from.x || 0);
          const dy = (to.y || 0) - (from.y || 0);
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          const force = distance * attractionStrength;
          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;
          
          from.vx = (from.vx || 0) + fx;
          from.vy = (from.vy || 0) + fy;
          to.vx = (to.vx || 0) - fx;
          to.vy = (to.vy || 0) - fy;
        }
      });

      // Update positions with damping
      simulatedNodes.forEach(node => {
        node.x = (node.x || 0) + (node.vx || 0);
        node.y = (node.y || 0) + (node.vy || 0);
        node.vx = (node.vx || 0) * damping;
        node.vy = (node.vy || 0) * damping;
        
        // Keep nodes within bounds
        node.x = Math.max(50, Math.min(1350, node.x || 0));
        node.y = Math.max(50, Math.min(850, node.y || 0));
      });
    }

    return simulatedNodes;
  };

  // Render the graph
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || graphData.nodes.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Apply filters to nodes and edges
      const filteredNodes = graphData.nodes.filter(node => {
        if (node.type === 'repository' && !filters.repository) return false;
        if (node.type === 'directory' && !filters.directory) return false;
        if (node.type === 'file' && !filters.file) return false;
        return true;
      });

      const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
      const filteredEdges = filters.showEdges 
        ? graphData.edges.filter(edge => filteredNodeIds.has(edge.from) && filteredNodeIds.has(edge.to))
        : [];
      
      // Apply zoom and offset
      ctx.save();
      ctx.translate(offset.x, offset.y);
      ctx.scale(zoom, zoom);

      // Draw edges first
      filteredEdges.forEach(edge => {
        const fromNode = graphData.nodes.find(n => n.id === edge.from);
        const toNode = graphData.nodes.find(n => n.id === edge.to);
        
        if (fromNode && toNode && fromNode.x && fromNode.y && toNode.x && toNode.y) {
          ctx.beginPath();
          ctx.moveTo(fromNode.x, fromNode.y);
          ctx.lineTo(toNode.x, toNode.y);
          ctx.strokeStyle = 'rgba(139, 92, 246, 0.25)';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Draw arrow
          const angle = Math.atan2(toNode.y - fromNode.y, toNode.x - fromNode.x);
          const arrowSize = 8;
          ctx.beginPath();
          ctx.moveTo(toNode.x - 25 * Math.cos(angle), toNode.y - 25 * Math.sin(angle));
          ctx.lineTo(
            toNode.x - (25 + arrowSize) * Math.cos(angle) - arrowSize * Math.sin(angle),
            toNode.y - (25 + arrowSize) * Math.sin(angle) + arrowSize * Math.cos(angle)
          );
          ctx.lineTo(
            toNode.x - (25 + arrowSize) * Math.cos(angle) + arrowSize * Math.sin(angle),
            toNode.y - (25 + arrowSize) * Math.sin(angle) - arrowSize * Math.cos(angle)
          );
          ctx.closePath();
          ctx.fillStyle = 'rgba(139, 92, 246, 0.4)';
          ctx.fill();
        }
      });

      // Draw nodes
      filteredNodes.forEach(node => {
        if (!node.x || !node.y) return;

        const isHovered = hoveredNode === node.id;
        const isSelected = selectedNode === node.id;
        const radius = 22;

        // Draw selection ring for selected node
        if (isSelected) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius + 8, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(236, 72, 153, 0.8)';
          ctx.lineWidth = 3;
          ctx.setLineDash([5, 5]);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Node circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        
        // Color based on type
        let color = 'rgba(139, 92, 246, 0.7)';
        if (node.type === 'file') color = 'rgba(16, 185, 129, 0.7)';
        if (node.type === 'directory') color = 'rgba(59, 130, 246, 0.7)';
        
        if (isHovered || isSelected) {
          color = color.replace('0.7', '1');
          ctx.shadowBlur = isSelected ? 20 : 15;
          ctx.shadowColor = isSelected ? 'rgba(236, 72, 153, 0.8)' : color;
        }
        
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = isSelected ? 'rgba(236, 72, 153, 1)' : 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = isHovered || isSelected ? 3 : 2;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Node label
        ctx.fillStyle = '#fff';
        ctx.font = isHovered || isSelected ? 'bold 12px sans-serif' : '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const displayLabel = node.label.length > 12 ? node.label.substring(0, 12) + '...' : node.label;
        
        // Add background to label for better readability
        if (isHovered || isSelected) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          const metrics = ctx.measureText(displayLabel);
          ctx.fillRect(node.x - metrics.width / 2 - 4, node.y - radius - 24, metrics.width + 8, 16);
        }
        
        ctx.fillStyle = '#fff';
        ctx.fillText(displayLabel, node.x, node.y - radius - 16);

        // Language badge
        if (node.language && (isHovered || isSelected)) {
          ctx.font = 'bold 9px sans-serif';
          ctx.fillStyle = 'rgba(236, 72, 153, 0.9)';
          ctx.fillText(node.language.toUpperCase(), node.x, node.y + radius + 12);
        }
      });

      ctx.restore();
      animationFrameId.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [graphData, hoveredNode, selectedNode, offset, zoom, filters]);

  // Mouse handlers with proper coordinate transformation
  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = ((e.clientX - rect.left) * scaleX - offset.x) / zoom;
    const y = ((e.clientY - rect.top) * scaleY - offset.y) / zoom;
    
    return { x, y };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Handle panning
    if (isPanning && !draggedNode) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setOffset({
        x: offset.x + dx,
        y: offset.y + dy
      });
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    const { x, y } = getCanvasCoordinates(e);

    // Handle node dragging
    if (isDragging && draggedNode) {
      const node = graphData.nodes.find(n => n.id === draggedNode);
      if (node) {
        node.x = x;
        node.y = y;
        setGraphData({ ...graphData });
      }
      return;
    }

    // Check for hover
    const hovered = graphData.nodes.find(node => {
      if (!node.x || !node.y) return false;
      const dx = x - node.x;
      const dy = y - node.y;
      return Math.sqrt(dx * dx + dy * dy) < 22;
    });

    setHoveredNode(hovered?.id || null);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoordinates(e);
    
    // Check if clicking on a node
    const clickedNode = graphData.nodes.find(node => {
      if (!node.x || !node.y) return false;
      const dx = x - node.x;
      const dy = y - node.y;
      return Math.sqrt(dx * dx + dy * dy) < 22;
    });

    if (clickedNode) {
      setIsDragging(true);
      setDraggedNode(clickedNode.id);
      setSelectedNode(clickedNode.id);
      const nodeIndex = graphData.nodes.findIndex(n => n.id === clickedNode.id);
      setSelectedNodeIndex(nodeIndex);
    } else {
      // Start panning if not clicking on a node
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDraggedNode(null);
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    // Disable scroll zoom - allow normal page scroll
    return;
  };

  const handleCanvasMouseEnter = () => {
    setIsHoveringCanvas(true);
  };

  const handleCanvasMouseLeave = () => {
    setIsHoveringCanvas(false);
    setIsDragging(false);
    setDraggedNode(null);
    setIsPanning(false);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (graphData.nodes.length === 0) return;
      
      let newIndex = selectedNodeIndex;
      
      switch(e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          newIndex = (selectedNodeIndex + 1) % graphData.nodes.length;
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          newIndex = (selectedNodeIndex - 1 + graphData.nodes.length) % graphData.nodes.length;
          break;
        default:
          return;
      }
      
      setSelectedNodeIndex(newIndex);
      setSelectedNode(graphData.nodes[newIndex]?.id || null);
      
      // Center view on selected node
      const node = graphData.nodes[newIndex];
      if (node && node.x && node.y) {
        const canvas = canvasRef.current;
        if (canvas) {
          setOffset({
            x: canvas.width / 2 - node.x * zoom,
            y: canvas.height / 2 - node.y * zoom
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeIndex, graphData, zoom]);

  // Zoom controls
  const handleZoomIn = () => {
    const newZoom = Math.min(3, zoom * 1.2);
    setZoom(newZoom);
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(0.3, zoom * 0.8);
    setZoom(newZoom);
  };

  const handleResetView = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const selectedNodeData = selectedNode ? graphData.nodes.find(n => n.id === selectedNode) : null;

  if (graphData.nodes.length === 0) {
    return (
      <div style={{
        background: 'rgba(0, 0, 0, 0.3)',
        borderRadius: '20px',
        padding: '32px',
        border: '2px solid rgba(139, 92, 246, 0.3)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🔄</div>
        <div style={{ fontSize: '1.2rem', color: 'rgba(255, 255, 255, 0.8)' }}>
          Analyzing repository structure...
        </div>
        <div style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.5)', marginTop: '8px' }}>
          Building logical architecture graph
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: 'rgba(0, 0, 0, 0.3)',
      borderRadius: '20px',
      padding: '32px',
      border: '2px solid rgba(139, 92, 246, 0.3)',
      position: 'relative'
    }}>
      {/* Filter Controls */}
      <div style={{
        marginBottom: '16px',
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
        <div style={{
          width: '2px',
          height: '32px',
          background: 'rgba(255, 255, 255, 0.2)',
          margin: '0 8px'
        }} />
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          fontSize: '0.9rem',
          color: 'rgba(255, 255, 255, 0.9)',
          padding: '8px 14px',
          background: filters.showEdges ? 'rgba(236, 72, 153, 0.3)' : 'rgba(0, 0, 0, 0.3)',
          borderRadius: '8px',
          border: `2px solid ${filters.showEdges ? 'rgba(236, 72, 153, 0.6)' : 'rgba(255, 255, 255, 0.2)'}`,
          transition: 'all 0.2s'
        }}>
          <input
            type="checkbox"
            checked={filters.showEdges}
            onChange={(e) => setFilters({ ...filters, showEdges: e.target.checked })}
            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
          />
          <span>🔗 Connections</span>
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
        🗺️ <strong>Interactive Graph:</strong> This diagram shows the logical flow of your repository. 
        <strong>Left-click + drag</strong> nodes to move • <strong>Right-click + drag</strong> or <strong>Space + drag</strong> to pan • 
        <strong>Use +/− buttons</strong> to zoom • <strong>Arrow keys</strong> to navigate • <strong>Click</strong> to select
      </div>

      {/* Canvas Container with Zoom Controls */}
      <div style={{ position: 'relative' }}>
        {/* Zoom Controls - Inside canvas area */}
        <div style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          zIndex: 10
        }}>
          <button
            onClick={handleZoomIn}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              border: '2px solid rgba(139, 92, 246, 0.6)',
              background: 'rgba(0, 0, 0, 0.8)',
              backdropFilter: 'blur(10px)',
              color: '#fff',
              fontSize: '1.5rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(139, 92, 246, 0.6)';
              e.currentTarget.style.transform = 'scale(1.1)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(139, 92, 246, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.8)';
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.4)';
            }}
            title="Zoom In (Use + button)"
          >
            +
          </button>
          <button
            onClick={handleZoomOut}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              border: '2px solid rgba(139, 92, 246, 0.6)',
              background: 'rgba(0, 0, 0, 0.8)',
              backdropFilter: 'blur(10px)',
              color: '#fff',
              fontSize: '1.8rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(139, 92, 246, 0.6)';
              e.currentTarget.style.transform = 'scale(1.1)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(139, 92, 246, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.8)';
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.4)';
            }}
            title="Zoom Out (Use − button)"
          >
            −
          </button>
          <button
            onClick={handleResetView}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              border: '2px solid rgba(139, 92, 246, 0.6)',
              background: 'rgba(0, 0, 0, 0.8)',
              backdropFilter: 'blur(10px)',
              color: '#fff',
              fontSize: '1.3rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(139, 92, 246, 0.6)';
              e.currentTarget.style.transform = 'scale(1.1)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(139, 92, 246, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.8)';
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.4)';
            }}
            title="Reset View (100%)"
          >
            ⟲
          </button>
          <div style={{
            padding: '8px 6px',
            borderRadius: '10px',
            border: '2px solid rgba(139, 92, 246, 0.6)',
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(10px)',
            color: '#a78bfa',
            fontSize: '0.8rem',
            textAlign: 'center',
            fontWeight: 'bold',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
            minWidth: '44px'
          }}>
            {Math.round(zoom * 100)}%
          </div>
        </div>

        <canvas
          ref={canvasRef}
          width={1400}
          height={900}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseEnter={handleCanvasMouseEnter}
          onMouseLeave={handleCanvasMouseLeave}
          onWheel={handleWheel}
          style={{
            width: '100%',
            height: 'auto',
            border: '2px solid rgba(139, 92, 246, 0.4)',
            borderRadius: '12px',
            cursor: isPanning ? 'grabbing' : isDragging ? 'grabbing' : hoveredNode ? 'pointer' : 'grab',
            background: 'rgba(0, 0, 0, 0.2)',
            touchAction: 'none',
            display: 'block'
          }}
        />
      </div>

      {/* Legend */}
      <div style={{
        marginTop: '24px',
        display: 'flex',
        gap: '24px',
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            background: 'rgba(139, 92, 246, 0.7)',
            border: '2px solid rgba(255, 255, 255, 0.9)'
          }} />
          <span style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.8)' }}>Repository</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            background: 'rgba(59, 130, 246, 0.7)',
            border: '2px solid rgba(255, 255, 255, 0.9)'
          }} />
          <span style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.8)' }}>Directory</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            background: 'rgba(16, 185, 129, 0.7)',
            border: '2px solid rgba(255, 255, 255, 0.9)'
          }} />
          <span style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.8)' }}>File</span>
        </div>
      </div>

      {/* Selected Node Info */}
      {selectedNodeData && (
        <div style={{
          marginTop: '24px',
          padding: '20px',
          background: 'rgba(139, 92, 246, 0.15)',
          border: '2px solid rgba(139, 92, 246, 0.4)',
          borderRadius: '12px'
        }}>
          <h4 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '12px', color: '#a78bfa' }}>
            📍 {selectedNodeData.label}
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '0.9rem' }}>
            <div>
              <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Type:</span>{' '}
              <span style={{ color: '#fff', fontWeight: '600' }}>{selectedNodeData.type}</span>
            </div>
            {selectedNodeData.language && (
              <div>
                <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Language:</span>{' '}
                <span style={{ color: '#fff', fontWeight: '600' }}>{selectedNodeData.language}</span>
              </div>
            )}
            {selectedNodeData.size && (
              <div>
                <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Size:</span>{' '}
                <span style={{ color: '#fff', fontWeight: '600' }}>{(selectedNodeData.size / 1024).toFixed(2)} KB</span>
              </div>
            )}
            {selectedNodeData.dependencies && selectedNodeData.dependencies.length > 0 && (
              <div>
                <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Dependencies:</span>{' '}
                <span style={{ color: '#fff', fontWeight: '600' }}>{selectedNodeData.dependencies.length}</span>
              </div>
            )}
          </div>
          {selectedNodeData.description && (
            <div style={{ marginTop: '12px', fontSize: '0.9rem', fontStyle: 'italic', color: 'rgba(255, 255, 255, 0.8)' }}>
              {selectedNodeData.description}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
