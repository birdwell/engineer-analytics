import { runBatch, API_BASE } from './gitlabApi';
import { isRecord, isUnknownArray, readResponseJson } from './json';

export interface MRNote {
  id: number;
  author: {
    id: number;
    name: string;
    username: string;
  };
  created_at: string;
  body: string;
  system: boolean;
}

export interface FetchedMRNotes {
  mrIid: number;
  notes: MRNote[];
  discussions: MRNote[];
}

const AUTOMATED_PATTERNS = [
  /^(approved|mentioned in|changed the description|added|removed|assigned|unassigned|requested review|marked as draft|marked as ready|merged|closed|rebased|force-pushed|updated|resolved all threads)/i,
  /pipeline (passed|failed|succeeded)/i,
  /build (passed|failed|succeeded)/i,
  /automatically/i,
  /^ci\/cd/i
];

export function isAutomatedComment(body: string): boolean {
  const trimmed = body.trim();
  return AUTOMATED_PATTERNS.some(p => p.test(trimmed));
}

export function isSystemOrAutomated(note: MRNote): boolean {
  return note.system || note.body.trim().length === 0 || isAutomatedComment(note.body);
}

function isNoteList(value: unknown): value is MRNote[] {
  return Array.isArray(value);
}

export async function readNoteList(response: Response): Promise<MRNote[]> {
  if (!response.ok) return [];
  const body = await readResponseJson(response);
  return isNoteList(body) ? body : [];
}

export async function readDiscussionNotes(response: Response): Promise<MRNote[]> {
  if (!response.ok) return [];
  const body = await readResponseJson(response);
  if (!isUnknownArray(body)) return [];

  return body.flatMap((discussion) => {
    if (!isRecord(discussion) || !isNoteList(discussion.notes)) return [];
    return discussion.notes;
  });
}

export function getHumanNotes(notes: MRNote[], excludeUsername?: string): MRNote[] {
  return notes.filter(n =>
    !isSystemOrAutomated(n) &&
    n.body.trim().length >= 3 &&
    (!excludeUsername || n.author.username !== excludeUsername)
  );
}

export async function fetchNotesForMRs(
  token: string,
  projectId: string,
  mrIids: number[],
  includeDiscussions = false
): Promise<Map<number, FetchedMRNotes>> {
  const results = new Map<number, FetchedMRNotes>();

  const fetched = await runBatch(
    mrIids,
    async (mrIid) => {
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const promises: Array<Promise<MRNote[]>> = [
        fetch(
          `${API_BASE}/projects/${projectId}/merge_requests/${mrIid}/notes?per_page=100&sort=asc`,
          { headers, signal: AbortSignal.timeout(10_000) }
        ).then(readNoteList).catch((): MRNote[] => [])
      ];

      if (includeDiscussions) {
        promises.push(
          fetch(
            `${API_BASE}/projects/${projectId}/merge_requests/${mrIid}/discussions?per_page=100`,
            { headers, signal: AbortSignal.timeout(10_000) }
          ).then(readDiscussionNotes).catch((): MRNote[] => [])
        );
      }

      const [notes, discussions = []] = await Promise.all(promises);
      return { mrIid, notes, discussions };
    },
    6,
    30
  );

  for (const item of fetched) {
    results.set(item.mrIid, item);
  }

  return results;
}
