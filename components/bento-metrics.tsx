'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart3, AlertTriangle, Shield, TrendingUp, FileX, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HealthScore } from '@/lib/types';

interface BentoMetricsProps {
  healthScore: HealthScore;
  totalIssues: number;
}

export default function BentoMetrics({ healthScore, totalIssues }: BentoMetricsProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreGradient = (score: number) => {
    if (score >= 80) return 'from-green-500/20 to-green-600/20';
    if (score >= 60) return 'from-yellow-500/20 to-yellow-600/20';
    return 'from-red-500/20 to-red-600/20';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {/* Main Health Score - Takes up more space */}
      <Card className={cn(
        "md:col-span-2 lg:col-span-3 bg-gradient-to-br border-gray-700/50 relative overflow-hidden",
        getScoreGradient(healthScore.score)
      )}>
        <CardContent className="p-6 relative">
          <div className="absolute top-4 right-4 opacity-20">
            <BarChart3 className="w-16 h-16" />
          </div>
          <div className="space-y-2">
            <p className="text-gray-300 text-sm font-medium">Configuration Health</p>
            <div className="flex items-end gap-2">
              <span className={cn("text-4xl font-bold", getScoreColor(healthScore.score))}>
                {healthScore.score}
              </span>
              <span className="text-gray-400 text-lg mb-1">%</span>
            </div>
            <p className="text-gray-400 text-xs">
              {healthScore.score >= 80 ? 'Excellent' : 
               healthScore.score >= 60 ? 'Good' : 'Needs Attention'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* High Risk Issues */}
      <Card className="bg-gradient-to-br from-red-500/10 to-red-600/10 border-red-500/20">
        <CardContent className="p-4 relative">
          <div className="absolute top-3 right-3 opacity-30">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <div className="space-y-1">
            <p className="text-gray-300 text-xs font-medium">High Risk</p>
            <div className="text-2xl font-bold text-red-400">
              {healthScore.highRisk}
            </div>
            <p className="text-red-300/70 text-xs">Critical issues</p>
          </div>
        </CardContent>
      </Card>

      {/* Medium Risk Issues */}
      <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border-yellow-500/20">
        <CardContent className="p-4 relative">
          <div className="absolute top-3 right-3 opacity-30">
            <Shield className="w-8 h-8 text-yellow-400" />
          </div>
          <div className="space-y-1">
            <p className="text-gray-300 text-xs font-medium">Medium Risk</p>
            <div className="text-2xl font-bold text-yellow-400">
              {healthScore.mediumRisk}
            </div>
            <p className="text-yellow-300/70 text-xs">Moderate issues</p>
          </div>
        </CardContent>
      </Card>

      {/* Low Risk Issues */}
      <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20">
        <CardContent className="p-4 relative">
          <div className="absolute top-3 right-3 opacity-30">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <div className="space-y-1">
            <p className="text-gray-300 text-xs font-medium">Low Risk</p>
            <div className="text-2xl font-bold text-green-400">
              {healthScore.lowRisk}
            </div>
            <p className="text-green-300/70 text-xs">Minor issues</p>
          </div>
        </CardContent>
      </Card>

      {/* Total Issues - Spans remaining space */}
      <Card className="md:col-span-2 lg:col-span-2 bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20">
        <CardContent className="p-4 relative">
          <div className="absolute top-3 right-3 opacity-30">
            <FileX className="w-8 h-8 text-blue-400" />
          </div>
          <div className="space-y-2">
            <p className="text-gray-300 text-sm font-medium">Total Issues Found</p>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-blue-400">{totalIssues}</span>
              <span className="text-gray-400 text-sm mb-1">discrepancies</span>
            </div>
            <div className="flex gap-1">
              <div className="h-1 flex-1 bg-red-500/50 rounded"></div>
              <div className="h-1 flex-1 bg-yellow-500/50 rounded"></div>
              <div className="h-1 flex-1 bg-green-500/50 rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}