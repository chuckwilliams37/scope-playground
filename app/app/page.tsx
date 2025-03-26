// This file serves as a redirector to our main application page
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AppRedirector() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/');
  }, [router]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <p className="ml-3 text-gray-600">Loading application...</p>
    </div>
  );
}
