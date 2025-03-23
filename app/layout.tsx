import './globals.css';
import { ConvexClientProvider } from '@/components/ConvexClientProvider';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Scope Playground',
  description: 'Visual tool for prioritizing features and estimating project effort',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ConvexClientProvider>
          {children}
        </ConvexClientProvider>
      </body>
    </html>
  );
}
