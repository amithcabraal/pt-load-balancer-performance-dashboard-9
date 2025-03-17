import React, { useState } from 'react';
import { ExternalLink, HelpCircle, FileText } from 'lucide-react';
import { QueryGenerator } from './QueryGenerator';

export function MenuBar() {
  const [showInstructions, setShowInstructions] = useState(false);
  const [showQueryGenerator, setShowQueryGenerator] = useState(false);

  return (
    <div className="bg-white border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-3">
          <div className="flex items-center space-x-4">
            <a
              href="https://eu-west-2.console.aws.amazon.com/athena/home?region=eu-west-2"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 text-blue-600 hover:text-blue-800"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open AWS Athena</span>
            </a>
            <button
              onClick={() => setShowQueryGenerator(true)}
              className="flex items-center space-x-1 text-gray-600 hover:text-gray-800"
            >
              <FileText className="w-4 h-4" />
              <span>Generate Query</span>
            </button>
          </div>
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="flex items-center space-x-1 text-gray-600 hover:text-gray-800"
          >
            <HelpCircle className="w-4 h-4" />
            <span>Instructions</span>
          </button>
        </div>
      </div>
      
      {showInstructions && (
        <div className="border-t bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="prose prose-sm max-w-none">
              <h3 className="text-lg font-semibold mb-2">How to use this dashboard:</h3>
              <ol className="list-decimal list-inside space-y-2">
                <li>Click "Open AWS Athena" to access the query interface</li>
                <li>Click "Generate Query" to create queries with your desired date range</li>
                <li>Choose between Load Balancer Analysis or Performance Metrics queries</li>
                <li>Run the query in Athena and download the results as CSV</li>
                <li>Upload the CSV file using the upload button below</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      <QueryGenerator 
        isOpen={showQueryGenerator} 
        onClose={() => setShowQueryGenerator(false)} 
      />
    </div>
  );
}