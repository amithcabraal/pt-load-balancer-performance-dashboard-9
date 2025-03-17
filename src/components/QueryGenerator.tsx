import React, { useState } from 'react';
import { X } from 'lucide-react';

interface QueryGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QueryGenerator({ isOpen, onClose }: QueryGeneratorProps) {
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [copiedQuery, setCopiedQuery] = useState<string | null>(null);

  if (!isOpen) return null;

  const generateQueries = () => {
    const startDateTime = `${startDate}T${startTime}:00`;
    const endDateTime = `${endDate}T${endTime}:00`;

    const loadBalancerQuery = `WITH processed_logs AS (
    SELECT 
        time,
        ((CASE WHEN request_processing_time  = -1 THEN 0 ELSE request_processing_time END) +
         (CASE WHEN target_processing_time   = -1 THEN 0 ELSE target_processing_time END) +
         (CASE WHEN response_processing_time = -1 THEN 0 ELSE response_processing_time END)) AS processing_time,
        request_verb,
        elb_status_code,
        REGEXP_REPLACE(request_url, '(/[0-9]+)', '/{playerId}') AS normalized_url
    FROM alb_logs
    WHERE 
        loadbalancer_name = 'dfe-test01-public-web-alb'
        AND time > '${startDateTime}'
        AND time < '${endDateTime}'
        AND ((CASE WHEN request_processing_time  = -1 THEN 0 ELSE request_processing_time END) +
             (CASE WHEN target_processing_time   = -1 THEN 0 ELSE target_processing_time END) +
             (CASE WHEN response_processing_time = -1 THEN 0 ELSE response_processing_time END)) > 0
 
), url_totals AS (
  SELECT normalized_url,
        request_verb,
        COUNT(*) as total_requests 
        FROM processed_logs pl 

  GROUP By 1,2
)

SELECT 
    pl.normalized_url,
    elb_status_code,
    pl.request_verb,
    CASE 
        WHEN processing_time <= 0.3 THEN '0-0.3'
        WHEN processing_time <= 1 THEN '0.3-01'
        WHEN processing_time <= 2 THEN '01-02'
        WHEN processing_time <= 5 THEN '02-05'
        WHEN processing_time <= 7 THEN '05-07'
        WHEN processing_time <= 10 THEN '07-10'
        WHEN processing_time <= 20 THEN '10-20'
        WHEN processing_time <= 30 THEN '20-30'
        ELSE '30+' 
    END AS processing_time_bucket,
    COUNT(*) as count,
    min(total_requests) as total_requests,
    CAST(ROUND(100.00 * COUNT(*) / MIN(total_requests), 6) AS DECIMAL(10, 6)) AS percentage
FROM processed_logs pl, url_totals ut
WHERE pl.normalized_url = ut.normalized_url
and pl.request_verb = ut.request_verb
GROUP BY 1,2,3,4
ORDER BY 1,2,3,4;`;

    const performanceQuery = `WITH RequestData as (
SELECT 
  regexp_replace(request_url, '(/[0-9]+)', '/playerId') normalized_url,
  request_verb,
  (case when request_processing_time  = -1 then 0 else  request_processing_time end) +
  (case when target_processing_time   = -1 then 0 else  target_processing_time end) +
  (case when response_processing_time = -1 then 0 else  response_processing_time end) as total_time
FROM alb_logs
WHERE loadbalancer_name = 'dfe-test01-public-web-alb'
  and time > '${startDateTime}'
  and time < '${endDateTime}'
  and request_verb != 'OPTIONS'
),
RequestDataReduced as (
select
  regexp_replace(normalized_url, '\\?.*', '') as base_url,
  request_verb,
  total_time * 1000 as total_time
from
  RequestData
where
  total_time > 0
)

select
  base_url,
  request_verb,
  round(min(total_time), 3) as min_rt,
  round(max(total_time), 3) as max_rt,
  round(avg(total_time), 3) as avg_rt,
  round(approx_percentile(total_time, 0.25), 3) as P25,
  round(approx_percentile(total_time, 0.50), 3) as P50,
  round(approx_percentile(total_time, 0.60), 3) as P60,
  round(approx_percentile(total_time, 0.75), 3) as P75,
  round(approx_percentile(total_time, 0.90), 3) as P90,
  round(approx_percentile(total_time, 0.95), 3) as P95,
  round(approx_percentile(total_time, 1.00), 3) as P100,
  round(sum(total_time*1.0), 3) as total,
  count(*) as requests
from RequestDataReduced
  group by 1, 2`;

    const slowQueriesQuery = `SELECT 
  time, 
  ((CASE WHEN request_processing_time  = -1 THEN 0 ELSE request_processing_time END) + 
   (CASE WHEN target_processing_time   = -1 THEN 0 ELSE target_processing_time END) + 
   (CASE WHEN response_processing_time = -1 THEN 0 ELSE response_processing_time END)) AS processing_time, 
  split(request_url,'/')[2], 
  request_url, 
  substring(request_url, 67, 8) as pid, 
  elb_status_code 
FROM alb_logs 
WHERE loadbalancer_name = 'dfe-test01-public-web-alb' 
  AND from_iso8601_timestamp(time) 
  BETWEEN from_iso8601_timestamp('${startDateTime}') 
  AND from_iso8601_timestamp('${endDateTime}') 
ORDER BY processing_time desc 
LIMIT 500`;

    return { loadBalancerQuery, performanceQuery, slowQueriesQuery };
  };

  const copyQuery = (query: string, type: string) => {
    navigator.clipboard.writeText(query);
    setCopiedQuery(type);
    setTimeout(() => setCopiedQuery(null), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">Generate Athena Queries</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {startDate && startTime && endDate && endTime && (
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-medium">Load Balancer Analysis Query</h3>
                  <button
                    onClick={() => copyQuery(generateQueries().loadBalancerQuery, 'loadBalancer')}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  >
                    {copiedQuery === 'loadBalancer' ? 'Copied!' : 'Copy Query'}
                  </button>
                </div>
                <pre className="bg-gray-50 p-4 rounded overflow-x-auto text-sm">
                  {generateQueries().loadBalancerQuery}
                </pre>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-medium">Performance Metrics Query</h3>
                  <button
                    onClick={() => copyQuery(generateQueries().performanceQuery, 'performance')}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  >
                    {copiedQuery === 'performance' ? 'Copied!' : 'Copy Query'}
                  </button>
                </div>
                <pre className="bg-gray-50 p-4 rounded overflow-x-auto text-sm">
                  {generateQueries().performanceQuery}
                </pre>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-medium">Slow Queries Analysis</h3>
                  <button
                    onClick={() => copyQuery(generateQueries().slowQueriesQuery, 'slowQueries')}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  >
                    {copiedQuery === 'slowQueries' ? 'Copied!' : 'Copy Query'}
                  </button>
                </div>
                <pre className="bg-gray-50 p-4 rounded overflow-x-auto text-sm">
                  {generateQueries().slowQueriesQuery}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}