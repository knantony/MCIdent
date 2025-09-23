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
    if (score >= 80) return 'bg-green-800';
    if (score >= 60) return 'bg-yellow-700';
    return 'bg-red-800';
  };

  const getRiskColor = (risk: 'High' | 'Medium' | 'Low') => {
    if (risk === 'High') return 'bg-red-800';
    if (risk === 'Medium') return 'bg-yellow-700';
    return 'bg-green-800';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Health Score Card */}
      <Card className="bg-[#131316] border border-[#232326] rounded-2xl shadow-lg flex flex-col justify-between h-full p-4">
        <div className="flex flex-row justify-between items-start mb-2">
          <span className="text-base font-medium text-foreground">Configuration Health</span>
          <span className="inline-flex items-center gap-1 bg-[#232326] text-xs px-2 py-0.5 rounded-full text-muted-foreground font-semibold">
            {healthScore.score >= 80 ? <TrendingUp className="w-3 h-3 mr-1 text-green-400" /> : <AlertTriangle className="w-3 h-3 mr-1 text-red-400" />}
            {healthScore.score}%
          </span>
        </div>
        <div className="text-4xl font-bold text-white mb-1">{healthScore.score}</div>
        <div className="text-sm font-semibold text-muted-foreground mb-1">
          {healthScore.score >= 80 ? 'Excellent' : healthScore.score >= 60 ? 'Good' : 'Needs Attention'}
        </div>
        <div className="text-xs text-muted-foreground mt-1">Overall config health</div>
      </Card>

      {/* High Risk Card */}
      <Card className="bg-[#131316] border border-[#232326] rounded-2xl shadow-lg flex flex-col justify-between h-full p-4">
        <div className="flex flex-row justify-between items-start mb-2">
          <span className="text-base font-medium text-foreground">High Risk</span>
          <span className="inline-flex items-center gap-1 bg-[#232326] text-xs px-2 py-0.5 rounded-full text-red-400 font-semibold">
            <AlertTriangle className="w-3 h-3 mr-1" />
            {healthScore.highRisk}
          </span>
        </div>
        <div className="text-4xl font-bold text-white mb-1">{healthScore.highRisk}</div>
        <div className="text-sm font-semibold text-red-400 mb-1">Critical issues</div>
        <div className="text-xs text-muted-foreground mt-1">Immediate attention needed</div>
      </Card>

      {/* Medium Risk Card */}
      <Card className="bg-[#131316] border border-[#232326] rounded-2xl shadow-lg flex flex-col justify-between h-full p-4">
        <div className="flex flex-row justify-between items-start mb-2">
          <span className="text-base font-medium text-foreground">Medium Risk</span>
          <span className="inline-flex items-center gap-1 bg-[#232326] text-xs px-2 py-0.5 rounded-full text-yellow-400 font-semibold">
            <Shield className="w-3 h-3 mr-1" />
            {healthScore.mediumRisk}
          </span>
        </div>
        <div className="text-4xl font-bold text-white mb-1">{healthScore.mediumRisk}</div>
        <div className="text-sm font-semibold text-yellow-400 mb-1">Moderate issues</div>
        <div className="text-xs text-muted-foreground mt-1">Review recommended</div>
      </Card>

      {/* Low Risk Card */}
      <Card className="bg-[#131316] border border-[#232326] rounded-2xl shadow-lg flex flex-col justify-between h-full p-4">
        <div className="flex flex-row justify-between items-start mb-2">
          <span className="text-base font-medium text-foreground">Low Risk</span>
          <span className="inline-flex items-center gap-1 bg-[#232326] text-xs px-2 py-0.5 rounded-full text-green-400 font-semibold">
            <CheckCircle className="w-3 h-3 mr-1" />
            {healthScore.lowRisk}
          </span>
        </div>
        <div className="text-4xl font-bold text-white mb-1">{healthScore.lowRisk}</div>
        <div className="text-sm font-semibold text-green-400 mb-1">Minor issues</div>
        <div className="text-xs text-muted-foreground mt-1">All good</div>
      </Card>

      {/* Total Issues Card */}
      <Card className="bg-[#131316] border border-[#232326] rounded-2xl shadow-lg flex flex-col justify-between h-full p-4">
        <div className="flex flex-row justify-between items-start mb-2">
          <span className="text-base font-medium text-foreground">Total Issues Found</span>
          <span className="inline-flex items-center gap-1 bg-[#232326] text-xs px-2 py-0.5 rounded-full text-blue-400 font-semibold">
            <FileX className="w-3 h-3 mr-1" />
            {totalIssues}
          </span>
        </div>
        <div className="text-4xl font-bold text-white mb-1">{totalIssues}</div>
        <div className="text-sm font-semibold text-blue-400 mb-1">Discrepancies</div>
        <div className="text-xs text-muted-foreground mt-1">Acquisition needs attention</div>
      </Card>
    </div>
  );
}