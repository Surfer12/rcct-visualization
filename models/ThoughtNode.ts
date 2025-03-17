/**
 * ThoughtNode.ts
 * Core data model for the Recursive Chain of Thought visualization framework
 */

export interface ThoughtNodeProps {
  id: string;
  content: string;
  type: ThoughtNodeType;
  subThoughts?: ThoughtNode[];
  aliasNode?: ThoughtNode;
  isomorphicRepresentations?: {
    computational?: any;
    cognitive?: any;
    representational?: any;
  };
  metadata?: {
    createdAt: Date;
    evaluationStatus: EvaluationStatus;
    recursionDepth: number;
    memoizationKey?: string;
  };
}

export enum ThoughtNodeType {
  QUESTION = 'question',
  HYPOTHESIS = 'hypothesis',
  EVALUATION = 'evaluation', 
  CONCLUSION = 'conclusion',
  META_REFLECTION = 'meta-reflection',
  RECURSIVE_REFERENCE = 'recursive-reference',
}

export enum EvaluationStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in-progress',
  COMPLETE = 'complete',
  ERROR = 'error',
  MEMOIZED = 'memoized'
}

export class ThoughtNode {
  id: string;
  content: string;
  type: ThoughtNodeType;
  subThoughts: ThoughtNode[];
  aliasNode?: ThoughtNode;
  isomorphicRepresentations: {
    computational?: any;
    cognitive?: any;
    representational?: any;
  };
  metadata: {
    createdAt: Date;
    evaluationStatus: EvaluationStatus;
    recursionDepth: number;
    memoizationKey?: string;
  };

  constructor(props: ThoughtNodeProps) {
    this.id = props.id;
    this.content = props.content;
    this.type = props.type;
    this.subThoughts = props.subThoughts || [];
    this.aliasNode = props.aliasNode;
    this.isomorphicRepresentations = props.isomorphicRepresentations || {};
    this.metadata = props.metadata || {
      createdAt: new Date(),
      evaluationStatus: EvaluationStatus.PENDING,
      recursionDepth: 0
    };
  }

  /**
   * Creates a self-referential thought node (recursive reference)
   */
  createSelfReference(): ThoughtNode {
    const selfRef = new ThoughtNode({
      id: `${this.id}-self-ref`,
      content: `Reference to ${this.content}`,
      type: ThoughtNodeType.RECURSIVE_REFERENCE,
      metadata: {
        ...this.metadata,
        recursionDepth: this.metadata.recursionDepth + 1
      }
    });
    selfRef.aliasNode = this;
    return selfRef;
  }

  /**
   * Adds a sub-thought to this thought node
   */
  addSubThought(subThought: ThoughtNode): ThoughtNode {
    this.subThoughts.push(subThought);
    return this;
  }

  /**
   * Updates the evaluation status of this thought node
   */
  updateEvaluationStatus(status: EvaluationStatus): ThoughtNode {
    this.metadata.evaluationStatus = status;
    return this;
  }

  /**
   * Creates an isomorphic representation of this thought in a different domain
   */
  createIsomorphicRepresentation(
    domain: 'computational' | 'cognitive' | 'representational',
    representation: any
  ): ThoughtNode {
    this.isomorphicRepresentations[domain] = representation;
    return this;
  }

  /**
   * Memoizes this thought node for future reference
   */
  memoize(key: string): ThoughtNode {
    this.metadata.memoizationKey = key;
    this.metadata.evaluationStatus = EvaluationStatus.MEMOIZED;
    return this;
  }
}

/**
 * Represents a step in the evaluation process
 */
export interface EvaluationStep {
  step: number;
  activeNodeId: string;
  modelState: ThoughtNode[];
  memoizationCache: Record<string, ThoughtNode>;
  timestamp: Date;
  operation: string;
}

/**
 * Represents a step in the domain translation process
 */
export interface TranslationStep {
  step: number;
  sourceContent: any;
  intermediateTransformation: any;
  result: any;
  appliedIsomorphism: string;
  description: string;
}

/**
 * Records user interactions with the visualization
 */
export interface UserInteraction {
  type: 'click' | 'hover' | 'expand' | 'collapse' | 'navigate';
  timestamp: number;
  focusedElementId?: string;
  exploredDepth?: number;
  duration?: number;
  sourcePosition?: { x: number, y: number };
  targetPosition?: { x: number, y: number };
}

/**
 * Represents insights generated from user interactions
 */
export interface MetaCognitiveInsight {
  type: string;
  insight: string;
  data: any;
  timestamp: Date;
  confidence: number;
  recommendations?: string[];
}