import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { SlowQueryEntry } from '../types';

interface SlowQueriesDashboardProps {
  data: SlowQueryEntry[];
}

export function SlowQueriesDashboard({ data }: SlowQueriesDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const filteredData = useMemo(() => {
    return data.filter(entry => 
      entry.request_url.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.pid.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.elb_status_code.includes(searchTerm)
    );
  }, [data, searchTerm]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const pageData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="w-full space-y-8 p-6">
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Slow Queries Analysis</h2>
          <div className="relative w-96">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search requests..."
              className="w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            />
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Processing Time (s)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Request URL
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Player ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pageData.map((entry, index) => (
                <tr 
                  key={index}
                  className={entry.processing_time > 10 ? 'bg-red-50' : undefined}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(entry.time)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {entry.processing_time.toFixed(3)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xl truncate">
                    {entry.request_url}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {entry.pid}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      entry.elb_status_code.startsWith('2') ? 'bg-green-100 text-green-800' :
                      entry.elb_status_code.startsWith('3') ? 'bg-blue-100 text-blue-800' :
                      entry.elb_status_code.startsWith('4') ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {entry.elb_status_code}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-700">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length} results
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}