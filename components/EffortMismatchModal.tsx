"use client";
import React, { useState, useEffect } from 'react';

type EffortMismatchModalProps = {
  storyTitle: string;
  storyPoints: number;
  cellEffort: string;
  suggestedPoints: number;
  onAdjustPoints: (newPoints: number, reason: string) => void;
  onKeepAsIs: () => void;
  onCancel: () => void;
  validationErrors?: {
    adjustmentReason?: string;
  }
};

export function EffortMismatchModal({
  storyTitle,
  storyPoints,
  cellEffort,
  suggestedPoints,
  onAdjustPoints,
  onKeepAsIs,
  onCancel,
  validationErrors = {}
}: EffortMismatchModalProps) {
  const [selectedPoints, setSelectedPoints] = useState(suggestedPoints);
  const [adjustmentReason, setAdjustmentReason] = useState('');

  // Define point options appropriate for each effort level
  const pointOptions = {
    low: [1, 2, 3],
    medium: [5, 8],
    high: [8, 13, 21]
  };

  // Common adjustment reasons for quick selection
  const commonReasons = {
    low: [
      "Lower complexity than originally estimated",
      "Similar to previously implemented feature",
      "Task can be handled with existing components"
    ],
    medium: [
      "Average complexity for this type of feature",
      "Requires moderate integration effort",
      "Includes simple validation and testing"
    ],
    high: [
      "Requires complex integration with external systems",
      "High technical complexity and test coverage",
      "Contains multiple edge cases to handle"
    ]
  };

  // Set initial selected points based on effort level
  useEffect(() => {
    if (cellEffort === 'high' && storyPoints >= 8) {
      setSelectedPoints(storyPoints);
    } else {
      setSelectedPoints(suggestedPoints);
    }
  }, [suggestedPoints, storyPoints, cellEffort]);

  const getEffortColor = () => {
    switch (cellEffort) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-amber-600';
      case 'high': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getEffortText = () => {
    switch (cellEffort) {
      case 'low': return 'Low Effort (1-3 points)';
      case 'medium': return 'Medium Effort (5-8 points)';
      case 'high': return 'High Effort (8+ points)';
      default: return 'Unknown Effort';
    }
  };

  const handleAdjustPoints = () => {
    onAdjustPoints(selectedPoints, adjustmentReason);
  };
  
  const handleReasonSelect = (reason: string) => {
    setAdjustmentReason(reason);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 m-4">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Effort Mismatch Detected</h3>
          <p className="text-sm text-gray-500 mt-1">
            The story point estimate doesn't match the column's effort level
          </p>
        </div>
        
        <div className="mb-6 bg-blue-50 p-4 rounded-md">
          <h4 className="font-medium text-blue-700 mb-2">{storyTitle}</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="block text-gray-500">Current Points:</span>
              <span className="font-medium">{storyPoints} points</span>
            </div>
            <div>
              <span className="block text-gray-500">Dropped In:</span>
              <span className={`font-medium ${getEffortColor()}`}>{getEffortText()}</span>
            </div>
          </div>
        </div>
        
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Options:</h4>
          <div className="space-y-3">
            <div className="bg-green-50 border border-green-100 rounded-md p-3">
              <div className="flex items-start">
                <div className="flex-1">
                  <h5 className="font-medium text-green-700">Adjust Story Points</h5>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <label className="block text-xs text-green-700 mb-1">
                        New Point Value:
                      </label>
                      <select
                        value={selectedPoints}
                        onChange={(e) => setSelectedPoints(Number(e.target.value))}
                        className="w-full p-2 text-sm border rounded bg-white text-gray-800"
                      >
                        {!pointOptions[cellEffort as keyof typeof pointOptions].includes(storyPoints) && 
                          cellEffort === 'high' && 
                          storyPoints > 8 && (
                            <option key={storyPoints} value={storyPoints}>{storyPoints} points (current)</option>
                        )}
                        {pointOptions[cellEffort as keyof typeof pointOptions].map(points => (
                          <option key={points} value={points}>{points} points{points === storyPoints ? ' (current)' : ''}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={`block text-xs mb-1 ${validationErrors.adjustmentReason ? 'text-red-600 font-medium' : 'text-green-700'}`}>
                        Reason for Adjustment: {validationErrors.adjustmentReason && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type="text"
                        value={adjustmentReason}
                        onChange={(e) => setAdjustmentReason(e.target.value)}
                        placeholder="Required"
                        className={`w-full p-1.5 text-sm border rounded mb-2
                          ${validationErrors.adjustmentReason ? 'border-red-300 bg-red-50' : 'border-green-200 bg-white'}`}
                      />
                      {validationErrors.adjustmentReason && (
                        <p className="text-xs text-red-500 mt-1 mb-2">{validationErrors.adjustmentReason}</p>
                      )}
                      <div className="text-xs text-green-700 mb-1">Common reasons:</div>
                      <div className="flex flex-col gap-1">
                        {commonReasons[cellEffort as keyof typeof commonReasons].map((reason, index) => (
                          <button
                            key={index}
                            onClick={() => handleReasonSelect(reason)}
                            className="text-xs bg-green-50 hover:bg-green-100 text-green-700 px-2 py-1 rounded text-left transition-all duration-200 border border-green-100"
                          >
                            {reason}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-100 rounded-md p-3">
              <div className="flex items-start">
                <div className="flex-1">
                  <h5 className="font-medium text-yellow-700">Keep Current Points</h5>
                  <p className="text-sm text-yellow-600 mt-1">
                    Keep the current {storyPoints} points but place in a {cellEffort} effort column
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex space-x-3 mt-6">
          <button
            onClick={handleAdjustPoints}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded font-medium transition-colors"
            type="button"
          >
            Save Adjustment
          </button>
          <button
            onClick={onKeepAsIs}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 px-4 rounded font-medium transition-colors"
            type="button"
          >
            Keep Current Points
          </button>
          <button
            onClick={onCancel}
            className="bg-white hover:bg-gray-50 text-gray-500 py-2 px-3 rounded border border-gray-300 font-medium transition-colors"
            type="button"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
