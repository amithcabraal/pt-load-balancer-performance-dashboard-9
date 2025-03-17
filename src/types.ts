export interface LoadBalancerEntry {
  normalized_url: string;
  elb_status_code: string;
  request_verb: string;
  processing_time_bucket: string;
  count: number;
  total_requests: number;
  percentage: number;
}

export interface PerformanceMetricsEntry {
  base_url: string;
  request_verb: string;
  min_rt: number;
  max_rt: number;
  avg_rt: number;
  P25: number;
  P50: number;
  P60: number;
  P75: number;
  P90: number;
  P95: number;
  total: number;
  requests: number;
}

export interface SlowQueryEntry {
  time: string;
  processing_time: number;
  request_url: string;
  pid: string;
  elb_status_code: string;
}

export interface ErrorSummaryEntry {
  count: number;
  message: string;
}

export type DataFormat = 'loadbalancer' | 'performance' | 'slowqueries' | 'errorsummary';

export interface ChartData {
  name: string;
  value: number;
}

export interface DataState {
  loadBalancerData: LoadBalancerEntry[] | null;
  performanceData: PerformanceMetricsEntry[] | null;
  slowQueriesData: SlowQueryEntry[] | null;
  errorSummaryData: ErrorSummaryEntry[] | null;
  fileNames: {
    loadBalancer?: string;
    performance?: string;
    slowQueries?: string;
    errorSummary?: string;
  };
}

export type TabType = 'summary' | 'stats' | 'slow' | 'errors' | null;