export type JobListing = {
  state: string;
  suburbs: string;
  jobTitle: string;
  roleType?: string;
  company: string;
  salary: string;
  postedDate: string;
  contactEmail?: string;
  seekUrl: string;
  permanentUrl?: string;
};

export type PageScrapeError = {
  page: number;
  error: string;
};

export type ListingScrapeResult = {
  url: string;
  jobs: JobListing[];
  totalPages: number;
  reportedJobCount: number | null;
  pageErrors?: PageScrapeError[];
};
