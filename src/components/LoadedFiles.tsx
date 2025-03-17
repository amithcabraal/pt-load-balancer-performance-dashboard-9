import React from 'react';
import { File, FileX } from 'lucide-react';
import { DataState, DataFormat } from '../types';

interface LoadedFilesProps {
  dataState: DataState;
  onClear: (format?: DataFormat) => void;
}

export function LoadedFiles({ dataState, onClear }: LoadedFilesProps) {
  const hasFiles = dataState.fileNames.loadBalancer || 
                  dataState.fileNames.performance || 
                  dataState.fileNames.slowQueries ||
                  dataState.fileNames.errorSummary;

  if (!hasFiles) return null;

  const multipleFiles = [
    dataState.fileNames.loadBalancer,
    dataState.fileNames.performance,
    dataState.fileNames.slowQueries,
    dataState.fileNames.errorSummary
  ].filter(Boolean).length > 1;

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-medium text-gray-900">Loaded Files</h3>
        {multipleFiles && (
          <button
            onClick={() => onClear()}
            className="text-sm text-red-500 hover:text-red-700 font-medium flex items-center gap-1"
          >
            <FileX className="w-4 h-4" />
            Remove All
          </button>
        )}
      </div>
      <div className="space-y-2">
        {dataState.fileNames.loadBalancer && (
          <FileEntry
            label="Load Balancer Data"
            fileName={dataState.fileNames.loadBalancer}
            onRemove={() => onClear('loadbalancer')}
          />
        )}
        {dataState.fileNames.performance && (
          <FileEntry
            label="Performance Data"
            fileName={dataState.fileNames.performance}
            onRemove={() => onClear('performance')}
          />
        )}
        {dataState.fileNames.slowQueries && (
          <FileEntry
            label="Slow Requests Data"
            fileName={dataState.fileNames.slowQueries}
            onRemove={() => onClear('slowqueries')}
          />
        )}
        {dataState.fileNames.errorSummary && (
          <FileEntry
            label="Error Summary Data"
            fileName={dataState.fileNames.errorSummary}
            onRemove={() => onClear('errorsummary')}
          />
        )}
      </div>
    </div>
  );
}

interface FileEntryProps {
  label: string;
  fileName: string;
  onRemove: () => void;
}

function FileEntry({ label, fileName, onRemove }: FileEntryProps) {
  return (
    <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-3">
        <File className="w-5 h-5 text-blue-500" />
        <div>
          <div className="text-sm text-gray-500">{label}:</div>
          <div className="text-sm font-medium text-gray-900">{fileName}</div>
        </div>
      </div>
      <button
        onClick={onRemove}
        className="text-sm text-red-500 hover:text-red-700 font-medium flex items-center gap-1"
      >
        <FileX className="w-4 h-4" />
        Remove
      </button>
    </div>
  );
}