import React, { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

type PaymentTier = {
  tier: string;
  price: number;
  pointsRange: string;
  features: string[];
};

type PaymentFormProps = {
  projectId: Id<"sharedProjects">;
  projectPoints: number;
  onSuccess: () => void;
  onCancel: () => void;
};

export function PaymentForm({ 
  projectId, 
  projectPoints, 
  onSuccess, 
  onCancel 
}: PaymentFormProps) {
  const [promoCode, setPromoCode] = useState('');
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);
  const [promoResult, setPromoResult] = useState<{
    valid: boolean;
    discount?: number;
    finalPrice?: number;
    message: string;
    promoId?: Id<"promoCodes">;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Convex mutations
  const validatePromoCode = useMutation(api.payments.validatePromoCode);
  const createPaymentSession = useMutation(api.payments.createPaymentSession);
  const completePayment = useMutation(api.payments.completePayment);
  
  // Determine price tier based on points
  const getPricingTier = (points: number): PaymentTier => {
    if (points <= 10) {
      return {
        tier: 'free',
        price: 0,
        pointsRange: '1-10 points',
        features: [
          'Password protection',
          'Shareable URL',
          'Real-time collaboration',
        ],
      };
    }
    if (points <= 50) {
      return {
        tier: 'basic',
        price: 10,
        pointsRange: '11-50 points',
        features: [
          'Password protection',
          'Shareable URL',
          'Real-time collaboration',
          'Advanced analytics',
          'Export to PDF/Excel',
        ],
      };
    }
    if (points <= 100) {
      return {
        tier: 'premium',
        price: 50,
        pointsRange: '51-100 points',
        features: [
          'Password protection',
          'Shareable URL',
          'Real-time collaboration',
          'Advanced analytics',
          'Export to PDF/Excel',
          'Priority support',
          'Optional 2FA',
        ],
      };
    }
    return {
      tier: 'enterprise',
      price: 250,
      pointsRange: '100+ points',
      features: [
        'Password protection',
        'Shareable URL',
        'Real-time collaboration',
        'Advanced analytics',
        'Export to PDF/Excel',
        'Priority support',
        'Required 2FA',
        'Custom branding',
        'API access',
      ],
    };
  };
  
  const currentTier = getPricingTier(projectPoints);
  
  // Handle promo code validation
  const handleValidatePromo = async () => {
    if (!promoCode.trim() || isValidatingPromo) return;
    
    setIsValidatingPromo(true);
    setPromoResult(null);
    
    try {
      const result = await validatePromoCode({
        code: promoCode,
        projectPoints,
      });
      
      setPromoResult(result);
    } catch (error) {
      setPromoResult({
        valid: false,
        message: 'Error validating promo code. Please try again.',
      });
    } finally {
      setIsValidatingPromo(false);
    }
  };
  
  // Handle payment process
  const handleProceedToPayment = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      const session = await createPaymentSession({
        projectId,
        promoId: promoResult?.promoId,
      });
      
      // For demo purposes, we'll just simulate a successful payment
      // In a real app, we would redirect to session.url
      setTimeout(async () => {
        await completePayment({ sessionId: session.sessionId });
        onSuccess();
        setIsProcessing(false);
      }, 2000);
      
    } catch (error) {
      console.error('Payment error:', error);
      setIsProcessing(false);
    }
  };
  
  // If it's a free tier project, no payment needed
  if (currentTier.price === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Free Tier Project</h2>
          <p className="mt-1 text-gray-500">
            Your project qualifies for our free tier. No payment required!
          </p>
        </div>
        
        <div className="mt-8">
          <button
            onClick={onSuccess}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Secure My Project
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden max-w-md w-full">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Secure Your Project</h2>
          <button 
            onClick={onCancel}
            className="text-white hover:text-gray-200"
          >
            ✕
          </button>
        </div>
      </div>
      
      <div className="p-6">
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900">{currentTier.tier.charAt(0).toUpperCase() + currentTier.tier.slice(1)} Tier</h3>
          <p className="text-gray-600 text-sm mt-1">{currentTier.pointsRange}</p>
          
          <div className="mt-4 bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">Lock price:</span>
              <span className="font-bold text-gray-900">${currentTier.price}.00</span>
            </div>
            
            {promoResult?.valid && (
              <div className="flex items-center justify-between mb-2 text-green-600">
                <span>Discount:</span>
                <span>-${(currentTier.price - (promoResult.finalPrice || 0)).toFixed(2)}</span>
              </div>
            )}
            
            <div className="border-t border-gray-200 my-2 pt-2 flex items-center justify-between font-bold">
              <span>Total:</span>
              <span>${promoResult?.valid ? promoResult.finalPrice?.toFixed(2) : currentTier.price.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="mt-4">
            <h4 className="font-medium text-gray-900 mb-2">Features included:</h4>
            <ul className="space-y-1">
              {currentTier.features.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <svg className="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-600">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        <div className="mb-6">
          <label htmlFor="promoCode" className="block text-sm font-medium text-gray-700 mb-1">
            Promo Code
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              id="promoCode"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              placeholder="Enter promo code"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
            <button
              onClick={handleValidatePromo}
              disabled={isValidatingPromo || !promoCode.trim()}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
            >
              {isValidatingPromo ? 'Validating...' : 'Apply'}
            </button>
          </div>
          
          {promoResult && (
            <div className={`mt-2 text-sm ${promoResult.valid ? 'text-green-600' : 'text-red-600'}`}>
              {promoResult.message}
            </div>
          )}
        </div>
        
        <div className="mt-8 space-y-3">
          <button
            onClick={handleProceedToPayment}
            disabled={isProcessing}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex justify-center items-center"
          >
            {isProcessing ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              `Secure for $${promoResult?.valid ? promoResult.finalPrice?.toFixed(2) : currentTier.price.toFixed(2)}`
            )}
          </button>
          
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="w-full px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
        
        <div className="mt-6 text-xs text-gray-500 text-center">
          <p>
            Your payment is secure. After payment, your project will be password protected and accessible only to those with whom you share the URL and password.
          </p>
        </div>
      </div>
    </div>
  );
}
