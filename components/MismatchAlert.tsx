"use client";
import React from 'react';

type MismatchAlertProps = {
  storyValue: string;
  cellValue: string;
  onDismiss: () => void;
};

export function MismatchAlert({ storyValue, cellValue, onDismiss }: MismatchAlertProps) {
  // Map business values to relative importance
  const valueImportance: Record<string, number> = {
    'Critical': 3,
    'Important': 2,
    'Nice to Have': 1
  };
  
  // Map cell values to relative importance
  const cellImportance: Record<string, number> = {
    'high': 3,
    'medium': 2,
    'low': 1
  };
  
  // Determine the type of mismatch
  const storyImportance = valueImportance[storyValue] || 0;
  const cellValueImportance = cellImportance[cellValue] || 0;
  
  // Calculate mismatch severity (difference in importance levels)
  const mismatchSeverity = Math.abs(storyImportance - cellValueImportance);
  
  // Determine the mismatch type
  const isCriticalInLowValue = storyValue === 'Critical' && cellValue === 'low';
  const isNiceToHaveInHighValue = storyValue === 'Nice to Have' && cellValue === 'high';
  const isImportantInLowValue = storyValue === 'Important' && cellValue === 'low';
  const isUndervalued = storyImportance > cellValueImportance;
  const isOvervalued = storyImportance < cellValueImportance;
  
  // Generate appropriate message based on mismatch type
  const getMessage = () => {
    // Don't map the cell values - keep them as they are for clarity
    // instead, describe the matrix position more clearly
    const positionMap: Record<string, string> = {
      'high': 'high priority',
      'medium': 'medium priority',
      'low': 'low priority (Nice to Have)'
    };
    
    const positionDescription = positionMap[cellValue] || cellValue;
    
    if (isCriticalInLowValue) {
      return `This story has ${storyValue} business value but is placed in a ${positionDescription} position.`;
    } else if (isImportantInLowValue) {
      return `This story has ${storyValue} business value but is placed in a low priority (Nice to Have) position.`;
    } else if (isNiceToHaveInHighValue) {
      return `This story has ${storyValue} business value but is placed in a ${positionDescription} position.`;
    } else if (isUndervalued && mismatchSeverity > 1) {
      return `This story has ${storyValue} business value but is placed in a ${positionDescription} position, potentially undervaluing its importance.`;
    } else if (isOvervalued && mismatchSeverity > 1) {
      return `This story has ${storyValue} business value but is placed in a ${positionDescription} position, potentially missing out on critical value.`;
    } else {
      return `This story has ${storyValue} business value but is placed in a ${positionDescription} position.`;
    }
  };
  
  // Determine alert color based on severity
  const getAlertColor = () => {
    if (isCriticalInLowValue) {
      return "bg-red-100 border-red-400 text-red-800";
    } else if (isImportantInLowValue) {
      return "bg-orange-100 border-orange-400 text-orange-800";
    } else if (isNiceToHaveInHighValue) {
      return "bg-blue-100 border-blue-400 text-blue-800";
    } else if (mismatchSeverity > 1.5) {
      return "bg-yellow-100 border-yellow-400 text-yellow-800";
    } else {
      return "bg-gray-100 border-gray-400 text-gray-800";
    }
  };
  
  // Get appropriate icon based on mismatch
  const getIcon = () => {
    if (isCriticalInLowValue) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      );
    } else if (isImportantInLowValue) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      );
    } else if (isNiceToHaveInHighValue) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      );
    } else {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      );
    }
  };
  
  return (
    <div className={`border rounded-lg shadow-lg p-4 mb-4 ${getAlertColor()}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0 text-amber-500">
          {getIcon()}
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-amber-800">Value-Position Mismatch</h3>
          <div className="mt-2 text-sm text-amber-700">
            <p>
              {getMessage()}
            </p>
          </div>
        </div>
        <div className="ml-auto pl-3">
          <div className="-mx-1.5 -my-1.5">
            <button
              onClick={onDismiss}
              className="inline-flex rounded-md p-1.5 text-gray-500 hover:bg-gray-100 focus:outline-none"
            >
              <span className="sr-only">Dismiss</span>
              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
