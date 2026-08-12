export type JobListing = {
  state: string;
  suburbs: string;
  jobTitle: string;
  company: string;
  salary: string;
  postedDate: string;
  seekUrl: string;
};

export type ListingScrapeResult = {
  url: string;
  jobs: JobListing[];
  totalPages: number;
  reportedJobCount: number | null;
};
