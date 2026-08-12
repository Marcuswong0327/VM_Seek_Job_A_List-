import type { JobListing } from '../domain/JobListing.js';

/** DIP: Excel export depends on this, not GCS HTTP. */
export interface IPermanentUrlAttacher {
  attach(jobs: JobListing[]): Promise<JobListing[]>;
}
