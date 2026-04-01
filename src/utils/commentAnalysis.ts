import { fetchNotesForMRs, FetchedMRNotes, getHumanNotes } from './notesFetcher';

interface CommentPattern {
  category: string;
  keywords: string[];
  principle: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export interface CommentAnalysisResult {
  totalComments: number;
  categorizedComments: {
    [category: string]: {
      count: number;
      percentage: number;
      examples: string[];
      principle: string;
      description: string;
      severity: 'low' | 'medium' | 'high';
    };
  };
  topIssues: Array<{
    category: string;
    count: number;
    percentage: number;
    principle: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  recommendations: Array<{
    principle: string;
    description: string;
    actionItems: string[];
    priority: 'high' | 'medium' | 'low';
  }>;
  overallScore: number;
}

const COMMENT_PATTERNS: CommentPattern[] = [
  {
    category: 'Code Quality',
    keywords: [
      'clean up', 'refactor', 'simplify', 'complex', 'readable', 'clarity',
      'naming', 'variable name', 'function name', 'method name', 'confusing',
      'unclear', 'hard to understand', 'magic number', 'constant', 'clean code',
      'improve', 'better', 'cleaner', 'optimize', 'enhancement'
    ],
    principle: 'Clean Code',
    description: 'Code should be readable, maintainable, and self-documenting',
    severity: 'medium',
  },
  {
    category: 'Testing',
    keywords: [
      'test', 'unit test', 'integration test', 'coverage', 'mock', 'stub',
      'test case', 'edge case', 'assertion', 'verify', 'validate', 'spec'
    ],
    principle: 'Test-Driven Development',
    description: 'Code should be thoroughly tested with appropriate test coverage',
    severity: 'high',
  },
  {
    category: 'Performance',
    keywords: [
      'performance', 'optimize', 'slow', 'inefficient', 'memory', 'leak',
      'algorithm', 'complexity', 'cache', 'database', 'query', 'n+1', 'bottleneck'
    ],
    principle: 'Performance Optimization',
    description: 'Code should be efficient and performant',
    severity: 'medium',
  },
  {
    category: 'Security',
    keywords: [
      'security', 'vulnerability', 'sanitize', 'validate', 'injection',
      'xss', 'csrf', 'authentication', 'authorization', 'encrypt', 'hash', 'secure'
    ],
    principle: 'Security Best Practices',
    description: 'Code should follow security best practices and be secure by design',
    severity: 'high',
  },
  {
    category: 'Error Handling',
    keywords: [
      'error', 'exception', 'try catch', 'handle', 'fail', 'graceful',
      'fallback', 'recovery', 'logging', 'debug', 'throw'
    ],
    principle: 'Robust Error Handling',
    description: 'Code should handle errors gracefully and provide meaningful feedback',
    severity: 'medium',
  },
  {
    category: 'Documentation',
    keywords: [
      'comment', 'documentation', 'doc', 'explain', 'document', 'readme',
      'jsdoc', 'javadoc', 'api doc', 'inline comment', 'describe'
    ],
    principle: 'Self-Documenting Code',
    description: 'Code should be well-documented and self-explanatory',
    severity: 'low',
  },
  {
    category: 'Architecture',
    keywords: [
      'architecture', 'design', 'pattern', 'solid', 'coupling', 'cohesion',
      'separation', 'responsibility', 'dependency', 'interface', 'abstraction'
    ],
    principle: 'SOLID Principles',
    description: 'Code should follow good architectural principles and design patterns',
    severity: 'high',
  },
  {
    category: 'Code Style',
    keywords: [
      'style', 'format', 'lint', 'prettier', 'indentation', 'spacing',
      'convention', 'consistent', 'formatting', 'eslint'
    ],
    principle: 'Consistent Code Style',
    description: 'Code should follow consistent styling and formatting conventions',
    severity: 'low',
  },
  {
    category: 'Logic Issues',
    keywords: [
      'logic', 'bug', 'incorrect', 'wrong', 'fix', 'issue', 'problem',
      'condition', 'if statement', 'loop', 'algorithm', 'broken'
    ],
    principle: 'Correctness',
    description: 'Code should be logically correct and free of bugs',
    severity: 'high',
  },
  {
    category: 'Best Practices',
    keywords: [
      'best practice', 'convention', 'standard', 'guideline', 'pattern',
      'anti-pattern', 'code smell', 'technical debt', 'improve', 'suggestion',
      'recommend', 'consider', 'should', 'could', 'might', 'perhaps'
    ],
    principle: 'Industry Best Practices',
    description: 'Code should follow established industry best practices and conventions',
    severity: 'medium',
  }
];

export function analyzeComments(comments: string[]): CommentAnalysisResult {
  if (comments.length === 0) {
    return {
      totalComments: 0,
      categorizedComments: {},
      topIssues: [],
      recommendations: [],
      overallScore: 100
    };
  }

  const categorizedComments: { [category: string]: any } = {};

  for (const pattern of COMMENT_PATTERNS) {
    categorizedComments[pattern.category] = {
      count: 0,
      percentage: 0,
      examples: [] as string[],
      principle: pattern.principle,
      description: pattern.description,
      severity: pattern.severity
    };
  }

  for (const comment of comments) {
    const lowerComment = comment.toLowerCase();

    for (const pattern of COMMENT_PATTERNS) {
      const matched = pattern.keywords.some(kw => lowerComment.includes(kw));
      if (matched) {
        categorizedComments[pattern.category].count++;
        if (categorizedComments[pattern.category].examples.length < 3) {
          categorizedComments[pattern.category].examples.push(
            comment.length > 100 ? comment.substring(0, 100) + '...' : comment
          );
        }
      }
    }
  }

  for (const key of Object.keys(categorizedComments)) {
    categorizedComments[key].percentage =
      (categorizedComments[key].count / comments.length) * 100;
  }

  const topIssues = Object.entries(categorizedComments)
    .filter(([_, data]: [string, any]) => data.count > 0)
    .map(([category, data]: [string, any]) => ({
      category,
      count: data.count,
      percentage: data.percentage,
      principle: data.principle,
      severity: data.severity
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const recommendations = generateRecommendations(topIssues);
  const overallScore = calculateOverallScore(topIssues, comments.length);

  return { totalComments: comments.length, categorizedComments, topIssues, recommendations, overallScore };
}

export function analyzeCommentsFromNotes(
  notesMap: Map<number, FetchedMRNotes>,
  mrIids: number[],
  authorUsername: string
): CommentAnalysisResult {
  const comments: string[] = [];

  for (const iid of mrIids) {
    const data = notesMap.get(iid);
    if (!data) continue;
    const human = getHumanNotes(data.notes, authorUsername);
    for (const note of human) {
      comments.push(note.body.trim());
    }
  }

  return analyzeComments(comments);
}

export async function fetchMRComments(
  token: string,
  projectId: string,
  mrIids: number[],
  authorUsername?: string
): Promise<string[]> {
  const notesMap = await fetchNotesForMRs(token, projectId, mrIids);
  const comments: string[] = [];

  for (const iid of mrIids) {
    const data = notesMap.get(iid);
    if (!data) continue;
    const human = getHumanNotes(data.notes, authorUsername);
    for (const note of human) {
      comments.push(note.body.trim());
    }
  }

  return comments;
}

function generateRecommendations(topIssues: any[]): Array<{
  principle: string;
  description: string;
  actionItems: string[];
  priority: 'high' | 'medium' | 'low';
}> {
  const recommendations: any[] = [];

  const ACTION_ITEMS: Record<string, string[]> = {
    'Code Quality': [
      'Review and refactor complex functions into smaller, focused methods',
      'Use meaningful variable and function names that express intent',
      'Extract magic numbers into named constants',
      'Apply the Boy Scout Rule: leave code cleaner than you found it'
    ],
    'Testing': [
      'Write unit tests for all new functions and methods',
      'Aim for at least 80% code coverage on critical paths',
      'Include edge cases and error scenarios in test suites',
      'Practice Test-Driven Development (TDD) for new features'
    ],
    'Performance': [
      'Profile code to identify actual bottlenecks before optimizing',
      'Implement caching strategies for expensive operations',
      'Review database queries for N+1 problems and optimization opportunities',
      'Consider algorithmic complexity when choosing data structures'
    ],
    'Security': [
      'Always validate and sanitize user input',
      'Use parameterized queries to prevent SQL injection',
      'Implement proper authentication and authorization checks',
      'Follow the principle of least privilege for access controls'
    ],
    'Error Handling': [
      'Implement comprehensive error handling for all external dependencies',
      'Provide meaningful error messages that help users understand issues',
      'Use proper logging levels and structured logging',
      'Design graceful degradation for non-critical failures'
    ],
    'Documentation': [
      'Write clear, concise comments that explain "why" not "what"',
      'Maintain up-to-date API documentation',
      'Include usage examples in documentation',
      'Document complex business logic and architectural decisions'
    ],
    'Architecture': [
      'Apply SOLID principles: Single Responsibility, Open/Closed, etc.',
      'Reduce coupling between modules and increase cohesion within modules',
      'Use dependency injection for better testability',
      'Consider design patterns that fit the problem domain'
    ],
    'Logic Issues': [
      'Double-check conditional logic and edge cases',
      'Use code reviews to catch logical errors early',
      'Write comprehensive tests to verify business logic',
      'Consider pair programming for complex algorithmic work'
    ],
    'Best Practices': [
      'Follow established coding standards and conventions',
      'Regularly refactor code to eliminate technical debt',
      'Stay updated with industry best practices',
      'Seek feedback from senior developers on code design'
    ],
    'Code Style': [
      'Follow established coding standards and conventions',
      'Use automated formatting tools like Prettier',
      'Ensure consistent indentation and spacing',
      'Document style decisions in a shared style guide'
    ],
  };

  for (const issue of topIssues) {
    const actionItems = ACTION_ITEMS[issue.category] || [
      'Review industry best practices for this area',
      'Seek feedback from senior developers',
      'Consider refactoring to improve code quality'
    ];

    recommendations.push({
      principle: issue.principle,
      description: COMMENT_PATTERNS.find(p => p.category === issue.category)?.description || '',
      actionItems,
      priority: issue.severity
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      principle: 'Continuous Improvement',
      description: 'Keep learning and improving your software engineering skills',
      actionItems: [
        'Regularly read code written by experienced developers',
        'Stay updated with industry best practices and new technologies',
        'Participate in code reviews both as author and reviewer',
        'Practice writing clean, maintainable code'
      ],
      priority: 'low'
    });
  }

  return recommendations;
}

function calculateOverallScore(topIssues: any[], totalComments: number): number {
  if (totalComments === 0) return 100;

  let penalty = 0;
  for (const issue of topIssues) {
    const weight = issue.severity === 'high' ? 3 : issue.severity === 'medium' ? 2 : 1;
    penalty += (issue.percentage * weight) / 100;
  }

  penalty = Math.min(penalty * 80, 80);
  return Math.max(20, 100 - penalty);
}
