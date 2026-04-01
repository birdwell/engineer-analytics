import { runBatch, API_BASE } from './gitlabApi';

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

      const promises: Promise<MRNote[]>[] = [
        fetch(
          `${API_BASE}/projects/${projectId}/merge_requests/${mrIid}/notes?per_page=100&sort=asc`,
          { headers, signal: AbortSignal.timeout(10_000) }
        ).then(r => r.ok ? r.json() : []).catch(() => [] as MRNote[])
      ];

      if (includeDiscussions) {
        promises.push(
          fetch(
            `${API_BASE}/projects/${projectId}/merge_requests/${mrIid}/discussions?per_page=100`,
            { headers, signal: AbortSignal.timeout(10_000) }
          ).then(r => r.ok ? r.json() : [])
           .then((discussions: any[]) => discussions.flatMap((d: any) => d.notes || []))
           .catch(() => [] as MRNote[])
        );
      }

      const [notes, discussions = []] = await Promise.all(promises);
      return { mrIid, notes, discussions } as FetchedMRNotes;
    },
    6,
    30
  );

  for (const item of fetched) {
    results.set(item.mrIid, item);
  }

  return results;
}
