import { FetchedMRNotes, getHumanNotes, isSystemOrAutomated, MRNote } from './notesFetcher';
import { runBatch, API_BASE } from './gitlabApi';

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
  avgResponseTime: number;
  medianResponseTime: number;
  fastestResponse: number;
  slowestResponse: number;
  responseRate: number;
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

export function calculateResponseTimeFromNotes(
  notesMap: Map<number, FetchedMRNotes>,
  mrIids: number[],
  authorUsername: string
): ResponseTimeMetrics {
  const threads: CommentThread[] = [];

  for (const mrIid of mrIids) {
    const data = notesMap.get(mrIid);
    if (!data) continue;

    const allNotes = [...data.notes, ...data.discussions]
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    const humanNotes = allNotes.filter(n =>
      !isSystemOrAutomated(n) && n.body.trim().length > 0
    );

    for (let i = 0; i < humanNotes.length; i++) {
      const note = humanNotes[i];
      if (note.author.username === authorUsername) continue;

      const thread: CommentThread = {
        id: `${mrIid}-${note.id}`,
        reviewerComment: {
          author: note.author.username,
          created_at: note.created_at,
          body: note.body
        },
        resolved: false
      };

      const response = findAuthorResponse(humanNotes, i + 1, authorUsername, note.created_at);
      if (response) {
        thread.authorResponse = {
          created_at: response.created_at,
          body: response.body
        };
        thread.resolved = true;
        thread.responseTimeHours = hoursDiff(note.created_at, response.created_at);
      }

      threads.push(thread);
    }
  }

  return buildMetrics(threads);
}

export async function calculateAuthorResponseTime(
  token: string,
  projectId: string,
  authorUsername: string,
  mrIids: number[]
): Promise<ResponseTimeMetrics> {
  const threads: CommentThread[] = [];

  const fetched = await runBatch(
    mrIids,
    mrIid => fetchThreadsForMR(token, projectId, mrIid, authorUsername),
    6,
    30
  );

  for (const batch of fetched) {
    threads.push(...batch);
  }

  return buildMetrics(threads);
}

async function fetchThreadsForMR(
  token: string,
  projectId: string,
  mrIid: number,
  authorUsername: string
): Promise<CommentThread[]> {
  try {
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    const [notesResp, discussionsResp] = await Promise.all([
      fetch(
        `${API_BASE}/projects/${projectId}/merge_requests/${mrIid}/notes?per_page=100&sort=asc`,
        { headers, signal: AbortSignal.timeout(10_000) }
      ),
      fetch(
        `${API_BASE}/projects/${projectId}/merge_requests/${mrIid}/discussions?per_page=100`,
        { headers, signal: AbortSignal.timeout(10_000) }
      )
    ]);

    const notes: MRNote[] = notesResp.ok ? await notesResp.json() : [];
    const discussions: MRNote[] = discussionsResp.ok
      ? (await discussionsResp.json()).flatMap((d: any) => d.notes || [])
      : [];

    const allNotes = [...notes, ...discussions]
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    const humanNotes = allNotes.filter(n =>
      !isSystemOrAutomated(n) && n.body.trim().length > 0
    );

    const threads: CommentThread[] = [];
    for (let i = 0; i < humanNotes.length; i++) {
      const note = humanNotes[i];
      if (note.author.username === authorUsername) continue;

      const thread: CommentThread = {
        id: `${mrIid}-${note.id}`,
        reviewerComment: {
          author: note.author.username,
          created_at: note.created_at,
          body: note.body
        },
        resolved: false
      };

      const response = findAuthorResponse(humanNotes, i + 1, authorUsername, note.created_at);
      if (response) {
        thread.authorResponse = {
          created_at: response.created_at,
          body: response.body
        };
        thread.resolved = true;
        thread.responseTimeHours = hoursDiff(note.created_at, response.created_at);
      }

      threads.push(thread);
    }

    return threads;
  } catch {
    return [];
  }
}

function findAuthorResponse(
  notes: MRNote[],
  startIndex: number,
  authorUsername: string,
  commentTime: string
): MRNote | null {
  const commentDate = new Date(commentTime).getTime();
  const maxWindow = 7 * 24 * 60 * 60 * 1000;

  for (let i = startIndex; i < notes.length; i++) {
    const note = notes[i];
    const noteTime = new Date(note.created_at).getTime();
    if (noteTime - commentDate > maxWindow) break;

    if (note.author.username === authorUsername && isLikelyResponse(note.body)) {
      return note;
    }
  }
  return null;
}

const RESPONSE_INDICATORS = new Set([
  'thanks', 'thank you', 'fixed', 'done', 'updated', 'changed', 'addressed',
  'good point', "you're right", 'agreed', 'makes sense', 'will do',
  'implemented', 'refactored', 'added', 'removed', 'modified', 'ok', 'lgtm', 'ack', 'sgtm', 'yes'
]);

function isLikelyResponse(body: string): boolean {
  const lower = body.toLowerCase();
  for (const indicator of RESPONSE_INDICATORS) {
    if (lower.includes(indicator)) return true;
  }
  return body.length > 3;
}

function hoursDiff(start: string, end: string): number {
  return Math.max(0, (new Date(end).getTime() - new Date(start).getTime()) / 3_600_000);
}

function buildMetrics(threads: CommentThread[]): ResponseTimeMetrics {
  const responded = threads.filter(t => t.resolved && t.responseTimeHours !== undefined);
  const times = responded.map(t => t.responseTimeHours!);

  const avg = times.length > 0 ? times.reduce((s, t) => s + t, 0) / times.length : 0;
  const sorted = [...times].sort((a, b) => a - b);
  const median = sorted.length > 0
    ? sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)]
    : 0;

  return {
    avgResponseTime: avg,
    medianResponseTime: median,
    fastestResponse: times.length > 0 ? Math.min(...times) : 0,
    slowestResponse: times.length > 0 ? Math.max(...times) : 0,
    responseRate: threads.length > 0 ? (responded.length / threads.length) * 100 : 0,
    totalComments: threads.length,
    respondedComments: responded.length,
    unresolvedComments: threads.length - responded.length,
    responseTimeDistribution: {
      under1Hour: times.filter(t => t < 1).length,
      under4Hours: times.filter(t => t >= 1 && t < 4).length,
      under24Hours: times.filter(t => t >= 4 && t < 24).length,
      under3Days: times.filter(t => t >= 24 && t < 72).length,
      over3Days: times.filter(t => t >= 72).length
    },
    commentsByDay: buildDailyMetrics(threads)
  };
}

function buildDailyMetrics(threads: CommentThread[]) {
  const dayMap = new Map<string, { received: number; responded: number; times: number[] }>();

  for (const t of threads) {
    const date = t.reviewerComment.created_at.split('T')[0];
    if (!dayMap.has(date)) dayMap.set(date, { received: 0, responded: 0, times: [] });
    const d = dayMap.get(date)!;
    d.received++;
    if (t.resolved && t.responseTimeHours !== undefined) {
      d.responded++;
      d.times.push(t.responseTimeHours);
    }
  }

  return Array.from(dayMap.entries())
    .map(([date, d]) => ({
      date,
      commentsReceived: d.received,
      commentsResponded: d.responded,
      avgResponseTime: d.times.length > 0 ? d.times.reduce((s, t) => s + t, 0) / d.times.length : 0
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export type { ResponseTimeMetrics, CommentThread };
