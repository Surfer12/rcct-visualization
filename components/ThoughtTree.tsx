/**
 * ThoughtTree.tsx
 * Hierarchical visualization of thought structures using D3's force-directed graph
 */

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { ThoughtNode, ThoughtNodeType, EvaluationStatus } from '../models/ThoughtNode';

interface ThoughtTreeProps {
  rootThoughts: ThoughtNode[];
  maxVisibleDepth?: number;
  highlightedNodeId?: string;
  onNodeClick?: (node: ThoughtNode) => void;
  onNodeHover?: (node: ThoughtNode | null) => void;
  width?: number;
  height?: number;
}

interface D3Node {
  id: string;
  reflexive: boolean;
  type: ThoughtNodeType;
  content: string;
  status: EvaluationStatus;
  recursionDepth: number;
  x?: number;
  y?: number;
  originalNode: ThoughtNode;
}

interface D3Link {
  source: D3Node;
  target: D3Node;
  isAlias: boolean;
}

const NODE_COLORS = {
  [ThoughtNodeType.QUESTION]: '#4285F4',
  [ThoughtNodeType.HYPOTHESIS]: '#0F9D58',
  [ThoughtNodeType.EVALUATION]: '#F4B400',
  [ThoughtNodeType.CONCLUSION]: '#DB4437',
  [ThoughtNodeType.META_REFLECTION]: '#9C27B0',
  [ThoughtNodeType.RECURSIVE_REFERENCE]: '#673AB7',
};

