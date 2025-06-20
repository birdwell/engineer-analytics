interface CommentThread {
  id: string;
  reviewerComment: {
    author: string;
    created_at: string;
    body: string;
  };
  authorResponse?: {
    created_at: string;
    body: string;
  };
  resolved: boolean;
  responseTimeHours?: number;
}

interface ResponseTimeMetrics {
  avgResponseTime: number; // Average hours to respond to comments
  medianResponseTime: number;
  fastestResponse: number;
  slowestResponse: number;
  responseRate: number; // Percentage of comments that got responses
  totalComments: number;
  respondedComments: number;
  unresolvedComments: number;
  responseTimeDistribution: {
    under1Hour: number;
    under4Hours: number;
    under24Hours: number;
    under3Days: number;
    over3Days: number;
  };
  commentsByDay: Array<{
    date: string;
    commentsReceived: number;
    commentsResponded: number;
    avgResponseTime: number;
  }>;
}

const API_BASE = 'https://gitlab.com/api/v4';

export async function calculateAuthorResponseTime(
  token: string,
  projectId: string,
  authorUsername: string,
  mrIids: number[]
): Promise<ResponseTimeMetrics> {
  console.log(`Calculating response time metrics for ${authorUsername} across ${mrIids.length} MRs`);
  
  const commentThreads: CommentThread[] = [];
  
  // Process MRs in batches to avoid overwhelming the API
  const batchSize = 3;
  for (let i = 0; i < mrIids.length; i += batchSize) {
    const batch = mrIids.slice(i, i + batchSize);
    console.log(`Processing MR batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(mrIids.length/batchSize)}: MRs ${batch.join(', ')}`);
    
    const batchPromises = batch.map(mrIid => 
      analyzeResponseTimeForMR(token, projectId, mrIid, authorUsername)
    );
    
    const batchResults = await Promise.allSettled(batchPromises);
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        commentThreads.push(...result.value);
      } else {
        console.warn(`Failed to analyze MR ${batch[index]}:`, result.reason);
      }
    });
    
    // Small delay between batches
    if (i + batchSize < mrIids.length) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }
  
  console.log(`Found ${commentThreads.length} comment threads to analyze`);
  
  return calculateResponseMetrics(commentThreads);
}

async function analyzeResponseTimeForMR(
  token: string,
  projectId: string,
  mrIid: number,
  authorUsername: string
): Promise<CommentThread[]> {
  try {
    // Fetch top-level notes and threaded discussion notes in parallel so we
    // capture both kinds of reviewer feedback (inline code comments live in
    // the /discussions endpoint).
    const [notesResp, discussionsResp] = await Promise.all([
      fetch(
        `${API_BASE}/projects/${projectId}/merge_requests/${mrIid}/notes?per_page=100&sort=asc`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(10000)
        }
      ),
      fetch(
        `${API_BASE}/projects/${projectId}/merge_requests/${mrIid}/discussions?per_page=100&sort=asc`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(10000)
        }
      )
    ]);

    if (!notesResp.ok && !discussionsResp.ok) {
      console.warn(`Failed to fetch notes or discussions for MR ${mrIid}`);
      return [];
    }

    const notes: any[] = notesResp.ok ? await notesResp.json() : [];

    let discussionNotes: any[] = [];
    if (discussionsResp.ok) {
      const discussions = await discussionsResp.json();
      // Each discussion has an array of notes
      discussionNotes = discussions.flatMap((d: any) => d.notes);
    }

    const allNotes = [...notes, ...discussionNotes].sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    console.log(`  MR ${mrIid}: total notes collected ${allNotes.length} (top-level: ${notes.length}, discussion: ${discussionNotes.length})`);
    
    // Filter to human comments only (exclude system notes)
    const humanNotes = allNotes.filter((note: any) => 
      !note.system && 
      note.body.trim().length > 0 &&
      !isAutomatedComment(note.body)
    );
    
    console.log(`  MR ${mrIid}: ${humanNotes.length} human comments`);
    
    const threads: CommentThread[] = [];
    
    // Group notes into comment threads
    // A thread starts with a reviewer comment and may have author responses
    for (let i = 0; i < humanNotes.length; i++) {
      const note = humanNotes[i];
      
      // Skip if this is from the author (we're looking for reviewer comments first)
      if (note.author.username === authorUsername) {
        continue;
      }
      
      // This is a reviewer comment - start a new thread
      const thread: CommentThread = {
        id: `${mrIid}-${note.id}`,
        reviewerComment: {
          author: note.author.username,
          created_at: note.created_at,
          body: note.body
        },
        resolved: false
      };
      
      // Look for author responses after this comment
      const authorResponse = findAuthorResponse(humanNotes, i + 1, authorUsername, note.created_at);
      if (authorResponse) {
        thread.authorResponse = {
          created_at: authorResponse.created_at,
          body: authorResponse.body
        };
        thread.resolved = true;
        thread.responseTimeHours = calculateHoursDifference(
          note.created_at, 
          authorResponse.created_at
        );
      }
      
      threads.push(thread);
    }
    
    console.log(`  MR ${mrIid}: Created ${threads.length} comment threads, ${threads.filter(t => t.resolved).length} resolved`);
    return threads;
    
  } catch (error) {
    console.warn(`Error analyzing MR ${mrIid}:`, error);
    return [];
  }
}

