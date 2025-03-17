import React, { useState } from 'react';
import { FileUpload } from './components/FileUpload';
import { Dashboard } from './components/Dashboard';
import { PerformanceDashboard } from './components/PerformanceDashboard';
import { SlowQueriesDashboard } from './components/SlowQueriesDashboard';
import { ErrorSummaryDashboard } from './components/ErrorSummaryDashboard';
import { MenuBar } from './components/MenuBar';
import { LoadBalancerEntry, PerformanceMetricsEntry, SlowQueryEntry, ErrorSummaryEntry, DataFormat, DataState, TabType } from './types';
import { BarChart, LayoutDashboard, Activity, Clock, AlertTriangle } from 'lucide-react';

function App() {
  const [dataState, setDataState] = useState<DataState>({
    loadBalancerData: null,
    performanceData: null,
    slowQueriesData: null,
    errorSummaryData: null,
    fileNames: {}
  });
  const [activeTab, setActiveTab] = useState<TabType>(null);

  const handleDataLoaded = (
    newData: LoadBalancerEntry[] | PerformanceMetricsEntry[] | SlowQueryEntry[] | ErrorSummaryEntry[], 
    format: DataFormat, 
    fileName: string
  ) => {
    setDataState(prev => ({
      ...prev,
      [format === 'loadbalancer' ? 'loadBalancerData' : 
       format === 'performance' ? 'performanceData' : 
       format === 'slowqueries' ? 'slowQueriesData' : 'errorSummaryData']: newData,
      fileNames: {
        ...prev.fileNames,
        [format === 'loadbalancer' ? 'loadBalancer' : 
         format === 'performance' ? 'performance' : 
         format === 'slowqueries' ? 'slowQueries' : 'errorSummary']: fileName
      }
    }));

    // Set active tab based on available data
    if (!activeTab) {
      setActiveTab(
        format === 'loadbalancer' ? 'summary' : 
        format === 'performance' ? 'stats' : 
        format === 'slowqueries' ? 'slow' : 'errors'
      );
    }
  };

  const handleClear = (format?: DataFormat) => {
    if (!format) {
      setDataState({
        loadBalancerData: null,
        performanceData: null,
        slowQueriesData: null,
        errorSummaryData: null,
        fileNames: {}
      });
      setActiveTab(null);
    } else {
      setDataState(prev => ({
        ...prev,
        [format === 'loadbalancer' ? 'loadBalancerData' : 
         format === 'performance' ? 'performanceData' : 
         format === 'slowqueries' ? 'slowQueriesData' : 'errorSummaryData']: null,
        fileNames: {
          ...prev.fileNames,
          [format === 'loadbalancer' ? 'loadBalancer' : 
           format === 'performance' ? 'performance' : 
           format === 'slowqueries' ? 'slowQueries' : 'errorSummary']: undefined
        }
      }));

      if (
        (format === 'loadbalancer' && activeTab === 'summary') ||
        (format === 'performance' && activeTab === 'stats') ||
        (format === 'slowqueries' && activeTab === 'slow') ||
        (format === 'errorsummary' && activeTab === 'errors')
      ) {
        if (format !== 'loadbalancer' && dataState.loadBalancerData) setActiveTab('summary');
        else if (format !== 'performance' && dataState.performanceData) setActiveTab('stats');
        else if (format !== 'slowqueries' && dataState.slowQueriesData) setActiveTab('slow');
        else if (format !== 'errorsummary' && dataState.errorSummaryData) setActiveTab('errors');
        else setActiveTab(null);
      }
    }
  };

  const hasData = dataState.loadBalancerData || dataState.performanceData || 
                  dataState.slowQueriesData || dataState.errorSummaryData;
  const hasMultipleDataTypes = [
    dataState.loadBalancerData,
    dataState.performanceData,
    dataState.slowQueriesData,
    dataState.errorSummaryData
  ].filter(Boolean).length > 1;

  return (
    <div className="min-h-screen bg-gray-100">
      <MenuBar />
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <BarChart className="w-8 h-8 text-blue-500" />
            Performance Analysis Dashboard
          </h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <FileUpload 
          onDataLoaded={handleDataLoaded}
          dataState={dataState}
          onClear={handleClear}
        />

        {hasData && (
          <div className="mt-6">
            {hasMultipleDataTypes && (
              <div className="mb-6 flex gap-2">
                {dataState.loadBalancerData && (
                  <button
                    onClick={() => setActiveTab('summary')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      activeTab === 'summary'
                        ? 'bg-blue-500 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Summary View
                  </button>
                )}
                {dataState.performanceData && (
                  <button
                    onClick={() => setActiveTab('stats')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      activeTab === 'stats'
                        ? 'bg-blue-500 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Activity className="w-4 h-4" />
                    Statistics View
                  </button>
                )}
                {dataState.slowQueriesData && (
                  <button
                    onClick={() => setActiveTab('slow')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      activeTab === 'slow'
                        ? 'bg-blue-500 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    Slow Requests
                  </button>
                )}
                {dataState.errorSummaryData && (
                  <button
                    onClick={() => setActiveTab('errors')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      activeTab === 'errors'
                        ? 'bg-blue-500 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4" />
                    Error Summary
                  </button>
                )}
              </div>
            )}

            {(activeTab === 'summary' || (!hasMultipleDataTypes && dataState.loadBalancerData)) && (
              <Dashboard data={dataState.loadBalancerData!} />
            )}
            
            {(activeTab === 'stats' || (!hasMultipleDataTypes && dataState.performanceData)) && (
              <PerformanceDashboard data={dataState.performanceData!} />
            )}

            {(activeTab === 'slow' || (!hasMultipleDataTypes && dataState.slowQueriesData)) && (
              <SlowQueriesDashboard data={dataState.slowQueriesData!} />
            )}

            {(activeTab === 'errors' || (!hasMultipleDataTypes && dataState.errorSummaryData)) && (
              <ErrorSummaryDashboard data={dataState.errorSummaryData!} />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;