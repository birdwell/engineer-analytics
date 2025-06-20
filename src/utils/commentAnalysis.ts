interface CommentPattern {
  category: string;
  keywords: string[];
  principle: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  examples: string[];
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
  overallScore: number; // 0-100, higher is better
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
    examples: ['Consider renaming this variable', 'This function is too complex', 'Extract this into a constant']
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
    examples: ['Add unit tests for this function', 'Missing test coverage', 'Consider edge cases']
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
    examples: ['This could be optimized', 'Consider caching this result', 'Potential N+1 query issue']
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
    examples: ['Validate user input', 'Potential security vulnerability', 'Use proper authentication']
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
    examples: ['Add error handling', 'Catch this exception', 'Improve error messages']
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
    examples: ['Add comments to explain this', 'Update documentation', 'Missing API documentation']
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
    examples: ['Violates single responsibility', 'High coupling detected', 'Consider using dependency injection']
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
    examples: ['Fix formatting', 'Follow style guide', 'Inconsistent indentation']
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
    examples: ['Logic error in condition', 'This will cause a bug', 'Incorrect algorithm implementation']
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
    examples: ['Follow best practices', 'This is an anti-pattern', 'Consider refactoring this code smell']
  }
];

export function analyzeComments(comments: string[]): CommentAnalysisResult {
  console.log(`Analyzing ${comments.length} comments for software engineering insights...`);
  
  if (comments.length === 0) {
    console.log('No comments to analyze');
    return {
      totalComments: 0,
      categorizedComments: {},
      topIssues: [],
      recommendations: [],
      overallScore: 100
    };
  }

  const categorizedComments: { [category: string]: any } = {};
  
  // Initialize categories
  COMMENT_PATTERNS.forEach(pattern => {
    categorizedComments[pattern.category] = {
      count: 0,
      percentage: 0,
      examples: [],
      principle: pattern.principle,
      description: pattern.description,
      severity: pattern.severity
    };
  });

  // Analyze each comment
  let totalMatches = 0;
  comments.forEach((comment, index) => {
    const lowerComment = comment.toLowerCase();
    let commentMatched = false;
    
    COMMENT_PATTERNS.forEach(pattern => {
      const matchedKeywords = pattern.keywords.filter(keyword => 
        lowerComment.includes(keyword.toLowerCase())
      );
      
      if (matchedKeywords.length > 0) {
        categorizedComments[pattern.category].count++;
        if (categorizedComments[pattern.category].examples.length < 3) {
          categorizedComments[pattern.category].examples.push(
            comment.length > 100 ? comment.substring(0, 100) + '...' : comment
          );
        }
        if (!commentMatched) {
          totalMatches++;
          commentMatched = true;
        }
        console.log(`Comment ${index + 1} matched ${pattern.category} with keywords: ${matchedKeywords.join(', ')}`);
      }
    });
    
    if (!commentMatched) {
      console.log(`Comment ${index + 1} didn't match any patterns: "${comment.substring(0, 50)}..."`);
    }
  });

  console.log(`Total comments that matched patterns: ${totalMatches}/${comments.length}`);

  // Calculate percentages
  Object.keys(categorizedComments).forEach(category => {
    categorizedComments[category].percentage = 
      (categorizedComments[category].count / comments.length) * 100;
  });

  // Get top issues (categories with most comments)
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

  console.log(`Top issues found:`, topIssues.map(issue => `${issue.category}: ${issue.count} comments`));

  // Generate recommendations
  const recommendations = generateRecommendations(topIssues);

  // Calculate overall score (100 - weighted penalty for issues)
  const overallScore = calculateOverallScore(topIssues, comments.length);

  console.log(`Analysis complete: ${topIssues.length} issue categories, overall score: ${overallScore}`);

  return {
    totalComments: comments.length,
    categorizedComments,
    topIssues,
    recommendations,
    overallScore
  };
}