export const ThoughtTree: React.FC<ThoughtTreeProps> = ({
  rootThoughts,
  maxVisibleDepth = 5,
  highlightedNodeId,
  onNodeClick,
  onNodeHover,
  width = 800,
  height = 600,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [nodes, setNodes] = useState<D3Node[]>([]);
  const [links, setLinks] = useState<D3Link[]>([]);
  
  // Transform ThoughtNode tree into D3 compatible nodes and links
  useEffect(() => {
    const d3Nodes: D3Node[] = [];
    const d3Links: D3Link[] = [];
    
    const processNode = (node: ThoughtNode, depth: number = 0) => {
      if (depth > maxVisibleDepth) return;
      
      const d3Node: D3Node = {
        id: node.id,
        reflexive: !!node.aliasNode,
        type: node.type,
        content: node.content,
        status: node.metadata.evaluationStatus,
        recursionDepth: node.metadata.recursionDepth,
        originalNode: node,
      };
      
      d3Nodes.push(d3Node);
      
      // Process sub-thoughts
      node.subThoughts.forEach(subThought => {
        const subNode = processNode(subThought, depth + 1);
        if (subNode) {
          d3Links.push({
            source: d3Node,
            target: subNode,
            isAlias: false,
          });
        }
      });
      
      // Process alias node if present and not creating a circular reference
      if (node.aliasNode && !d3Links.some(
        link => 
          (link.source.id === node.id && link.target.id === node.aliasNode!.id) || 
          (link.target.id === node.id && link.source.id === node.aliasNode!.id)
      )) {
        const aliasD3Node = d3Nodes.find(n => n.id === node.aliasNode!.id) || 
                           processNode(node.aliasNode, depth);
        
        if (aliasD3Node) {
          d3Links.push({
            source: d3Node,
            target: aliasD3Node,
            isAlias: true,
          });
        }
      }
      
      return d3Node;
    };
    
    rootThoughts.forEach(rootThought => processNode(rootThought));
    
    setNodes(d3Nodes);
    setLinks(d3Links);
  }, [rootThoughts, maxVisibleDepth]);
  
  // Setup and update D3 visualization
  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;
    
    // Clear previous visualization
    d3.select(svgRef.current).selectAll('*').remove();
    
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);
    
    // Add zoom functionality
    const g = svg.append('g');
    svg.call(
      d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 4])
        .on('zoom', (event) => {
          g.attr('transform', event.transform);
        })
    );
    
    // Define arrow markers for links
    svg.append('defs').selectAll('marker')
      .data(['standard', 'alias'])
      .enter().append('marker')
      .attr('id', d => `arrow-${d}`)
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 15)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', d => d === 'alias' ? '#9C27B0' : '#999');
    
    // Create links
    const link = g.selectAll('.link')
      .data(links)
      .enter().append('path')
      .attr('class', 'link')
      .attr('stroke', d => d.isAlias ? '#9C27B0' : '#999')
      .attr('stroke-width', d => d.isAlias ? 2 : 1)
      .attr('stroke-dasharray', d => d.isAlias ? '5,5' : null)
      .attr('marker-end', d => `url(#arrow-${d.isAlias ? 'alias' : 'standard'})`);
    
    // Create nodes
    const node = g.selectAll('.node')
      .data(nodes)
      .enter().append('g')
      .attr('class', 'node')
      .on('click', (event, d) => {
        event.stopPropagation();
        onNodeClick?.(d.originalNode);
      })
      .on('mouseover', (event, d) => {
        onNodeHover?.(d.originalNode);
      })
      .on('mouseout', () => {
        onNodeHover?.(null);
      })
      .call(
        d3.drag<SVGGElement, D3Node>()
          .on('start', dragStarted)
          .on('drag', dragged)
          .on('end', dragEnded)
      );
    
    // Node circles
    node.append('circle')
      .attr('r', d => 10 + (d.recursionDepth * 2))
      .attr('fill', d => NODE_COLORS[d.type])
      .attr('stroke', d => d.id === highlightedNodeId ? '#FFD700' : '#fff')
      .attr('stroke-width', d => d.id === highlightedNodeId ? 3 : 1.5)
      .attr('opacity', d => d.status === EvaluationStatus.MEMOIZED ? 0.7 : 1);
    
    // Node labels
    node.append('text')
      .attr('dy', 4)
      .attr('text-anchor', 'middle')
      .text(d => d.content.length > 20 ? `${d.content.substring(0, 17)}...` : d.content)
      .attr('font-size', 10)
      .attr('fill', '#fff');
    
    // Status indicators
    node.filter(d => d.status !== EvaluationStatus.PENDING)
      .append('circle')
      .attr('r', 4)
      .attr('cx', d => 10 + (d.recursionDepth * 2))
      .attr('cy', d => 10 + (d.recursionDepth * 2))
      .attr('fill', d => {
        switch (d.status) {
          case EvaluationStatus.COMPLETE: return '#0F9D58';
          case EvaluationStatus.IN_PROGRESS: return '#F4B400';
          case EvaluationStatus.ERROR: return '#DB4437';
          case EvaluationStatus.MEMOIZED: return '#9C27B0';
          default: return '#999';
        }
      });
    
    // Add tooltips
    node.append('title')
      .text(d => `${d.content}\nType: ${d.type}\nStatus: ${d.status}\nDepth: ${d.recursionDepth}`);
    
    // Force simulation
    const simulation = d3.forceSimulation<D3Node, D3Link>(nodes)
      .force('link', d3.forceLink<D3Node, D3Link>(links).id(d => d.id).distance(150))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(d => 20 + (d.recursionDepth * 2)))
      .on('tick', ticked);
    
    function ticked() {
      link.attr('d', d => {
        const dx = d.target.x! - d.source.x!;
        const dy = d.target.y! - d.source.y!;
        const dr = Math.sqrt(dx * dx + dy * dy);
        // Draw curved lines for aliases, straight for regular links
        return d.isAlias 
          ? `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`
          : `M${d.source.x},${d.source.y}L${d.target.x},${d.target.y}`;
      });
      
      node.attr('transform', d => `translate(${d.x},${d.y})`);
    }
    
    function dragStarted(event: d3.D3DragEvent<SVGGElement, D3Node, D3Node>) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }
    
    function dragged(event: d3.D3DragEvent<SVGGElement, D3Node, D3Node>) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }
    
    function dragEnded(event: d3.D3DragEvent<SVGGElement, D3Node, D3Node>) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }
    
    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [nodes, links, width, height, highlightedNodeId, onNodeClick, onNodeHover]);
  
  return (
    <div className="thought-tree-container" style={{ width, height }}>
      <svg ref={svgRef} className="thought-tree-svg" />
    </div>
  );
};