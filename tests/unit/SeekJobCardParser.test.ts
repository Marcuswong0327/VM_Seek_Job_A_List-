import { describe, expect, it } from 'vitest';
import { parseSeekJobCardHtml } from '../../src/parsing/SeekJobCardParser.js';

const sampleCard = `
<article data-testid="job-card">
  <h3><a data-automation="jobTitle" href="https://www.au.seek.com/job/91086625">Plant Mechanic</a></h3>
  <a data-automation="jobCompany">William Adams Pty Ltd</a>
  <span data-automation="jobLocation">Dandenong, Melbourne VIC</span>
  <span data-automation="jobSalary">$90,000 - $110,000</span>
  <span data-automation="jobListingDate">3d ago</span>
</article>
`;

describe('parseSeekJobCardHtml', () => {
  it('extracts listing fields from a Seek job card', () => {
    const job = parseSeekJobCardHtml(sampleCard);
    expect(job).toEqual({
      jobTitle: 'Plant Mechanic',
      company: 'William Adams Pty Ltd',
      suburbs: 'Dandenong',
      state: 'Melbourne (VIC)',
      salary: '$90,000 - $110,000',
      postedDate: expect.any(String),
      seekUrl: 'https://www.au.seek.com/job/91086625',
    });
    expect(job?.postedDate.length).toBeGreaterThan(0);
  });

  it('returns null when title or job url is missing', () => {
    expect(parseSeekJobCardHtml('<article data-testid="job-card"><p>empty</p></article>')).toBeNull();
  });
});