function findAuthorResponse(
  notes: any[], 
  startIndex: number, 
  authorUsername: string, 
  commentTime: string
): any | null {
  // Look for the next comment from the author after the reviewer comment
  // within a reasonable time window (e.g., before the next reviewer comment or within 7 days)
  const commentDate = new Date(commentTime);
  const maxResponseWindow = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
  
  for (let i = startIndex; i < notes.length; i++) {
    const note = notes[i];
    const noteDate = new Date(note.created_at);
    
    // If this note is too far in the future, stop looking
    if (noteDate.getTime() - commentDate.getTime() > maxResponseWindow) {
      break;
    }
    
    // If this is from the author, it's likely a response
    if (note.author.username === authorUsername) {
      // Check if this looks like a response (not just a random comment)
      if (isLikelyResponse(note.body)) {
        return note;
      }
    }
    
    // If we hit another reviewer comment, the author might not have responded yet
    if (note.author.username !== authorUsername) {
      // Continue looking, but this might indicate the thread moved on
    }
  }
  
  return null;
}

function isLikelyResponse(body: string): boolean {
  const responseIndicators = [
    'thanks', 'thank you', 'fixed', 'done', 'updated', 'changed', 'addressed',
    'good point', 'you\'re right', 'agreed', 'makes sense', 'will do',
    'implemented', 'refactored', 'added', 'removed', 'modified', 'ok', 'lgtm', 'ack', 'sgtm', 'yes', '👍', '💯'
  ];
  
  const lowerBody = body.toLowerCase();
  return responseIndicators.some(indicator => lowerBody.includes(indicator)) ||
         body.length > 3; // Assume comments longer than 3 chars indicate response
}

function isAutomatedComment(body: string): boolean {
  // These patterns target system-generated notes and CI notifications. Keep them
  // relatively specific to avoid excluding legitimate human feedback such as
  // "I added tests …" or "Please remove …" in review comments.
  const automatedKeywords = [
    'pipeline', 'ci/cd', 'approved this merge request', 'mentioned in',
    'changed the description', 'added label', 'removed label',
    'assigned to', 'unassigned', 'requested review', 'marked as draft',
    'marked as ready', 'merged', 'closed this merge request'
  ];
  
  const lowerBody = body.toLowerCase();
  return automatedKeywords.some(keyword => lowerBody.includes(keyword));
}

function calculateHoursDifference(start: string, end: string): number {
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  return Math.max(0, (endTime - startTime) / (1000 * 60 * 60));
}

function calculateResponseMetrics(threads: CommentThread[]): ResponseTimeMetrics {
  const respondedThreads = threads.filter(t => t.resolved && t.responseTimeHours !== undefined);
  const responseTimes = respondedThreads.map(t => t.responseTimeHours!);
  
  // Calculate basic metrics
  const avgResponseTime = responseTimes.length > 0 
    ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
    : 0;
  
  const sortedTimes = [...responseTimes].sort((a, b) => a - b);
  const medianResponseTime = sortedTimes.length > 0
    ? sortedTimes.length % 2 === 0
      ? (sortedTimes[sortedTimes.length / 2 - 1] + sortedTimes[sortedTimes.length / 2]) / 2
      : sortedTimes[Math.floor(sortedTimes.length / 2)]
    : 0;
  
  const fastestResponse = responseTimes.length > 0 ? Math.min(...responseTimes) : 0;
  const slowestResponse = responseTimes.length > 0 ? Math.max(...responseTimes) : 0;
  const responseRate = threads.length > 0 ? (respondedThreads.length / threads.length) * 100 : 0;
  
  // Calculate response time distribution
  const distribution = {
    under1Hour: responseTimes.filter(t => t < 1).length,
    under4Hours: responseTimes.filter(t => t >= 1 && t < 4).length,
    under24Hours: responseTimes.filter(t => t >= 4 && t < 24).length,
    under3Days: responseTimes.filter(t => t >= 24 && t < 72).length,
    over3Days: responseTimes.filter(t => t >= 72).length
  };
  
  // Calculate daily metrics
  const commentsByDay = calculateDailyMetrics(threads);
  
  console.log(`Response time analysis complete:`, {
    totalComments: threads.length,
    respondedComments: respondedThreads.length,
    avgResponseTime: avgResponseTime.toFixed(1) + 'h',
    responseRate: responseRate.toFixed(1) + '%'
  });
  
  return {
    avgResponseTime,
    medianResponseTime,
    fastestResponse,
    slowestResponse,
    responseRate,
    totalComments: threads.length,
    respondedComments: respondedThreads.length,
    unresolvedComments: threads.length - respondedThreads.length,
    responseTimeDistribution: distribution,
    commentsByDay
  };
}

function calculateDailyMetrics(threads: CommentThread[]): Array<{
  date: string;
  commentsReceived: number;
  commentsResponded: number;
  avgResponseTime: number;
}> {
  const dailyMap = new Map<string, {
    commentsReceived: number;
    commentsResponded: number;
    responseTimes: number[];
  }>();
  
  threads.forEach(thread => {
    const date = thread.reviewerComment.created_at.split('T')[0];
    
    if (!dailyMap.has(date)) {
      dailyMap.set(date, {
        commentsReceived: 0,
        commentsResponded: 0,
        responseTimes: []
      });
    }
    
    const dayData = dailyMap.get(date)!;
    dayData.commentsReceived++;
    
    if (thread.resolved && thread.responseTimeHours !== undefined) {
      dayData.commentsResponded++;
      dayData.responseTimes.push(thread.responseTimeHours);
    }
  });
  
  return Array.from(dailyMap.entries())
    .map(([date, data]) => ({
      date,
      commentsReceived: data.commentsReceived,
      commentsResponded: data.commentsResponded,
      avgResponseTime: data.responseTimes.length > 0
        ? data.responseTimes.reduce((sum, time) => sum + time, 0) / data.responseTimes.length
        : 0
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export type { ResponseTimeMetrics, CommentThread };