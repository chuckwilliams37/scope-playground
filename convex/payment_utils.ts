// Helper functions that don't rely on Node.js APIs

// Helper function to calculate price based on project points
export function calculatePrice(points: number): number {
  const basePrice = 9.99;
  const pricePerPoint = 0.25;
  return basePrice + (points * pricePerPoint);
}

// Generate a simple ID (non-cryptographic)
export function generateSimpleId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}
