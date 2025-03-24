import React, { useState, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';

type ExportPanelProps = {
  metrics: any;
  scenarioId?: Id<"scenarios"> | null;
  scenarioName: string;
  onClose: () => void;
};

export function ExportPanel({ metrics, scenarioId, scenarioName, onClose }: ExportPanelProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [shareableLink, setShareableLink] = useState('');
  const [showLinkCopied, setShowLinkCopied] = useState(false);
  const linkInputRef = useRef<HTMLInputElement>(null);
  
  // Generate a shareable link mutation
  const generateShareableLink = useMutation(api.scenarios.generateShareableLink);
  
  const handleExportPDF = async () => {
    setIsExporting(true);
    
    try {
      // Find the elements to export - use more specific selectors with IDs
      const matrixElement = document.getElementById('scope-matrix-container') || document.querySelector('.scope-matrix');
      const metricsElement = document.getElementById('metrics-panel-container') || document.querySelector('.metrics-panel');
      
      if (!matrixElement || !metricsElement) {
        console.error('Required elements not found for PDF export');
        console.log('Looking for #scope-matrix-container or .scope-matrix and #metrics-panel-container or .metrics-panel');
        alert('Could not generate PDF: Required elements not found on the page. Please try again.');
        setIsExporting(false);
        return;
      }
      
      // Create a new container to hold both elements
      const container = document.createElement('div');
      container.style.padding = '20px';
      container.style.background = 'white';
      
      // Add a title
      const title = document.createElement('h1');
      title.textContent = `Scope Scenario: ${scenarioName}`;
      title.style.textAlign = 'center';
      title.style.marginBottom = '20px';
      title.style.fontFamily = 'Arial, sans-serif';
      container.appendChild(title);
      
      // Clone the matrix and metrics elements
      const matrixClone = matrixElement.cloneNode(true) as HTMLElement;
      const metricsClone = metricsElement.cloneNode(true) as HTMLElement;
      
      // Ensure they're visible and properly sized
      matrixClone.style.width = '100%';
      matrixClone.style.marginBottom = '20px';
      metricsClone.style.width = '100%';
      
      // Add them to the container
      container.appendChild(matrixClone);
      container.appendChild(metricsClone);
      
      // Add date
      const footer = document.createElement('p');
      footer.textContent = `Generated on ${new Date().toLocaleDateString()}`;
      footer.style.textAlign = 'center';
      footer.style.marginTop = '20px';
      footer.style.fontFamily = 'Arial, sans-serif';
      container.appendChild(footer);
      
      // Temporarily add the container to the body
      document.body.appendChild(container);
      
      // Use html2canvas to convert to image
      const canvas = await html2canvas(container, {
        scale: 2, // Higher quality
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      // Remove temporary container
      document.body.removeChild(container);
      
      // Convert to PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // Calculate dimensions to fit in PDF
      const imgData = canvas.toDataURL('image/png');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 10;
      
      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`scope-scenario-${scenarioName.replace(/\s+/g, '-').toLowerCase()}.pdf`);
      
    } catch (error) {
      console.error('Error exporting PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };
  
  const handleGenerateLink = async () => {
    if (!scenarioId) {
      alert('Please save your scenario first before sharing.');
      return;
    }
    
    try {
      // Call the Convex mutation to generate a shareable link
      const link = await generateShareableLink({ scenarioId });
      const fullLink = `${window.location.origin}/shared/${link}`;
      setShareableLink(fullLink);
    } catch (error) {
      console.error('Error generating shareable link:', error);
    }
  };
  
  const handleCopyLink = () => {
    if (linkInputRef.current) {
      linkInputRef.current.select();
      document.execCommand('copy');
      // Show copy confirmation
      setShowLinkCopied(true);
      setTimeout(() => setShowLinkCopied(false), 2000);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Export Scenario</h2>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          
          <div className="mb-6">
            <h3 className="text-md font-medium mb-2 text-gray-700">Export as PDF</h3>
            <p className="text-sm text-gray-600 mb-3">
              Generate a PDF document containing the current scenario matrix and metrics.
            </p>
            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              className={`w-full py-2 px-4 rounded-md text-white font-medium 
                ${isExporting ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'} 
                transition duration-200 flex justify-center items-center`}
            >
              {isExporting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating PDF...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
                  </svg>
                  Export as PDF
                </>
              )}
            </button>
          </div>
          
          <div className="border-t pt-5">
            <h3 className="text-md font-medium mb-2 text-gray-700">Share via Link</h3>
            <p className="text-sm text-gray-600 mb-3">
              Generate a shareable link that others can use to view this scenario.
            </p>
            
            {!shareableLink ? (
              <button
                onClick={handleGenerateLink}
                disabled={!scenarioId}
                className={`w-full py-2 px-4 rounded-md bg-green-600 hover:bg-green-700 text-white font-medium transition duration-200 flex justify-center items-center ${!scenarioId ? 'opacity-75 cursor-not-allowed' : ''}`}
              >
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                </svg>
                Generate Shareable Link
              </button>
            ) : (
              <div className="flex items-center space-x-2">
                <input
                  ref={linkInputRef}
                  type="text"
                  value={shareableLink}
                  readOnly
                  className="flex-1 p-2 border rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleCopyLink}
                  className="p-2 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                  title="Copy link"
                >
                  <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                    <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                  </svg>
                </button>
              </div>
            )}
            
            {showLinkCopied && (
              <div className="mt-2 text-sm text-green-600 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Link copied to clipboard!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
