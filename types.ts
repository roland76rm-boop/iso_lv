
export interface Project {
  id: string;
  projectName: string;
  planner: string;
  plannerNumber: string;
  customerNumbers: string[]; // From 'Knd. Nr. Übermittler'
  rawCustomerNumbers: string;
  description: string;
  date: string;
  status: string;
  allData: Record<string, string>; // Catch-all for other columns
}

export interface SearchFilters {
  query: string;
}
