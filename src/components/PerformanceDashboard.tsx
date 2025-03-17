import React, { useMemo, useState } from 'react';
import {
  ScatterChart,
  Scatter,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { PerformanceMetricsEntry } from '../types';
import { Search, ArrowUpDown } from 'lucide-react';

type SortField = 'base_url' | 'request_verb' | 'avg_rt' | 'P50' | 'P95' | 'P100' | 'requests';
type SortDirection = 'asc' | 'desc';
type MetricType = 'avg_rt' | 'P25' | 'P50' | 'P60' | 'P75' | 'P90' | 'P95' | 'P100';

const METRIC_LABELS: Record<MetricType, string> = {
  'avg_rt': 'Average Response Time',
  'P25': '25th Percentile',
  'P50': '50th Percentile',
  'P60': '60th Percentile',
  'P75': '75th Percentile',
  'P90': '90th Percentile',
  'P95': '95th Percentile',
  'P100': '100th Percentile (Max)'
};

// Map metric types to their corresponding data keys
const METRIC_KEYS: Record<MetricType, keyof PerformanceMetricsEntry> = {
  'avg_rt': 'avg_rt',
  'P25': 'P25',
  'P50': 'P50',
  'P60': 'P60',
  'P75': 'P75',
  'P90': 'P90',
  'P95': 'P95',
  'P100': 'max_rt'
};

const getColorByP95 = (p95: number) => {
  if (p95 <= 300) return '#22c55e';
  if (p95 <= 1000) return '#3b82f6';
  if (p95 <= 5000) return '#eab308';
  if (p95 <= 10000) return '#f97316';
  return '#ef4444';
};

const PercentileCurve = ({ data }: { data: PerformanceMetricsEntry }) => {
  const percentileData = [
    { name: 'P25', value: data.P25, position: 25 },
    { name: 'P50', value: data.P50, position: 50 },
    { name: 'P60', value: data.P60, position: 60 },
    { name: 'P75', value: data.P75, position: 75 },
    { name: 'P90', value: data.P90, position: 90 },
    { name: 'P95', value: data.P95, position: 95 },
    { name: 'P100', value: data.max_rt, position: 100 }
  ];

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="text-sm font-medium text-gray-900 mb-2 truncate">
        {data.request_verb} {data.base_url.split('/').slice(3).join('/')}
      </h3>
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={percentileData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="position" 
              type="number"
              domain={[0, 100]}
              ticks={[25, 50, 60, 75, 90, 95, 100]}
              tickFormatter={(value) => `P${value}`}
              tick={{ fontSize: 10 }}
            />
            <YAxis 
              tick={{ fontSize: 10 }}
              domain={['dataMin', 'dataMax']}
              tickFormatter={(value) => Math.round(value).toString()}
              label={{ 
                value: 'Response Time (ms)', 
                angle: -90, 
                position: 'insideLeft',
                style: { fontSize: '10px' }
              }}
            />
            <Tooltip
              content={({ payload }) => {
                if (!payload?.length) return null;
                const point = payload[0].payload;
                return (
                  <div className="bg-white p-2 border rounded shadow text-xs">
                    <p>{point.name}: {Math.round(point.value)}ms</p>
                  </div>
                );
              }}
            />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke={getColorByP95(data.P95)}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 text-xs text-gray-500 text-right">
        Requests: {data.requests.toLocaleString()}
      </div>
    </div>
  );
};

export function PerformanceDashboard({ data }: { data: PerformanceMetricsEntry[] }) {
  const [showAllGraphs, setShowAllGraphs] = useState(false);
  const [sortField, setSortField] = useState<SortField>('P95');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterEndpoint, setFilterEndpoint] = useState('');
  const [filterMethod, setFilterMethod] = useState('');
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('P100');

  const uniqueMethods = useMemo(() => {
    return Array.from(new Set(data.map(entry => entry.request_verb))).sort();
  }, [data]);

  const sortedAndFilteredData = useMemo(() => {
    let filtered = data.filter(entry => {
      const endpointMatch = entry.base_url.toLowerCase().includes(filterEndpoint.toLowerCase());
      const methodMatch = !filterMethod || entry.request_verb === filterMethod;
      return endpointMatch && methodMatch;
    });

    return filtered.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'base_url') {
        comparison = a.base_url.localeCompare(b.base_url);
      } else if (sortField === 'request_verb') {
        comparison = a.request_verb.localeCompare(b.request_verb);
      } else if (sortField === 'P100') {
        comparison = a.max_rt - b.max_rt;
      } else {
        comparison = (a[sortField] as number) - (b[sortField] as number);
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, sortField, sortDirection, filterEndpoint, filterMethod]);

  const scatterData = useMemo(() => {
    return sortedAndFilteredData.map(entry => ({
      name: entry.base_url.split('/').slice(3).join('/'),
      verb: entry.request_verb,
      metric: entry[METRIC_KEYS[selectedMetric]],
      p95: entry.P95,
      requests: entry.requests
    }));
  }, [sortedAndFilteredData, selectedMetric]);

  const filteredGraphData = useMemo(() => {
    return showAllGraphs ? sortedAndFilteredData : sortedAndFilteredData.filter(entry => entry.requests >= 100);
  }, [sortedAndFilteredData, showAllGraphs]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortableHeader = ({ field, label }: { field: SortField, label: string }) => (
    <th 
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center space-x-1">
        <span>{label}</span>
        <ArrowUpDown className="w-4 h-4" />
      </div>
    </th>
  );

  return (
    <div className="w-full space-y-8 p-6">
      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-xl font-semibold mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Endpoint
            </label>
            <div className="relative">
              <input
                type="text"
                value={filterEndpoint}
                onChange={(e) => setFilterEndpoint(e.target.value)}
                placeholder="Filter by endpoint..."
                className="w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              />
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              HTTP Method
            </label>
            <select
              value={filterMethod}
              onChange={(e) => setFilterMethod(e.target.value)}
              className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Methods</option>
              {uniqueMethods.map(method => (
                <option key={method} value={method}>{method}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Performance Overview */}
      <div className="bg-white p-6 rounded-lg shadow-lg overflow-x-auto">
        <h2 className="text-xl font-semibold mb-4">Endpoint Performance Overview</h2>
        <table className="min-w-full divide-y divide-gray-200 table-fixed">
          <thead className="bg-gray-50">
            <tr>
              <SortableHeader field="base_url" label="Endpoint" />
              <SortableHeader field="request_verb" label="Method" />
              <SortableHeader field="avg_rt" label="Avg RT (ms)" />
              <SortableHeader field="P50" label="P50 (ms)" />
              <SortableHeader field="P95" label="P95 (ms)" />
              <SortableHeader field="P100" label="P100 (ms)" />
              <SortableHeader field="requests" label="Requests" />
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedAndFilteredData.map((entry, idx) => (
              <tr key={idx} className={entry.P95 > 1000 ? 'bg-red-50' : undefined}>
                <td className="px-6 py-4 text-sm font-medium text-gray-900 truncate max-w-md">
                  {entry.base_url.split('/').slice(3).join('/')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {entry.request_verb}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                  {Math.round(entry.avg_rt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                  {Math.round(entry.P50)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                  {Math.round(entry.P95)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                  {Math.round(entry.max_rt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                  {entry.requests.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Scatter Plot */}
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Response Time vs Request Volume</h2>
          <div className="w-64">
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value as MetricType)}
              className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(METRIC_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid />
            <XAxis 
              type="number" 
              dataKey="metric" 
              name={METRIC_LABELS[selectedMetric]}
              unit=" ms"
              label={{ value: `${METRIC_LABELS[selectedMetric]} (ms)`, position: 'bottom' }}
            />
            <YAxis 
              type="number" 
              dataKey="requests" 
              name="Request Count"
              label={{ value: 'Request Count', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              cursor={{ strokeDasharray: '3 3' }}
              content={({ payload }) => {
                if (!payload?.length) return null;
                const data = payload[0].payload;
                return (
                  <div className="bg-white p-2 border rounded shadow">
                    <p className="font-semibold">{data.name}</p>
                    <p>Method: {data.verb}</p>
                    <p>{METRIC_LABELS[selectedMetric]}: {Math.round(data.metric)} ms</p>
                    <p>P95: {Math.round(data.p95)} ms</p>
                    <p>Requests: {data.requests.toLocaleString()}</p>
                  </div>
                );
              }}
            />
            <Scatter name="Endpoints" data={scatterData}>
              {scatterData.map((entry, index) => (
                <Cell 
                  key={index} 
                  fill={getColorByP95(entry.p95)}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Percentile Distribution Curves */}
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Response Time Percentile Distributions</h2>
          <button
            onClick={() => setShowAllGraphs(!showAllGraphs)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            {showAllGraphs ? 'Hide Low Volume Endpoints' : 'Show All Endpoints'}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGraphData.map((entry, index) => (
            <PercentileCurve key={index} data={entry} />
          ))}
        </div>
        {!showAllGraphs && (
          <p className="mt-4 text-sm text-gray-500">
            Showing only endpoints with 100+ requests. Click "Show All Endpoints" to view all data.
          </p>
        )}
      </div>
    </div>
  );
}