'use client';

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ComparisonResult } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Code, AlertTriangle, Info, CheckCircle } from 'lucide-react';

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

function SquiggleUnderline({ recommendation, risk, children }: SquiggleProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  return (
    <span
      className="relative"
      onMouseEnter={() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setShowTooltip(true);
      }}
      onMouseLeave={() => {
        timeoutRef.current = setTimeout(() => setShowTooltip(false), 200);
      }}
    >
      <span 
        className={cn(
          "relative",
          "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5",
          "after:bg-current after:opacity-60",
          risk === 'High' && "after:bg-red-400",
          risk === 'Medium' && "after:bg-yellow-400", 
          risk === 'Low' && "after:bg-green-400"
        )}
        style={{
          textDecorationLine: 'underline',
          textDecorationStyle: 'wavy',
          textDecorationColor: risk === 'High' ? '#f87171' : risk === 'Medium' ? '#facc15' : '#4ade80',
          textUnderlineOffset: '4px'
        }}
      >
        {children}
      </span>
      
      {showTooltip && (
        <div className={cn(
          "absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2",
          "bg-gray-800 border rounded-lg shadow-xl p-3 min-w-64 max-w-sm",
          getRiskColor(risk)
        )}>
          <div className="flex items-start gap-2 mb-2">
            {getRiskIcon(risk)}
            <Badge variant={risk === 'High' ? 'destructive' : risk === 'Medium' ? 'default' : 'secondary'} className="text-xs">
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

export default function CodeDiff({ devConfig, prodConfig, comparisonResults }: CodeDiffProps) {
  const [activeView, setActiveView] = useState<'side-by-side' | 'unified'>('side-by-side');
  
  // Parse JSON to format it properly
  const formatConfig = (config: string) => {
    try {
      return JSON.stringify(JSON.parse(config), null, 2);
    } catch {
      return config;
    }
  };

  const formattedDevConfig = formatConfig(devConfig);
  const formattedProdConfig = formatConfig(prodConfig);

  // Create a map of keys to their comparison results for quick lookup
  const resultMap = new Map<string, ComparisonResult>();
  comparisonResults.forEach(result => {
    resultMap.set(result.key, result);
  });

  // Function to highlight problematic lines with squiggles
  const highlightProblematicCode = (code: string, isDevConfig: boolean) => {
    if (!comparisonResults.length) return code;

    let highlightedCode = code;
    
    comparisonResults.forEach((result) => {
      const searchValue = isDevConfig ? result.devValue : result.prodValue;
      const keyPattern = new RegExp(`("${result.key.split('.').pop()}"\\s*:\\s*)(${JSON.stringify(searchValue)})`, 'g');
      
      highlightedCode = highlightedCode.replace(keyPattern, (match, keyPart, valuePart) => {
        return `${keyPart}<squiggle data-key="${result.key}" data-risk="${result.risk}">${valuePart}</squiggle>`;
      });
    });

    return highlightedCode;
  };

  if (activeView === 'side-by-side') {
    return (
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-white">
            <Code className="w-5 h-5" />
            Configuration Comparison
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant={activeView === 'side-by-side' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveView('side-by-side')}
              className="text-xs"
            >
              Side by Side
            </Button>
            <Button
              variant={activeView === 'unified' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveView('unified')}
              className="text-xs"
            >
              Unified
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Development Config */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="secondary" className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                  Development
                </Badge>
              </div>
              <div className="bg-gray-950 rounded-lg overflow-hidden border border-gray-700">
                <div className="p-4">
                  <div className="text-sm font-mono text-gray-300 whitespace-pre-wrap">
                    {highlightProblematicCode(formattedDevConfig, true)
                      .split('\n')
                      .map((line, lineIndex) => {
                        const squiggleRegex = /<squiggle data-key="([^"]*)" data-risk="([^"]*)">(.*?)<\/squiggle>/g;
                        const parts: React.ReactNode[] = [];
                        let lastIndex = 0;
                        let match;

                        while ((match = squiggleRegex.exec(line)) !== null) {
                          // Add text before the squiggle
                          if (match.index > lastIndex) {
                            parts.push(
                              <span 
                                key={`dev-before-${lineIndex}-${match.index}`}
                                dangerouslySetInnerHTML={{ 
                                  __html: line.substring(lastIndex, match.index)
                                    .replace(/(".*?")/g, '<span class="text-green-400">$1</span>')
                                    .replace(/(\{|\}|\[|\])/g, '<span class="text-yellow-400">$1</span>')
                                    .replace(/(true|false|null)/g, '<span class="text-blue-400">$1</span>')
                                    .replace(/(\d+)/g, '<span class="text-purple-400">$1</span>')
                                }} 
                              />
                            );
                          }
                          
                          // Add the squiggled text
                          const [, key, risk, value] = match;
                          const result = resultMap.get(key);
                          if (result) {
                            parts.push(
                              <SquiggleUnderline 
                                key={`dev-${lineIndex}-${match.index}`}
                                recommendation={result.suggestion}
                                risk={risk as 'Low' | 'Medium' | 'High'}
                              >
                                {value}
                              </SquiggleUnderline>
                            );
                          } else {
                            parts.push(value);
                          }
                          
                          lastIndex = squiggleRegex.lastIndex;
                        }
                        
                        // Add remaining text
                        if (lastIndex < line.length) {
                          const remainingText = line.substring(lastIndex);
                          parts.push(
                            <span 
                              key={`dev-remaining-${lineIndex}`}
                              dangerouslySetInnerHTML={{ 
                                __html: remainingText
                                  .replace(/(".*?")/g, '<span class="text-green-400">$1</span>')
                                  .replace(/(\{|\}|\[|\])/g, '<span class="text-yellow-400">$1</span>')
                                  .replace(/(true|false|null)/g, '<span class="text-blue-400">$1</span>')
                                  .replace(/(\d+)/g, '<span class="text-purple-400">$1</span>')
                              }} 
                            />
                          );
                        }
                        
                        return (
                          <div key={lineIndex} className="flex hover:bg-gray-900/30 px-2 -mx-2 rounded">
                            <span className="text-gray-500 text-right pr-4 select-none w-12 flex-shrink-0">
                              {lineIndex + 1}
                            </span>
                            <span className="flex-1">
                              {parts.length > 1 ? parts : (
                                <span dangerouslySetInnerHTML={{ 
                                  __html: line
                                    .replace(/(".*?")/g, '<span class="text-green-400">$1</span>')
                                    .replace(/(\{|\}|\[|\])/g, '<span class="text-yellow-400">$1</span>')
                                    .replace(/(true|false|null)/g, '<span class="text-blue-400">$1</span>')
                                    .replace(/(\d+)/g, '<span class="text-purple-400">$1</span>')
                                }} />
                              )}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            </div>

            {/* Production Config */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="secondary" className="bg-green-500/20 text-green-300 border-green-500/30">
                  Production
                </Badge>
              </div>
              <div className="bg-gray-950 rounded-lg overflow-hidden border border-gray-700">
                <div className="p-4">
                  <div className="text-sm font-mono text-gray-300 whitespace-pre-wrap">
                    {highlightProblematicCode(formattedProdConfig, false)
                      .split('\n')
                      .map((line, lineIndex) => {
                        const squiggleRegex = /<squiggle data-key="([^"]*)" data-risk="([^"]*)">(.*?)<\/squiggle>/g;
                        const parts: React.ReactNode[] = [];
                        let lastIndex = 0;
                        let match;

                        while ((match = squiggleRegex.exec(line)) !== null) {
                          // Add text before the squiggle
                          if (match.index > lastIndex) {
                            parts.push(
                              <span 
                                key={`prod-before-${lineIndex}-${match.index}`}
                                dangerouslySetInnerHTML={{ 
                                  __html: line.substring(lastIndex, match.index)
                                    .replace(/(".*?")/g, '<span class="text-green-400">$1</span>')
                                    .replace(/(\{|\}|\[|\])/g, '<span class="text-yellow-400">$1</span>')
                                    .replace(/(true|false|null)/g, '<span class="text-blue-400">$1</span>')
                                    .replace(/(\d+)/g, '<span class="text-purple-400">$1</span>')
                                }} 
                              />
                            );
                          }
                          
                          // Add the squiggled text
                          const [, key, risk, value] = match;
                          const result = resultMap.get(key);
                          if (result) {
                            parts.push(
                              <SquiggleUnderline 
                                key={`prod-${lineIndex}-${match.index}`}
                                recommendation={result.suggestion}
                                risk={risk as 'Low' | 'Medium' | 'High'}
                              >
                                {value}
                              </SquiggleUnderline>
                            );
                          } else {
                            parts.push(value);
                          }
                          
                          lastIndex = squiggleRegex.lastIndex;
                        }
                        
                        // Add remaining text
                        if (lastIndex < line.length) {
                          const remainingText = line.substring(lastIndex);
                          parts.push(
                            <span 
                              key={`prod-remaining-${lineIndex}`}
                              dangerouslySetInnerHTML={{ 
                                __html: remainingText
                                  .replace(/(".*?")/g, '<span class="text-green-400">$1</span>')
                                  .replace(/(\{|\}|\[|\])/g, '<span class="text-yellow-400">$1</span>')
                                  .replace(/(true|false|null)/g, '<span class="text-blue-400">$1</span>')
                                  .replace(/(\d+)/g, '<span class="text-purple-400">$1</span>')
                              }} 
                            />
                          );
                        }
                        
                        return (
                          <div key={lineIndex} className="flex hover:bg-gray-900/30 px-2 -mx-2 rounded">
                            <span className="text-gray-500 text-right pr-4 select-none w-12 flex-shrink-0">
                              {lineIndex + 1}
                            </span>
                            <span className="flex-1">
                              {parts.length > 1 ? parts : (
                                <span dangerouslySetInnerHTML={{ 
                                  __html: line
                                    .replace(/(".*?")/g, '<span class="text-green-400">$1</span>')
                                    .replace(/(\{|\}|\[|\])/g, '<span class="text-yellow-400">$1</span>')
                                    .replace(/(true|false|null)/g, '<span class="text-blue-400">$1</span>')
                                    .replace(/(\d+)/g, '<span class="text-purple-400">$1</span>')
                                }} />
                              )}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
            <p className="text-sm text-gray-300 flex items-center gap-2">
              <Info className="w-4 h-4" />
              Hover over <span className="underline decoration-wavy decoration-red-400">underlined code</span> to see AI recommendations
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Unified view would be implemented similarly but with a single column
  return (
    <Card className="bg-gray-900 border-gray-700">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-white">
          <Code className="w-5 h-5" />
          Configuration Comparison - Unified View
        </CardTitle>
        <div className="flex gap-2">
          <Button
            variant={activeView === 'side-by-side' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveView('side-by-side')}
            className="text-xs"
          >
            Side by Side
          </Button>
          <Button
            variant={activeView === 'unified' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveView('unified')}
            className="text-xs"
          >
            Unified
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-gray-400">
          <p>Unified diff view coming soon...</p>
        </div>
      </CardContent>
    </Card>
  );
}