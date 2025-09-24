'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, X, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileDropZoneProps {
  onFileChange: (file: File | null) => void;
  file: File | null;
  title: string;
  description: string;
  accept?: Record<string, string[]>;
  className?: string;
}

export default function FileDropZone({
  onFileChange,
  file,
  title,
  description,
  accept = {
    'application/json': ['.json'],
    'text/yaml': ['.yaml', '.yml'],
    'text/plain': ['.env', '.config', '.txt'],
  },
  className
}: FileDropZoneProps) {
  const [dragError, setDragError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setDragError(null);
    
    if (rejectedFiles.length > 0) {
      const error = rejectedFiles[0].errors[0];
      if (error.code === 'file-invalid-type') {
        setDragError('Please upload a JSON, YAML, or config file');
      } else if (error.code === 'file-too-large') {
        setDragError('File is too large. Please use a smaller file');
      } else {
        setDragError('Invalid file. Please try again');
      }
      return;
    }

    if (acceptedFiles.length > 0) {
      onFileChange(acceptedFiles[0]);
    }
  }, [onFileChange]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept,
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024, // 5MB limit
  });

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFileChange(null);
    setDragError(null);
  };

  return (
    <Card className={cn("bg-card border border-border rounded-xl shadow-sm transition-all duration-200", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <FileText className="w-5 h-5 text-vercel-blue" />
          {title}
        </CardTitle>
        <p className="text-muted-foreground text-sm">{description}</p>
      </CardHeader>
      <CardContent>
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200",
            "hover:border-vercel-blue hover:bg-secondary/60",
            isDragActive && !isDragReject && "border-vercel-blue bg-card",
            isDragReject && "border-vercel-red bg-card",
            file && "border-vercel-green bg-card",
            !file && "border-border"
          )}
        >
          <input {...getInputProps()} />
          
          {file ? (
            // File uploaded state
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <Badge variant="secondary" className="bg-black text-white border-gray-700">
                    <FileText className="w-3 h-3 mr-1" />
                    {file.name}
                  </Badge>
                  <button
                    onClick={handleRemoveFile}
                    className="text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-gray-400">
                  {(file.size / 1024).toFixed(1)} KB • Click or drag to replace
                </p>
              </div>
            </div>
          ) : dragError ? (
            // Error state
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <AlertCircle className="w-12 h-12 text-red-500" />
              </div>
              <div className="space-y-2">
                <p className="text-red-500 font-medium">{dragError}</p>
                <p className="text-gray-400 text-sm">
                  Supported: JSON, YAML, ENV, Config files
                </p>
              </div>
            </div>
          ) : isDragActive ? (
            // Drag active state
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <div className="w-12 h-12 border-2 border-gray-500 border-dashed rounded-full flex items-center justify-center">
                  <Upload className="w-6 h-6 text-gray-300" />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-gray-300 font-medium">
                  {isDragReject ? "File type not supported" : "Drop your file here"}
                </p>
                <p className="text-gray-400 text-sm">Release to upload</p>
              </div>
            </div>
          ) : (
            // Default state
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <div className="w-12 h-12 border-2 border-gray-800 border-dashed rounded-full flex items-center justify-center">
                  <Upload className="w-6 h-6 text-gray-500" />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-gray-300 font-medium">
                  Drag & drop your file here
                </p>
                <p className="text-gray-400 text-sm">
                  or <span className="text-gray-300 underline">click to browse</span>
                </p>
                <p className="text-xs text-gray-500">
                  Supports JSON, YAML, ENV, Config files (max 5MB)
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}