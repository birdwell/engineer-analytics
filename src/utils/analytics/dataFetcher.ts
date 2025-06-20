import { GitLabMR, GitLabNote, GitLabChanges } from './types';

const API_BASE = 'https://gitlab.com/api/v4';

export async function fetchMRsInTimeframe(
  token: string,
  projectId: string,
  timeframe: '7d' | '30d' | '90d'
): Promise<GitLabMR[]> {
  const cutoffDate = getTimeframeCutoff(timeframe);
  const cutoffISOString = cutoffDate.toISOString();

  console.log(`Fetching MRs updated after ${cutoffISOString}`);

  try {
    const allMRs: GitLabMR[] = [];
    const states = ['opened', 'merged'];
    const perPage = 100; // Increased back to 100 for better coverage
    const maxPages = 10; // Increased to get more comprehensive data

    const encodedProjectId = encodeURIComponent(projectId);
    console.log(`Using encoded project ID: ${encodedProjectId}`);

    for (const state of states) {
      console.log(`Fetching ${state} MRs...`);
      
      for (let page = 1; page <= maxPages; page++) {
        const params = new URLSearchParams({
          state,
          updated_after: cutoffISOString,
          per_page: perPage.toString(),
          page: page.toString(),
          order_by: 'updated_at',
          sort: 'desc'
        });
        
        const url = `${API_BASE}/projects/${encodedProjectId}/merge_requests?${params.toString()}`;
        console.log(`Fetching page ${page} for ${state} MRs...`);
        
        try {
          const response = await fetch(url, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(15000) // Increased timeout to 15 seconds
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Failed to fetch ${state} MRs page ${page}: ${response.status} - ${errorText}`);
            
            // Try with numeric project ID if path-based ID fails
            if (response.status === 400 && projectId.includes('/')) {
              console.log('Trying to fetch project info to get numeric ID...');
              try {
                const projectResponse = await fetch(
                  `${API_BASE}/projects/${encodedProjectId}`,
                  {
                    headers: {
                      'Authorization': `Bearer ${token}`,
                      'Content-Type': 'application/json',
                    },
                    signal: AbortSignal.timeout(5000)
                  }
                );
                
                if (projectResponse.ok) {
                  const project = await projectResponse.json();
                  console.log(`Found numeric project ID: ${project.id}`);
                  
                  const retryUrl = `${API_BASE}/projects/${project.id}/merge_requests?${params.toString()}`;
                  console.log(`Retrying with numeric ID: ${retryUrl}`);
                  
                  const retryResponse = await fetch(retryUrl, {
                    headers: {
                      'Authorization': `Bearer ${token}`,
                      'Content-Type': 'application/json',
                    },
                    signal: AbortSignal.timeout(15000)
                  });
                  
                  if (retryResponse.ok) {
                    const mrs = await retryResponse.json();
                    if (mrs.length === 0) break;
                    allMRs.push(...mrs);
                    console.log(`  Added ${mrs.length} MRs from page ${page} (${state})`);
                    if (mrs.length < perPage) break;
                    continue;
                  }
                }
              } catch (projectError) {
                console.warn('Failed to fetch project info:', projectError);
              }
            }
            
            break; // Stop trying this state if we get an error
          }

          const mrs = await response.json();
          if (mrs.length === 0) {
            console.log(`  No more MRs found for ${state} on page ${page}`);
            break;
          }

          allMRs.push(...mrs);
          console.log(`  Added ${mrs.length} MRs from page ${page} (${state}). Total so far: ${allMRs.length}`);
          
          if (mrs.length < perPage) {
            console.log(`  Reached end of ${state} MRs (got ${mrs.length} < ${perPage})`);
            break;
          }
        } catch (fetchError) {
          console.error(`Network error fetching ${state} MRs page ${page}:`, fetchError);
          break; // Stop on network errors
        }
      }
    }

    // Remove duplicates
    const uniqueMRs = allMRs.reduce((acc, mr) => {
      if (!acc.find(existing => existing.id === mr.id)) {
        acc.push(mr);
      }
      return acc;
    }, [] as GitLabMR[]);

    console.log(`Fetched ${uniqueMRs.length} unique MRs (from ${allMRs.length} total including duplicates)`);
    
    // Filter MRs to only include those actually within the timeframe
    const filteredMRs = uniqueMRs.filter(mr => {
      const mrDate = new Date(mr.updated_at || mr.created_at);
      return mrDate >= cutoffDate;
    });
    
    console.log(`Filtered to ${filteredMRs.length} MRs actually within ${timeframe} timeframe`);
    return filteredMRs;
  } catch (error) {
    console.error('Failed to fetch MRs:', error);
    throw new Error(`Failed to fetch MRs: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function fetchMRNotes(
  token: string,
  projectId: string,
  mrIid: number
): Promise<GitLabNote[]> {
  try {
    const encodedProjectId = encodeURIComponent(projectId);
    
    const response = await fetch(
      `${API_BASE}/projects/${encodedProjectId}/merge_requests/${mrIid}/notes?per_page=100&sort=asc`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(8000) // Increased timeout
      }
    );

    if (!response.ok) {
      console.warn(`Failed to fetch notes for MR ${mrIid}: ${response.status}`);
      return [];
    }

    return response.json();
  } catch (error) {
    console.warn(`Error fetching notes for MR ${mrIid}:`, error);
    return [];
  }
}

export async function fetchMRChanges(
  token: string,
  projectId: string,
  mrIid: number
): Promise<GitLabChanges | null> {
  try {
    const encodedProjectId = encodeURIComponent(projectId);
    
    const response = await fetch(
      `${API_BASE}/projects/${encodedProjectId}/merge_requests/${mrIid}/changes`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(8000) // Increased timeout
      }
    );

    if (!response.ok) {
      console.warn(`Failed to fetch changes for MR ${mrIid}: ${response.status}`);
      return null;
    }

    return response.json();
  } catch (error) {
    console.warn(`Error fetching changes for MR ${mrIid}:`, error);
    return null;
  }
}

function getTimeframeCutoff(timeframe: '7d' | '30d' | '90d'): Date {
  const now = new Date();
  const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
  return new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
}