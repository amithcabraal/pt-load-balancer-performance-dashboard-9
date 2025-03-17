import React, { useCallback } from 'react';
import { Upload } from 'lucide-react';
import Papa from 'papaparse';
import JSZip from 'jszip';
import { LoadBalancerEntry, PerformanceMetricsEntry, SlowQueryEntry, ErrorSummaryEntry, DataFormat, DataState } from '../types';
import { LoadedFiles } from './LoadedFiles';

interface FileUploadProps {
  onDataLoaded: (data: LoadBalancerEntry[] | PerformanceMetricsEntry[] | SlowQueryEntry[] | ErrorSummaryEntry[], format: DataFormat, fileName: string) => void;
  dataState: DataState;
  onClear: (format?: DataFormat) => void;
}

const extractPlayerId = (url: string): string => {
  const match = url.match(/\/(\d+)(?:\/[^\/]+)?$/);
  return match ? match[1] : '';
};

export function FileUpload({ onDataLoaded, dataState, onClear }: FileUploadProps) {
  const processCSVContent = useCallback((content: string, fileName: string) => {
    // First try to parse as error summary (space-separated format)
    const lines = content.trim().split('\n');
    const firstLine = lines[0].trim();
    const isErrorSummary = /^\s*\d+\s+".*"$/.test(firstLine) || /^\s*\d+\s+{.*}$/.test(firstLine);

    if (isErrorSummary) {
      const data = lines.map(line => {
        // Match either "count" followed by text in quotes, or "count" followed by JSON-like content
        const match = line.match(/^\s*(\d+)\s+(?:"([^"]+)"|({.*})|(.+))$/);
        if (match) {
          const [, count, quotedMessage, jsonMessage, plainMessage] = match;
          let message = quotedMessage || jsonMessage || plainMessage;
          // If it's a JSON message, keep it as is, otherwise trim
          if (!jsonMessage) {
            message = message.trim();
          }
          return {
            count: parseInt(count, 10),
            message: message
          };
        }
        return null;
      }).filter((item): item is ErrorSummaryEntry => item !== null);
      
      onDataLoaded(data, 'errorsummary', fileName);
      return;
    }

    // Otherwise process as CSV
    Papa.parse(content, {
      header: true,
      skipEmptyLines: true,
      transform: (value) => value.trim(),
      complete: (results) => {
        const firstRow = results.data[0] as any;
        
        if ('time' in firstRow && 'processing_time' in firstRow && 'request_url' in firstRow) {
          const data = results.data
            .filter((row: any) => 
              row.time && 
              !isNaN(row.processing_time) && 
              row.request_url && 
              row.elb_status_code
            )
            .map((row: any) => ({
              time: row.time,
              processing_time: Number(row.processing_time),
              request_url: row.request_url,
              pid: extractPlayerId(row.request_url),
              elb_status_code: row.elb_status_code
            }));
          onDataLoaded(data, 'slowqueries', fileName);
        }
        else if ('base_url' in firstRow && 'min_rt' in firstRow) {
          const data = results.data
            .filter((row: any) => 
              row.base_url && 
              !isNaN(row.min_rt) && 
              !isNaN(row.max_rt) && 
              !isNaN(row.avg_rt)
            )
            .map((row: any) => ({
              base_url: row.base_url,
              request_verb: row.request_verb,
              min_rt: Number(row.min_rt),
              max_rt: Number(row.max_rt),
              avg_rt: Number(row.avg_rt),
              P25: Number(row.P25),
              P50: Number(row.P50),
              P60: Number(row.P60),
              P75: Number(row.P75),
              P90: Number(row.P90),
              P95: Number(row.P95),
              total: Number(row.total),
              requests: Number(row.requests)
            }));
          onDataLoaded(data, 'performance', fileName);
        }
        else {
          const data = results.data
            .filter((row: any) => 
              row.normalized_url && 
              row.elb_status_code && 
              row.request_verb && 
              row.processing_time_bucket && 
              !isNaN(row.count) && 
              !isNaN(row.total_requests) && 
              !isNaN(row.percentage)
            )
            .map((row: any) => ({
              normalized_url: row.normalized_url,
              elb_status_code: row.elb_status_code,
              request_verb: row.request_verb,
              processing_time_bucket: row.processing_time_bucket,
              count: Number(row.count),
              total_requests: Number(row.total_requests),
              percentage: Number(row.percentage)
            }));
          onDataLoaded(data, 'loadbalancer', fileName);
        }
      }
    });
  }, [onDataLoaded]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (file.name.endsWith('.zip')) {
        const zip = new JSZip();
        const zipContent = await zip.loadAsync(file);
        
        const allFiles = Object.entries(zipContent.files).filter(([name]) => 
          name.endsWith('.csv') || name.endsWith('.txt')
        );
        
        for (const [fileName, zipEntry] of allFiles) {
          if (!zipEntry.dir) {
            const content = await zipEntry.async('string');
            processCSVContent(content, fileName);
          }
        }
      } else if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          if (content) {
            processCSVContent(content, file.name);
          }
        };
        reader.readAsText(file);
      }
    }

    event.target.value = '';
  };

  const hasData = dataState.loadBalancerData || dataState.performanceData || 
                  dataState.slowQueriesData || dataState.errorSummaryData;

  return (
    <div className="w-full max-w-xl mx-auto p-6 space-y-4">
      {hasData ? (
        <>
          <LoadedFiles dataState={dataState} onClear={onClear} />
          <button
            onClick={() => document.getElementById('fileInput')?.click()}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white rounded-lg shadow-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
          >
            <Upload className="w-5 h-5 text-blue-500" />
            Upload Additional Files
            <input
              id="fileInput"
              type="file"
              className="hidden"
              accept=".csv,.txt,.zip"
              multiple
              onChange={handleFileUpload}
            />
          </button>
        </>
      ) : (
        <label className="flex flex-col items-center px-4 py-6 bg-white rounded-lg shadow-lg cursor-pointer hover:bg-gray-50 transition-colors">
          <Upload className="w-12 h-12 text-blue-500 mb-2" />
          <span className="text-lg font-medium text-gray-700">Upload Files</span>
          <span className="text-sm text-gray-500 mt-1">
            Supports CSV files, TXT files, or ZIP containing these files
          </span>
          <span className="text-xs text-gray-400 mt-1">
            Load Balancer, Performance Metrics, Slow Requests, and Error Summary formats
          </span>
          <input
            type="file"
            className="hidden"
            accept=".csv,.txt,.zip"
            multiple
            onChange={handleFileUpload}
          />
        </label>
      )}
    </div>
  );
}