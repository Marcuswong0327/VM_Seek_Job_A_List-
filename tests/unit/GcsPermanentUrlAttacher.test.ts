import { describe, expect, it, vi } from 'vitest';
import type { JobListing } from '../../src/domain/JobListing.js';
import { GcsPermanentUrlAttacher } from '../../src/storage/GcsPermanentUrlAttacher.js';

function listing(overrides: Partial<JobListing> = {}): JobListing {
  return {
    state: 'Melbourne (VIC)',
    suburbs: 'Dandenong',
    jobTitle: 'Plant Mechanic',
    company: 'William Adams Pty Ltd',
    salary: '$90k',
    postedDate: '8 Aug 2026',
    seekUrl: 'https://www.au.seek.com/job/91086625',
    ...overrides,
  };
}

describe('GcsPermanentUrlAttacher', () => {
  it('uploads snapshot HTML and sets permanentUrl from GCS', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ url: 'https://storage.googleapis.com/seek-jobs/91086625.html' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const attacher = new GcsPermanentUrlAttacher({
      endpoint: 'https://upload.example.run.app',
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    const [job] = await attacher.attach([listing()]);

    expect(job.permanentUrl).toBe('https://storage.googleapis.com/seek-jobs/91086625.html');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://upload.example.run.app');
    const body = JSON.parse(String((init as RequestInit).body));
    expect(body.jobId).toBe('91086625');
    expect(body.markdownContent).toContain('Plant Mechanic');
    expect(body.markdownContent).toContain('https://www.au.seek.com/job/91086625');
  });

  it('leaves permanentUrl blank when upload fails', async () => {
    const fetchMock = vi.fn(async () => new Response('nope', { status: 500 }));
    const attacher = new GcsPermanentUrlAttacher({
      endpoint: 'https://upload.example.run.app',
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    const [job] = await attacher.attach([listing()]);
    expect(job.permanentUrl).toBe('');
    expect(job.seekUrl).toBe('https://www.au.seek.com/job/91086625');
  });
});
