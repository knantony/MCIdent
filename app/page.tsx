'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ComparisonResult, ComparisonApiResponse, FileUploadState, AnalysisState, HealthScore } from '@/lib/types';
import { Loader2, Download, Sparkles, FileCode } from 'lucide-react';
import FileDropZone from '@/components/file-dropzone';
import BentoMetrics from '@/components/bento-metrics';
import CodeDiff from '@/components/code-diff';

export default function Home() {
  const [fileUploadState, setFileUploadState] = useState<FileUploadState>({
    devFile: null,
    prodFile: null
  });

  const [analysisState, setAnalysisState] = useState<AnalysisState>({
    isLoading: false,
    results: null,
    error: null,
    healthScore: null
  });

  const [configContents, setConfigContents] = useState<{
    devConfig: string;
    prodConfig: string;
  }>({ devConfig: '', prodConfig: '' });

  const handleFileChange = (fileType: 'dev' | 'prod', file: File | null) => {
    setFileUploadState(prev => ({
      ...prev,
      [fileType === 'dev' ? 'devFile' : 'prodFile']: file
    }));
    
    // Clear previous results and errors when new files are selected
    setAnalysisState(prev => ({
      ...prev,
      results: null,
      error: null,
      healthScore: null
    }));
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  };

  const calculateHealthScore = (results: ComparisonResult[]): HealthScore => {
    const highRisk = results.filter(r => r.risk === 'High').length;
    const mediumRisk = results.filter(r => r.risk === 'Medium').length;
    const lowRisk = results.filter(r => r.risk === 'Low').length;
    
    // Calculate score based on weighted risk levels
    const totalIssues = results.length;
    const riskScore = (highRisk * 3 + mediumRisk * 2 + lowRisk * 1);
    const maxPossibleScore = totalIssues * 3;
    const score = Math.max(0, Math.round(100 - (riskScore / maxPossibleScore) * 100));
    
    return { score, highRisk, mediumRisk, lowRisk };
  };

  const handleCompareFiles = async () => {
    if (!fileUploadState.devFile || !fileUploadState.prodFile) return;

    setAnalysisState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const devConfig = await readFileAsText(fileUploadState.devFile);
      const prodConfig = await readFileAsText(fileUploadState.prodFile);

      // Store config contents for the code diff component
      setConfigContents({ devConfig, prodConfig });

      const response = await fetch('/api/compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ devConfig, prodConfig }),
      });

      const result: ComparisonApiResponse = await response.json();

      if (result.success && result.data) {
        const healthScore = calculateHealthScore(result.data);
        setAnalysisState({
          isLoading: false,
          results: result.data,
          error: null,
          healthScore
        });
      } else {
        setAnalysisState({
          isLoading: false,
          results: null,
          error: result.error || 'Analysis failed. Please try again.',
          healthScore: null
        });
      }
    } catch (error) {
      console.error('Error comparing files:', error);
      setAnalysisState({
        isLoading: false,
        results: null,
        error: 'Failed to analyze configurations. Please check your files and try again.',
        healthScore: null
      });
    }
  };

  const handleExportReport = () => {
    if (!analysisState.results) return;

    // Create CSV content
    const csvHeader = 'Key,Dev Value,Prod Value,Observation,Suggestion,Risk Level\n';
    const csvContent = analysisState.results.map(result => 
      `"${result.key}","${result.devValue}","${result.prodValue}","${result.observation}","${result.suggestion}","${result.risk}"`
    ).join('\n');
    
    const csvData = csvHeader + csvContent;
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'config-comparison-report.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const getRiskBadgeVariant = (risk: string) => {
    switch (risk) {
      case 'High': return 'destructive';
      case 'Medium': return 'default';
      case 'Low': return 'secondary';
      default: return 'secondary';
    }
  };

  const canCompare = fileUploadState.devFile && fileUploadState.prodFile && !analysisState.isLoading;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Config Compare AI
          </h1>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto">
            Analyze configuration drift between environments. Upload your Dev and Prod files (JSON/YAML) to get an AI-powered analysis.
          </p>
        </div>

        {/* File Upload Section */}
        {!analysisState.isLoading && !analysisState.results && (
          <div className="mb-8">
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <FileDropZone
                title="Development Config"
                description="Upload your development environment configuration file"
                file={fileUploadState.devFile}
                onFileChange={(file) => handleFileChange('dev', file)}
              />
              <FileDropZone
                title="Production Config"
                description="Upload your production environment configuration file"
                file={fileUploadState.prodFile}
                onFileChange={(file) => handleFileChange('prod', file)}
              />
            </div>

            {/* Compare Button */}
            <div className="text-center">
              <Button
                onClick={handleCompareFiles}
                disabled={!canCompare}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:bg-gray-700 disabled:text-gray-400 text-white font-medium px-8 py-3"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Analyze with AI
              </Button>
            </div>

            {/* Error Display */}
            {analysisState.error && (
              <div className="mt-6">
                <Alert className="bg-red-950 border-red-800">
                  <AlertDescription className="text-red-200">
                    {analysisState.error}
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </div>
        )}

        {/* Loading State */}
        {analysisState.isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 animate-spin text-blue-400 mb-4" />
            <p className="text-xl text-gray-300">AI is analyzing your configurations...</p>
            <p className="text-gray-400 mt-2">This may take a few moments</p>
          </div>
        )}

        {/* Results Section */}
        {analysisState.results && analysisState.healthScore && (
          <div className="space-y-8">
            {/* Bento Box Metrics */}
            <BentoMetrics 
              healthScore={analysisState.healthScore} 
              totalIssues={analysisState.results.length} 
            />

            {/* Export Button */}
            <div className="flex justify-end">
              <Button
                onClick={handleExportReport}
                variant="outline"
                className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
            </div>

            {/* Code Diff Component */}
            <CodeDiff 
              devConfig={configContents.devConfig}
              prodConfig={configContents.prodConfig}
              comparisonResults={analysisState.results}
            />

            {/* Summary Table */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <FileCode className="w-5 h-5" />
                  Issues Summary
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Overview of all configuration discrepancies found
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-700">
                        <TableHead className="text-gray-300">Configuration Key</TableHead>
                        <TableHead className="text-gray-300">Issue Description</TableHead>
                        <TableHead className="text-gray-300">Recommendation</TableHead>
                        <TableHead className="text-gray-300">Risk</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analysisState.results.map((result, index) => (
                        <TableRow key={index} className="border-gray-700">
                          <TableCell className="font-mono text-blue-300">
                            {result.key}
                          </TableCell>
                          <TableCell className="text-gray-300 max-w-md">
                            {result.observation}
                          </TableCell>
                          <TableCell className="text-gray-300 max-w-md">
                            {result.suggestion}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getRiskBadgeVariant(result.risk) as any}>
                              {result.risk}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Reset Button */}
            <div className="text-center pt-8">
              <Button
                onClick={() => {
                  setFileUploadState({ devFile: null, prodFile: null });
                  setAnalysisState({ isLoading: false, results: null, error: null, healthScore: null });
                  setConfigContents({ devConfig: '', prodConfig: '' });
                }}
                variant="outline"
                className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
              >
                Analyze New Files
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