function generateRecommendations(topIssues: any[]): Array<{
  principle: string;
  description: string;
  actionItems: string[];
  priority: 'high' | 'medium' | 'low';
}> {
  const recommendations: any[] = [];

  topIssues.forEach(issue => {
    let actionItems: string[] = [];
    let priority: 'high' | 'medium' | 'low' = issue.severity;

    switch (issue.category) {
      case 'Code Quality':
        actionItems = [
          'Review and refactor complex functions into smaller, focused methods',
          'Use meaningful variable and function names that express intent',
          'Extract magic numbers into named constants',
          'Apply the Boy Scout Rule: leave code cleaner than you found it'
        ];
        break;
      case 'Testing':
        actionItems = [
          'Write unit tests for all new functions and methods',
          'Aim for at least 80% code coverage on critical paths',
          'Include edge cases and error scenarios in test suites',
          'Practice Test-Driven Development (TDD) for new features'
        ];
        break;
      case 'Performance':
        actionItems = [
          'Profile code to identify actual bottlenecks before optimizing',
          'Implement caching strategies for expensive operations',
          'Review database queries for N+1 problems and optimization opportunities',
          'Consider algorithmic complexity when choosing data structures'
        ];
        break;
      case 'Security':
        actionItems = [
          'Always validate and sanitize user input',
          'Use parameterized queries to prevent SQL injection',
          'Implement proper authentication and authorization checks',
          'Follow the principle of least privilege for access controls'
        ];
        break;
      case 'Error Handling':
        actionItems = [
          'Implement comprehensive error handling for all external dependencies',
          'Provide meaningful error messages that help users understand issues',
          'Use proper logging levels and structured logging',
          'Design graceful degradation for non-critical failures'
        ];
        break;
      case 'Documentation':
        actionItems = [
          'Write clear, concise comments that explain "why" not "what"',
          'Maintain up-to-date API documentation',
          'Include usage examples in documentation',
          'Document complex business logic and architectural decisions'
        ];
        break;
      case 'Architecture':
        actionItems = [
          'Apply SOLID principles: Single Responsibility, Open/Closed, etc.',
          'Reduce coupling between modules and increase cohesion within modules',
          'Use dependency injection for better testability',
          'Consider design patterns that fit the problem domain'
        ];
        break;
      case 'Logic Issues':
        actionItems = [
          'Double-check conditional logic and edge cases',
          'Use code reviews to catch logical errors early',
          'Write comprehensive tests to verify business logic',
          'Consider pair programming for complex algorithmic work'
        ];
        break;
      case 'Best Practices':
        actionItems = [
          'Follow established coding standards and conventions',
          'Regularly refactor code to eliminate technical debt',
          'Stay updated with industry best practices',
          'Seek feedback from senior developers on code design'
        ];
        break;
      default:
        actionItems = [
          'Review industry best practices for this area',
          'Seek feedback from senior developers',
          'Consider refactoring to improve code quality'
        ];
    }

    recommendations.push({
      principle: issue.principle,
      description: COMMENT_PATTERNS.find(p => p.category === issue.category)?.description || '',
      actionItems,
      priority
    });
  });

  // Add general recommendations if no specific issues found
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
      priority: 'low' as const
    });
  }

  return recommendations;
}

function calculateOverallScore(topIssues: any[], totalComments: number): number {
  if (totalComments === 0) return 100;

  let penalty = 0;
  
  topIssues.forEach(issue => {
    const weight = issue.severity === 'high' ? 3 : issue.severity === 'medium' ? 2 : 1;
    penalty += (issue.percentage * weight) / 100;
  });

  // Cap penalty at 80 points max
  penalty = Math.min(penalty * 80, 80);
  
  return Math.max(20, 100 - penalty);
}

