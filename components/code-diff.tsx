'use client';

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Code, AlertTriangle, Info, CheckCircle } from 'lucide-react';

// Type definitions
interface ComparisonResult {
  key: string;
  devValue: string;
  prodValue: string;
  suggestion: string;
  risk: 'Low' | 'Medium' | 'High';
}

interface CodeDiffProps {
  devConfig: string;
  prodConfig: string;
  comparisonResults: ComparisonResult[];
}

interface SquiggleProps {
  recommendation: string;
  risk: 'Low' | 'Medium' | 'High';
  children: React.ReactNode;
}

// Helper functions
const getRiskColor = (risk: string) => {
  switch (risk) {
    case 'High': return 'border-red-400';
    case 'Medium': return 'border-yellow-400';
    case 'Low': return 'border-green-400';
    default: return 'border-gray-400';
  }
};

const getRiskIcon = (risk: string) => {
  switch (risk) {
    case 'High': return <AlertTriangle className="w-3 h-3 text-red-400" />;
    case 'Medium': return <Info className="w-3 h-3 text-yellow-400" />;
    case 'Low': return <CheckCircle className="w-3 h-3 text-green-400" />;
    default: return null;
  }
};

const getUnderlineColor = (risk: string) => {
  switch (risk) {
    case 'High': return '#f87171';
    case 'Medium': return '#facc15';
    case 'Low': return '#4ade80';
    default: return '#9ca3af';
  }
};

const getBadgeVariant = (risk: string) => {
  switch (risk) {
    case 'High': return 'destructive';
    case 'Medium': return 'default';
    case 'Low': return 'secondary';
    default: return 'secondary';
  }
};

// Components
function SquiggleUnderline({ recommendation, risk, children }: SquiggleProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setShowTooltip(false), 200);
  };

  return (
    <span
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span 
        className="relative"
        style={{
          textDecorationLine: 'underline',
          textDecorationStyle: 'wavy',
          textDecorationColor: getUnderlineColor(risk),
          textUnderlineOffset: '4px'
        }}
      >
        {children}
      </span>
      
      {showTooltip && (
        <div className={cn(
          "absolute z-[10000] bottom-full left-1/2 transform -translate-x-1/2 mb-2",
          "bg-black border rounded-lg shadow-xl p-3 min-w-64 max-w-sm",
          getRiskColor(risk)
        )}>
          <div className="flex items-start gap-2 mb-2">
            {getRiskIcon(risk)}
            <Badge variant={getBadgeVariant(risk)} className="text-xs">
              {risk} Risk
            </Badge>
          </div>
          <p className="text-sm text-gray-200 leading-relaxed">{recommendation}</p>
          <div className={cn(
            "absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0",
            "border-l-4 border-r-4 border-t-4 border-transparent",
            risk === 'High' && "border-t-red-400",
            risk === 'Medium' && "border-t-yellow-400",
            risk === 'Low' && "border-t-green-400"
          )} />
        </div>
      )}
    </span>
  );
}

function RiskLegend() {
  return (
    <div className="mt-4 p-3 bg-secondary rounded-lg border border-border">
      <div className="flex gap-4 items-center">
        <p className="text-xs text-muted-foreground flex items-center">
          <span className="inline-block w-3 h-3 rounded-full bg-red-400 mr-1"></span> 
          High Risk
        </p>
        <p className="text-xs text-muted-foreground flex items-center">
          <span className="inline-block w-3 h-3 rounded-full bg-yellow-400 mr-1"></span> 
          Medium Risk
        </p>
        <p className="text-xs text-muted-foreground flex items-center">
          <span className="inline-block w-3 h-3 rounded-full bg-green-400 mr-1"></span> 
          Low Risk
        </p>
      </div>
    </div>
  );
}

