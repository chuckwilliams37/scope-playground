"use client";

import React from 'react';
import { useClientSafe } from '../../hooks/useClientSafe';

/**
 * Subtle banner that appears when Client-Safe mode is ON
 * Shows at the top of the page to indicate the current privacy state
 */
export function ClientSafeBanner() {
  const { clientSafeMode } = useClientSafe();

  if (!clientSafeMode) {
    return null;
  }

  return (
    <div className="bg-blue-50 border-b border-blue-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div className="flex items-center justify-center gap-2 text-sm">
          <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="font-medium text-blue-700">
            Client-Safe mode is active
          </span>
          <span className="text-blue-600">
            — Hourly rates and internal levers are hidden
          </span>
        </div>
      </div>
    </div>
  );
}