export async function fetchMRComments(
  token: string,
  projectId: string,
  mrIids: number[],
  authorUsername?: string
): Promise<string[]> {
  const comments: string[] = [];
  const API_BASE = 'https://gitlab.com/api/v4';
  
  console.log(`Fetching comments from ${mrIids.length} MRs for analysis...`);
  console.log(`Author to exclude: ${authorUsername || 'none'}`);
  
  // Process in smaller batches to avoid overwhelming the API
  const batchSize = 2; // Reduced batch size for more reliable processing
  
  for (let i = 0; i < mrIids.length; i += batchSize) {
    const batch = mrIids.slice(i, i + batchSize);
    console.log(`Processing MR batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(mrIids.length/batchSize)}: MRs ${batch.join(', ')}`);
    
    const batchPromises = batch.map(async (mrIid) => {
      try {
        const response = await fetch(
          `${API_BASE}/projects/${encodeURIComponent(projectId)}/merge_requests/${mrIid}/notes?per_page=100&sort=asc`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(15000) // Increased timeout
          }
        );

        if (response.ok) {
          const notes = await response.json();
          console.log(`  MR ${mrIid}: Found ${notes.length} total notes`);
          
          // Log some sample notes for debugging
          if (notes.length > 0) {
            console.log(`  MR ${mrIid}: Sample note authors:`, notes.slice(0, 3).map((n: any) => n.author.username));
          }
          
          const reviewComments = notes
            .filter((note: any) => {
              // Must not be a system note
              if (note.system) {
                return false;
              }
              
              // Must not be from the author (if specified)
              if (authorUsername && note.author.username === authorUsername) {
                return false;
              }
              
              // Must have meaningful content (reduced minimum length)
              if (note.body.trim().length < 3) {
                return false;
              }
              
              // Filter out automated comments (but be less aggressive)
              if (isStrictlyAutomatedComment(note.body)) {
                return false;
              }
              
              return true;
            })
            .map((note: any) => note.body.trim());
          
          console.log(`  MR ${mrIid}: Filtered to ${reviewComments.length} review comments`);
          
          // Log sample comments for debugging
          if (reviewComments.length > 0) {
            console.log(`  MR ${mrIid}: Sample comments:`, reviewComments.slice(0, 2).map(c => c.substring(0, 50) + '...'));
          }
          
          return reviewComments;
        } else {
          console.warn(`Failed to fetch notes for MR ${mrIid}: ${response.status}`);
          return [];
        }
      } catch (error) {
        console.warn(`Failed to fetch comments for MR ${mrIid}:`, error);
        return [];
      }
    });

    const batchResults = await Promise.allSettled(batchPromises);
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        comments.push(...result.value);
      } else {
        console.warn(`Failed to process MR ${batch[index]}:`, result.reason);
      }
    });

    // Small delay between batches to be respectful to the API
    if (i + batchSize < mrIids.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log(`Total comments collected for analysis: ${comments.length}`);
  
  // Log all comments for debugging if we have a small number
  if (comments.length > 0 && comments.length <= 10) {
    console.log('All collected comments:');
    comments.forEach((comment, index) => {
      console.log(`${index + 1}: "${comment}"`);
    });
  } else if (comments.length > 0) {
    console.log('Sample of collected comments:');
    comments.slice(0, 5).forEach((comment, index) => {
      console.log(`${index + 1}: "${comment.substring(0, 100)}${comment.length > 100 ? '...' : ''}"`);
    });
  }

  return comments;
}

function isStrictlyAutomatedComment(body: string): boolean {
  // Only filter out clearly automated system messages
  const strictAutomatedPatterns = [
    /^(approved|mentioned in|changed the description|added|removed|assigned|unassigned|requested review|marked as draft|marked as ready|merged|closed|rebased|force-pushed|updated|resolved all threads)/i,
    /pipeline (passed|failed|succeeded)/i,
    /build (passed|failed|succeeded)/i,
    /automatically/i,
    /^ci\/cd/i
  ];
  
  const trimmedBody = body.trim();
  
  // Check against strict patterns
  return strictAutomatedPatterns.some(pattern => pattern.test(trimmedBody));
}