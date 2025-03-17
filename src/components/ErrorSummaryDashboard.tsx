import React, { useState } from 'react';
import { Search, ChevronRight } from 'lucide-react';
import { ErrorSummaryEntry } from '../types';

interface ErrorSummaryDashboardProps {
  data: ErrorSummaryEntry[];
}

const tryParseJSON = (text: string): { isJSON: boolean; parsed?: any } => {
  try {
    // Check if the string starts with a { or [ and try to parse it
    if ((text.startsWith('{') || text.startsWith('[')) && text.trim()) {
      const parsed = JSON.parse(text);
      return { isJSON: true, parsed };
    }
    // Check if it's a string-encoded JSON (with escaped quotes)
    if (text.startsWith('"') && text.endsWith('"')) {
      const unescaped = JSON.parse(text);
      if (typeof unescaped === 'string' && 
         (unescaped.startsWith('{') || unescaped.startsWith('['))) {
        const parsed = JSON.parse(unescaped);
        return { isJSON: true, parsed };
      }
    }
    return { isJSON: false };
  } catch (e) {
    return { isJSON: false };
  }
};

export function ErrorSummaryDashboard({ data }: ErrorSummaryDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [prettyPrintedRows, setPrettyPrintedRows] = useState<Set<number>>(new Set());
  const itemsPerPage = 20;

  const filteredData = data.filter(entry =>
    entry.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.count.toString().includes(searchTerm)
  );

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const pageData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const toggleRow = (index: number) => {
    const newExpandedRows = new Set(expandedRows);
    if (expandedRows.has(index)) {
      newExpandedRows.delete(index);
      // Also remove pretty printing when collapsing
      const newPrettyPrintedRows = new Set(prettyPrintedRows);
      newPrettyPrintedRows.delete(index);
      setPrettyPrintedRows(newPrettyPrintedRows);
    } else {
      newExpandedRows.add(index);
    }
    setExpandedRows(newExpandedRows);
  };

  const togglePrettyPrint = (e: React.MouseEvent, index: number, message: string) => {
    e.stopPropagation(); // Prevent row toggle
    const newPrettyPrintedRows = new Set(prettyPrintedRows);
    if (prettyPrintedRows.has(index)) {
      newPrettyPrintedRows.delete(index);
    } else {
      newPrettyPrintedRows.add(index);
      // Ensure row is expanded when pretty printing
      if (!expandedRows.has(index)) {
        const newExpandedRows = new Set(expandedRows);
        newExpandedRows.add(index);
        setExpandedRows(newExpandedRows);
      }
    }
    setPrettyPrintedRows(newPrettyPrintedRows);
  };

  return (
    <div className="w-full space-y-8 p-6">
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Error Summary Analysis</h2>
          <div className="relative w-96">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search errors..."
              className="w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            />
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-8 px-6 py-3"></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Count
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Error Message
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pageData.map((entry, index) => {
                const isExpanded = expandedRows.has(index);
                const isPrettyPrinted = prettyPrintedRows.has(index);
                const { isJSON, parsed } = tryParseJSON(entry.message);
                
                return (
                  <tr 
                    key={index}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => toggleRow(index)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <ChevronRight 
                        className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {entry.count}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className={isExpanded ? '' : 'line-clamp-2'}>
                        {isJSON && isPrettyPrinted ? (
                          <pre className="bg-gray-50 p-2 rounded">
                            {JSON.stringify(parsed, null, 2)}
                          </pre>
                        ) : (
                          entry.message
                        )}
                      </div>
                      {isJSON && isExpanded && (
                        <button
                          onClick={(e) => togglePrettyPrint(e, index, entry.message)}
                          className="text-blue-500 hover:text-blue-700 text-sm mt-2 px-2 py-1 bg-blue-50 rounded"
                        >
                          {isPrettyPrinted ? 'Show Raw' : 'Pretty Print JSON'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
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
