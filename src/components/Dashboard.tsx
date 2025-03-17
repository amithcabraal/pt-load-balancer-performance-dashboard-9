import React, { useState, useMemo } from 'react';
import { LoadBalancerEntry } from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer
} from 'recharts';
import { Filter, AlertCircle } from 'lucide-react';

interface DashboardProps {
  data: LoadBalancerEntry[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

// Status code color mapping
const STATUS_COLORS: Record<string, string> = {
  '200': '#22c55e', // Success - Green
  '201': '#22c55e',
  '204': '#22c55e',
  '301': '#3b82f6', // Redirect - Blue
  '302': '#3b82f6',
  '304': '#3b82f6',
  '400': '#f97316', // Client Error - Orange
  '401': '#f97316',
  '403': '#f97316',
  '404': '#f97316',
  '500': '#ef4444', // Server Error - Red
  '502': '#ef4444',
  '503': '#ef4444',
  '504': '#ef4444'
};

const getStatusCodeColor = (code: string) => {
  return STATUS_COLORS[code] || '#9ca3af'; // Default gray for unknown status codes
};

export function Dashboard({ data }: DashboardProps) {
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('all');

  const endpointData = useMemo(() => {
    const endpointMap = new Map<string, { hasSlowRequests: boolean }>();
    
    data.forEach(entry => {
      const key = `${entry.normalized_url}|${entry.request_verb}`;
      const existing = endpointMap.get(key) || { hasSlowRequests: false };
      
      const [minTime] = entry.processing_time_bucket.split('-').map(Number);
      if (minTime >= 10) {
        existing.hasSlowRequests = true;
      }
      
      endpointMap.set(key, existing);
    });
    
    return endpointMap;
  }, [data]);

  const uniqueEndpoints = useMemo(() => {
    return Array.from(endpointData.keys()).sort();
  }, [endpointData]);

  const filteredData = useMemo(() => {
    if (selectedEndpoint === 'all') return data;
    const [url, verb] = selectedEndpoint.split('|');
    return data.filter(entry => 
      entry.normalized_url === url && entry.request_verb === verb
    );
  }, [data, selectedEndpoint]);

  // Aggregate data by HTTP status code
  const statusCodeData = useMemo(() => {
    return Object.entries(
      filteredData.reduce((acc, entry) => {
        const code = entry.elb_status_code || 'unknown';
        acc[code] = (acc[code] || 0) + (entry.count || 0);
        return acc;
      }, {} as Record<string, number>)
    ).map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  // Aggregate data by request verb
  const verbData = useMemo(() => {
    return Object.entries(
      filteredData.reduce((acc, entry) => {
        const verb = entry.request_verb || 'unknown';
        acc[verb] = (acc[verb] || 0) + (entry.count || 0);
        return acc;
      }, {} as Record<string, number>)
    ).map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  // Process time distribution with status code stacking
  const timeData = useMemo(() => {
    // First, group by time bucket and status code
    const groupedData = filteredData.reduce((acc, entry) => {
      const bucket = entry.processing_time_bucket || 'unknown';
      if (!acc[bucket]) {
        acc[bucket] = {};
      }
      acc[bucket][entry.elb_status_code] = (acc[bucket][entry.elb_status_code] || 0) + entry.count;
      return acc;
    }, {} as Record<string, Record<string, number>>);

    // Convert to format suitable for stacked bar chart
    return Object.entries(groupedData)
      .map(([bucket, statusCounts]) => ({
        name: bucket,
        ...statusCounts,
        total: Object.values(statusCounts).reduce((sum, count) => sum + count, 0)
      }))
      .sort((a, b) => {
        if (a.name === 'unknown') return 1;
        if (b.name === 'unknown') return -1;
        const [aMin] = a.name.split('-').map(Number);
        const [bMin] = b.name.split('-').map(Number);
        return aMin - bMin;
      });
  }, [filteredData]);

  // Get unique status codes for creating bars
  const uniqueStatusCodes = useMemo(() => {
    return Array.from(new Set(filteredData.map(entry => entry.elb_status_code))).sort();
  }, [filteredData]);

  const formatEndpointOption = (endpoint: string) => {
    const [url, verb] = endpoint.split('|');
    const endpointInfo = endpointData.get(endpoint);
    const slowLabel = endpointInfo?.hasSlowRequests ? ' (Slow)' : '';
    return `${verb} ${url}${slowLabel}`;
  };

  return (
    <div className="w-full space-y-8 p-6">
      {/* Endpoint Filter */}
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-blue-500" />
          <h2 className="text-xl font-semibold">Filter by Endpoint</h2>
        </div>
        <select
          value={selectedEndpoint}
          onChange={(e) => setSelectedEndpoint(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Endpoints</option>
          {uniqueEndpoints
            .sort((a, b) => formatEndpointOption(a).localeCompare(formatEndpointOption(b)))
            .map((endpoint) => {
              const endpointInfo = endpointData.get(endpoint);
              return (
                <option 
                  key={endpoint} 
                  value={endpoint}
                  className={endpointInfo?.hasSlowRequests ? 'text-red-600 font-semibold' : ''}
                >
                  {formatEndpointOption(endpoint)}
                </option>
              );
            })}
        </select>
        <div className="mt-2 text-sm text-gray-600 flex items-center gap-1">
          <AlertCircle className="w-4 h-4 text-amber-500" />
          <span>"Slow" indicates endpoints with processing times over 10 seconds</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Status Code Distribution */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4">Status Code Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusCodeData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(1)}%)`}
              >
                {statusCodeData.map((entry, index) => (
                  <Cell key={entry.name} fill={getStatusCodeColor(entry.name)} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Request Verb Distribution */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4">Request Verb Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={verbData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(1)}%)`}
              >
                {verbData.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Processing Time Distribution */}
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-xl font-semibold mb-4">Processing Time Distribution by Status Code</h2>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={timeData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip 
              content={({ payload, label }) => {
                if (!payload?.length) return null;
                return (
                  <div className="bg-white p-2 border rounded shadow">
                    <p className="font-semibold">{label} seconds</p>
                    {payload.map((entry: any, index) => (
                      <p key={index} style={{ color: entry.color }}>
                        Status {entry.name}: {entry.value.toLocaleString()} requests
                      </p>
                    ))}
                    <p className="border-t mt-1 pt-1">
                      Total: {payload.reduce((sum: number, entry: any) => sum + entry.value, 0).toLocaleString()} requests
                    </p>
                  </div>
                );
              }}
            />
            <Legend />
            {uniqueStatusCodes.map((code) => (
              <Bar
                key={code}
                dataKey={code}
                name={`Status ${code}`}
                stackId="status"
                fill={getStatusCodeColor(code)}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}