function CodeBlock({ 
  config, 
  title, 
  comparisonResults, 
  isDevConfig 
}: { 
  config: string; 
  title: string; 
  comparisonResults: ComparisonResult[]; 
  isDevConfig: boolean;
}) {
  const resultMap = new Map<string, ComparisonResult>();
  comparisonResults.forEach(result => {
    resultMap.set(result.key, result);
  });

  const highlightProblematicCode = (code: string) => {
    if (!comparisonResults.length) return code;

    let highlightedCode = code;
    
    comparisonResults.forEach((result) => {
      const searchValue = isDevConfig ? result.devValue : result.prodValue;
      const keyName = result.key.split('.').pop();
      
      // Support both JSON and YAML formats
      const jsonPattern = new RegExp(
        `("${keyName}"\\s*:\\s*)(${JSON.stringify(searchValue)})`, 
        'g'
      );
      // YAML pattern supports both quoted and unquoted values
      const yamlPattern = new RegExp(
        `(${keyName}\\s*:\\s*)("?${searchValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"?)`, 
        'g'
      );
      
      // Try JSON pattern first
      highlightedCode = highlightedCode.replace(jsonPattern, (match, keyPart, valuePart) => {
        return `${keyPart}<squiggle data-key="${result.key}" data-risk="${result.risk}">${valuePart}</squiggle>`;
      });
      
      // Then try YAML pattern
      highlightedCode = highlightedCode.replace(yamlPattern, (match, keyPart, valuePart) => {
        return `${keyPart}<squiggle data-key="${result.key}" data-risk="${result.risk}">${valuePart}</squiggle>`;
      });
    });

    return highlightedCode;
  };

  const renderCodeLine = (line: string, lineIndex: number) => {
    const squiggleRegex = /<squiggle data-key="([^"]*)" data-risk="([^"]*)">(.*?)<\/squiggle>/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = squiggleRegex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          <span key={`${lineIndex}-text-${lastIndex}`}>
            {line.substring(lastIndex, match.index)}
          </span>
        );
      }

      const [_, key, risk, content] = match;
      const result = resultMap.get(key);
      
      if (result) {
        parts.push(
          <SquiggleUnderline
            key={`${lineIndex}-squiggle-${match.index}`}
            risk={risk as 'Low' | 'Medium' | 'High'}
            recommendation={result.suggestion}
          >
            {content}
          </SquiggleUnderline>
        );
      } else {
        parts.push(<span key={`${lineIndex}-plain-${match.index}`}>{content}</span>);
      }

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < line.length) {
      parts.push(
        <span key={`${lineIndex}-text-end`}>
          {line.substring(lastIndex)}
        </span>
      );
    }

    return (
      <div key={lineIndex} className="flex hover:bg-muted/50 px-2 -mx-2 rounded">
        <div className="text-muted-foreground/60 w-8 text-right pr-4 select-none">
          {lineIndex + 1}
        </div>
        <div>
          {parts.length > 0 ? parts : line}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <Badge variant="secondary">
          {title}
        </Badge>
      </div>
  <div className="bg-secondary rounded-lg overflow-visible border border-border">
        <div className="p-4">
          <div className="text-sm font-mono text-muted-foreground whitespace-pre-wrap">
            {highlightProblematicCode(config)
              .split('\n')
              .map(renderCodeLine)}
          </div>
        </div>
      </div>
    </div>
  );
}

function ViewToggle({ 
  activeView, 
  onViewChange 
}: { 
  activeView: 'side-by-side' | 'unified';
  onViewChange: (view: 'side-by-side' | 'unified') => void;
}) {
  return (
    <div className="flex gap-2">
      <Button
        variant={activeView === 'side-by-side' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onViewChange('side-by-side')}
        className="text-xs"
      >
        Side by Side
      </Button>
      <Button
        variant={activeView === 'unified' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onViewChange('unified')}
        className="text-xs"
      >
        Unified View
      </Button>
    </div>
  );
}

function SideBySideView({ 
  devConfig, 
  prodConfig, 
  comparisonResults 
}: {
  devConfig: string;
  prodConfig: string;
  comparisonResults: ComparisonResult[];
}) {
  const formatConfig = (config: string) => {
    try {
      // Try to parse as JSON and format
      return JSON.stringify(JSON.parse(config), null, 2);
    } catch {
      // If not JSON, return as-is (could be YAML or other format)
      return config;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <CodeBlock 
        config={formatConfig(devConfig)}
        title="Development"
        comparisonResults={comparisonResults}
        isDevConfig={true}
      />
      <CodeBlock 
        config={formatConfig(prodConfig)}
        title="Production"
        comparisonResults={comparisonResults}
        isDevConfig={false}
      />
    </div>
  );
}

function UnifiedView({ comparisonResults }: { comparisonResults: ComparisonResult[] }) {
  return (
    <div className="space-y-2">
  <div className="bg-secondary rounded-lg overflow-visible border border-border">
        <div className="p-4">
          <div className="text-sm font-mono text-muted-foreground whitespace-pre-wrap">
            {comparisonResults.map((result, resultIndex) => (
              <div key={resultIndex} className="mb-4 pb-4 border-b border-border last:border-b-0">
                <div className="flex mb-2">
                  <div className="font-semibold text-foreground">{result.key}</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Badge variant="secondary" className="mb-2">
                      Development
                    </Badge>
                    <div className="pl-4 border-l-2 border-blue-500">
                      <SquiggleUnderline
                        risk={result.risk}
                        recommendation={result.suggestion}
                      >
                        {result.devValue}
                      </SquiggleUnderline>
                    </div>
                  </div>
                  <div>
                    <Badge variant="secondary" className="mb-2">
                      Production
                    </Badge>
                    <div className="pl-4 border-l-2 border-blue-500">
                      <SquiggleUnderline
                        risk={result.risk}
                        recommendation={result.suggestion}
                      >
                        {result.prodValue}
                      </SquiggleUnderline>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CodeDiff({ devConfig, prodConfig, comparisonResults }: CodeDiffProps) {
  const [activeView, setActiveView] = useState<'side-by-side' | 'unified'>('side-by-side');
  
  return (
    <Card className="bg-card border border-border rounded-xl shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pt-4">
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Code className="w-5 h-5 text-blue-500" />
          Configuration Comparison
        </CardTitle>
        <ViewToggle activeView={activeView} onViewChange={setActiveView} />
      </CardHeader>
      <CardContent>
        {activeView === 'side-by-side' ? (
          <SideBySideView 
            devConfig={devConfig}
            prodConfig={prodConfig}
            comparisonResults={comparisonResults}
          />
        ) : (
          <UnifiedView comparisonResults={comparisonResults} />
        )}
        <RiskLegend />
      </CardContent>
    </Card>
  );
}