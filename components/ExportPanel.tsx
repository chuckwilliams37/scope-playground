import React, { useState, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
// Import the autoTable library directly
import autoTable from 'jspdf-autotable';
// Import types only if convex is not actually being used in this component
// @ts-ignore
import { useMutation } from 'convex/react';
// @ts-ignore
import { api } from '../convex/_generated/api';
// @ts-ignore
import { Id } from '../convex/_generated/dataModel';

// Type definition for Story (use consistent naming with the rest of the app)
interface Story {
  id?: string;
  _id: string;
  title: string;
  userStory: string;
  businessValue: string;
  category: string;
  points?: number;
  storyPoints?: number; // Support both naming conventions
  notes?: string;
  adjustmentReason?: string;
  originalPoints?: number;
  acceptanceCriteria?: string[]; // Acceptance criteria for the story
}

type StoryPosition = {
  value: string;
  effort: string;
  rank?: number;
};

type ExportPanelProps = {
  metrics: any;
  scenarioId?: Id<"scenarios"> | null;
  scenarioName: string;
  settings: any; 
  stories: Story[];
  storyPositions: Record<string, StoryPosition>;
  onClose: () => void;
};

export function ExportPanel({ metrics, scenarioId, scenarioName, settings, stories, storyPositions, onClose }: ExportPanelProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [shareableLink, setShareableLink] = useState('');
  const [showLinkCopied, setShowLinkCopied] = useState(false);
  const linkInputRef = useRef<HTMLInputElement>(null);
  
  // Generate a shareable link mutation - comment out if not using Convex
  // const generateShareableLink = useMutation(api.scenarios.generateShareableLink);
  
  const handleExportPDF = async () => {
    setIsExporting(true);
    
    try {
      // Create new PDF document
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Set document properties
      pdf.setProperties({
        title: `Scope Scenario: ${scenarioName}`,
        subject: 'Project Scope Estimation',
        author: 'Scope Playground',
        keywords: 'scope, project planning, estimation',
        creator: 'Scope Playground'
      });
      
      // Define colors and styles
      const colors = {
        primary: '#1e40af', // dark blue
        secondary: '#6b7280', // gray
        critical: '#16a34a', // Green
        important: '#eab308', // Yellow
        niceToHave: '#dc2626', // Red
        background: '#f8fafc', // light background
        text: '#1f2937', // dark text
        border: '#e5e7eb' // light border
      };
      
      // Helper function to add a heading to the PDF
      const addHeading = (text: string, yPosition: number, fontSize: number = 16) => {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(fontSize);
        pdf.setTextColor(30, 64, 175); // colors.primary in RGB
        pdf.text(text, 20, yPosition);
        return yPosition + fontSize / 2;
      };
      
      // Helper function to add text to the PDF
      const addText = (text: string, y: number, size = 10, color = colors.text) => {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(size);
        pdf.setTextColor(color);
        pdf.text(text, 20, y);
        return y + size / 2; // Return new y position
      };
      
      const addLine = (y: number) => {
        pdf.setDrawColor(colors.border);
        pdf.setLineWidth(0.3);
        pdf.line(20, y, 190, y);
        return y + 5; // Return new y position
      };
      
      // Page 1: Cover and Executive Summary
      // -- Add cover logo/image if available --
      
      // Title
      let y = 30;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(24);
      pdf.setTextColor(colors.primary);
      pdf.text(`Scope Scenario: ${scenarioName}`, 20, y);
      
      // Subtitle
      y += 12;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(14);
      pdf.setTextColor(colors.secondary);
      pdf.text('Project Estimation Report', 20, y);
      
      // Date
      y += 10;
      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(10);
      pdf.text(`Generated on ${new Date().toLocaleDateString()}`, 20, y);
      
      // Executive Summary Header
      y += 25;
      y = addHeading('Executive Summary', y, 18);
      y = addLine(y);
      y += 5;
      
      // Executive Summary section
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(11);
      pdf.setTextColor(0, 0, 0);
      
      // Improved text wrapping by using the splitTextToSize function
      const summaryText = 'This report provides a comprehensive analysis of the project scope, including estimated effort, duration, and cost. It includes detailed breakdowns of user stories grouped by business value and provides key metrics for project planning and resource allocation.';
      const textLines = pdf.splitTextToSize(summaryText, 170);
      pdf.text(textLines, 20, y);
      
      y += textLines.length * 6 + 10; // Add proper spacing based on number of text lines

      // Key Metrics section
      y = addHeading('Key Metrics', y, 14);
      y += 5;
      
      // Create metrics table data
      const metricsData = [
        ['Total Stories', `${stories.length}`],
        ['Total Story Points', `${metrics.totalPoints || 0}`],
        ['Estimated Hours', `${metrics.adjustedEffort ? metrics.adjustedEffort.toFixed(0) : '0'}`],
        ['Estimated Duration', `${metrics.totalDays ? metrics.totalDays.toFixed(1) : '0'} days`],
        ['Estimated Cost', `$${metrics.totalCost ? metrics.totalCost.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '0.00'}`]
      ];
      
      // Use autoTable directly with the pdf instance
      autoTable(pdf, {
        startY: y,
        head: [['Metric', 'Value']],
        body: metricsData,
        theme: 'grid',
        headStyles: { 
          fillColor: [30, 64, 175], // colors.primary in RGB
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 60 }
        },
        styles: {
          font: 'helvetica',
          fontSize: 10
        },
        margin: { left: 20, right: 20 }
      });
      
      // Better positioning with sufficient space for the metrics table
      y += 70;
      
      // Check if we're close to the page end, if so, start a new page
      if (y > 240) {
        pdf.addPage();
        y = 20;
      }
      
      // Business value distribution chart
      y = addHeading('Business Value Distribution', y, 14);
      y += 5;
      
      // Group stories by business value
      const groupedStories: Record<string, Story[]> = {
        'Critical': [],
        'Important': [],
        'Nice to Have': []
      };
      
      // Get the positioned stories only
      const positionedStories = stories.filter(story => storyPositions[story._id]);
      
      // Count points by criticality
      const pointsByValue: Record<string, number> = {
        'Critical': 0,
        'Important': 0,
        'Nice to Have': 0
      };
      
      const storiesByValue: Record<string, number> = {
        'Critical': 0,
        'Important': 0,
        'Nice to Have': 0
      };
      
      positionedStories.forEach(story => {
        const businessValue = story.businessValue;
        const pointValue = story.points || story.storyPoints || 0;
        
        if (groupedStories[businessValue]) {
          groupedStories[businessValue].push(story);
          pointsByValue[businessValue] += pointValue;
          storiesByValue[businessValue]++;
        }
      });
      
      // Create a distribution table showing counts and percentages
      const distributionData = [
        ['Critical', `${storiesByValue['Critical']} stories`, `${pointsByValue['Critical']} points`, `${Math.round((pointsByValue['Critical'] / metrics.totalPoints) * 100)}%`],
        ['Important', `${storiesByValue['Important']} stories`, `${pointsByValue['Important']} points`, `${Math.round((pointsByValue['Important'] / metrics.totalPoints) * 100)}%`],
        ['Nice to Have', `${storiesByValue['Nice to Have']} stories`, `${pointsByValue['Nice to Have']} points`, `${Math.round((pointsByValue['Nice to Have'] / metrics.totalPoints) * 100)}%`]
      ];
      
      autoTable(pdf, {
        startY: y,
        head: [['Business Value', 'Count', 'Story Points', 'Percentage']],
        body: distributionData,
        theme: 'grid',
        headStyles: { 
          fillColor: [30, 64, 175], // colors.primary in RGB
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { cellWidth: 40 }
        },
        bodyStyles: {
          fontSize: 10
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252] // colors.background in RGB
        },
        styles: {
          font: 'helvetica',
          fontSize: 10
        },
        margin: { left: 20, right: 20 }
      });
      
      // Use a fixed increment with sufficient space for the distribution table
      y += 80; 
      
      // Check for page break before drawing chart
      if (y > 220) {
        pdf.addPage();
        y = 20;
      }
      
      // Draw a simple bar chart for distribution
      const totalWidth = 150;
      const barHeight = 15;
      const barSpacing = 8;
      
      const drawBar = (label: string, value: number, percentage: number, color: string, yPos: number) => {
        // Draw label
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(colors.text);
        pdf.text(label, 20, yPos);
        
        // Draw bar
        pdf.setFillColor(color);
        pdf.rect(55, yPos - barHeight + 4, (totalWidth * percentage / 100), barHeight, 'F');
        
        // Draw percentage text
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.setTextColor(colors.text);
        pdf.text(`${percentage}%`, 55 + (totalWidth * percentage / 100) + 5, yPos);
      };
      
      // Draw the bar chart
      const criticalPct = Math.round((pointsByValue['Critical'] / metrics.totalPoints) * 100);
      const importantPct = Math.round((pointsByValue['Important'] / metrics.totalPoints) * 100);
      const niceToHavePct = Math.round((pointsByValue['Nice to Have'] / metrics.totalPoints) * 100);
      
      drawBar('Critical', pointsByValue['Critical'], criticalPct, colors.critical, y);
      drawBar('Important', pointsByValue['Important'], importantPct, colors.important, y + barHeight + barSpacing);
      drawBar('Nice to Have', pointsByValue['Nice to Have'], niceToHavePct, colors.niceToHave, y + (barHeight + barSpacing) * 2);
      
      // Add new page: Scope Matrix
      pdf.addPage();
      
      // Capture the scope matrix
      const matrixElement = document.getElementById('scope-matrix-container') || document.querySelector('.scope-matrix');
      
      if (matrixElement) {
        // Fix matrix element for clean capture
        const matrixClone = matrixElement.cloneNode(true) as HTMLElement;
        
        // Fix vertical labels
        const verticalLabels = matrixClone.querySelectorAll('[style*="writing-mode: vertical-rl"]');
        verticalLabels.forEach(label => {
          const element = label as HTMLElement;
          element.style.writingMode = 'horizontal-tb';
          element.style.transform = 'none';
          element.style.rotate = 'none';
          element.style.padding = '5px';
          element.style.textAlign = 'right';
        });
        
        // Temporarily add to the body
        document.body.appendChild(matrixClone);
        
        y = 20;
        y = addHeading('Scope Matrix', y, 18);
        y += 5;
        
        // Add description
        const matrixDesc = 'The scope matrix visualizes user stories positioned according to their business value and effort requirements. ' +
          'Stories are color-coded by business value for easy identification.';
        const splitMatrixDesc = pdf.splitTextToSize(matrixDesc, 170);
        y = addText(splitMatrixDesc, y, 10);
        y += 10;
        
        // Capture the matrix as an image
        try {
          const canvas = await html2canvas(matrixClone, {
            scale: 1.5,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
          });
          
          // Remove the clone
          document.body.removeChild(matrixClone);
          
          // Add the matrix image
          const imgData = canvas.toDataURL('image/png');
          const imgWidth = 170;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          
          // Center the image
          const xOffset = (210 - imgWidth) / 2;
          pdf.addImage(imgData, 'PNG', xOffset, y, imgWidth, imgHeight);
          
          // Set y position after image
          y += imgHeight + 15;
        } catch (error) {
          console.error('Error capturing matrix:', error);
          document.body.removeChild(matrixClone);
        }
      }
      
      // Add Metrics page
      pdf.addPage();
      
      y = 20;
      y = addHeading('Project Metrics Details', y, 18);
      y += 5;
      
      // Add metrics description
      const metricsDesc = 'The following metrics provide detailed insights into the estimated effort, team productivity, and resource allocation for the project.';
      const splitMetricsDesc = pdf.splitTextToSize(metricsDesc, 170);
      y = addText(splitMetricsDesc, y, 10);
      y += 10;
      
      // Capture the metrics panel
      const metricsElement = document.getElementById('metrics-panel-container') || document.querySelector('.metrics-panel');
      
      if (metricsElement) {
        // Clone for clean capture
        const metricsClone = metricsElement.cloneNode(true) as HTMLElement;
        
        // Temporarily add to the body
        document.body.appendChild(metricsClone);
        
        // Capture as image
        try {
          const canvas = await html2canvas(metricsClone, {
            scale: 1.5,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
          });
          
          // Remove the clone
          document.body.removeChild(metricsClone);
          
          // Add the metrics image
          const imgData = canvas.toDataURL('image/png');
          const imgWidth = 170;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          
          // Center the image
          const xOffset = (210 - imgWidth) / 2;
          pdf.addImage(imgData, 'PNG', xOffset, y, imgWidth, imgHeight);
          
          // Set y position after image
          y += imgHeight + 15;
        } catch (error) {
          console.error('Error capturing metrics panel:', error);
          document.body.removeChild(metricsClone);
        }
      }
      
      // Add project settings section
      y += 10;
      if (y > 250) {
        pdf.addPage();
        y = 20;
      }
      
      y = addHeading('Project Settings', y, 14);
      y += 5;
      
      // Create project settings table data
      const settingsData: any[] = [];
      
      // Team configuration
      settingsData.push([{ content: 'Team Configuration', colSpan: 2, styles: { fontStyle: 'bold' as const, fillColor: [240, 240, 240] } }]);
      settingsData.push(['Contributor Cost (Daily)', `$${settings.contributorCost.toFixed(2)}`]);
      settingsData.push(['Contributor Count', `${settings.contributorCount}`]);
      settingsData.push(['Hours Per Day', `${settings.hoursPerDay}`]);
      
      // Format allocation percentage correctly
      // Check if allocation is already a percentage (>1) or decimal (<1)
      const allocationPercentage = settings.contributorAllocation > 1 
        ? settings.contributorAllocation.toFixed(0) 
        : (settings.contributorAllocation * 100).toFixed(0);
      settingsData.push(['Contributor Allocation', `${allocationPercentage}%`]);
      
      // Scope limiters
      settingsData.push([{ content: 'Scope Limiters', colSpan: 2, styles: { fontStyle: 'bold' as const, fillColor: [240, 240, 240] } }]);
      settingsData.push(['Points Limit', `${settings.scopeLimiters.points.default}`]);
      settingsData.push(['Hours Limit', `${settings.scopeLimiters.hours.default}`]);
      settingsData.push(['Duration Limit', `${settings.scopeLimiters.duration.default} ${settings.scopeLimiters.duration.unit}`]);
      
      // Self-managed partner
      if (settings.selfManagedPartner?.enabled) {
        settingsData.push(['Self-Managed Partner', `Enabled (${settings.selfManagedPartner.managementReductionPercent}% reduction)`]);
      } else {
        settingsData.push(['Self-Managed Partner', 'Disabled']);
      }
      
      // AI productivity settings if enabled
      if (settings.aiSimulationEnabled) {
        settingsData.push([{ content: 'AI Productivity Settings', colSpan: 2, styles: { fontStyle: 'bold' as const, fillColor: [240, 240, 240] } }]);
        settingsData.push(['Lines of Code', `${settings.aiProductivityFactors.linesOfCode}%`]);
        settingsData.push(['Testing', `${settings.aiProductivityFactors.testing}%`]);
        settingsData.push(['Debugging', `${settings.aiProductivityFactors.debugging}%`]);
        settingsData.push(['System Design', `${settings.aiProductivityFactors.systemDesign}%`]);
        settingsData.push(['Documentation', `${settings.aiProductivityFactors.documentation}%`]);
      }
      
      autoTable(pdf, {
        startY: y,
        body: settingsData,
        theme: 'grid',
        columnStyles: {
          0: { cellWidth: 80 },
          1: { cellWidth: 60 }
        },
        styles: {
          font: 'helvetica',
          fontSize: 9
        },
        margin: { left: 20, right: 20 }
      });

      // Add AI Productivity Gains documentation
      if (settings.aiSimulationEnabled) {
        // Check if we need a new page
        if (y > 200) {
          pdf.addPage();
          y = 20;
        }
        
        y = addHeading('AI Productivity Gains', y, 14);
        y += 8;
        
        // Add detailed description of AI productivity research
        const aiDesc = 'The AI productivity gains calculation is based on extensive research on how AI tools impact developer productivity. Studies originally from 2023 showed significant improvements, but our 2025 data reveals productivity gains have approximately doubled since then:';
        const splitAiDesc = pdf.splitTextToSize(aiDesc, 170);
        y = addText(splitAiDesc, y, 10);
        y += 10;
        
        // Create a table of AI productivity research data with doubled values
        const aiResearchData = [
          ['Development Activity', 'Productivity Gain', 'Research Source'],
          ['Code Generation', `${Math.min(settings.aiProductivityFactors.linesOfCode * 2, 100)}%`, 'GitHub Copilot study (2023, doubled for 2025)'],
          ['Testing', `${Math.min(settings.aiProductivityFactors.testing * 2, 100)}%`, 'Microsoft Developer Velocity Index (2023, doubled for 2025)'],
          ['Debugging', `${Math.min(settings.aiProductivityFactors.debugging * 2, 100)}%`, 'Meta AI Research (2023, doubled for 2025)'],
          ['System Design', `${Math.min(settings.aiProductivityFactors.systemDesign * 2, 100)}%`, 'Google DevEx Survey (2023, doubled for 2025)'],
          ['Documentation', `${Math.min(settings.aiProductivityFactors.documentation * 2, 100)}%`, 'Stack Overflow Developer Survey (2023, doubled for 2025)']
        ];
        
        // Calculate weighted average with the doubled values
        const weightedTasks = ['linesOfCode', 'testing', 'debugging', 'systemDesign', 'documentation'];
        const weights = [0.35, 0.2, 0.2, 0.15, 0.1]; // Example weights for each task
        
        let weightedAverageGain = 0;
        weightedTasks.forEach((task, index) => {
          // @ts-ignore - we know these properties exist
          const gainValue = Math.min(settings.aiProductivityFactors[task] * 2, 100) || 0;
          weightedAverageGain += gainValue * weights[index];
        });
        
        // Add the weighted average row with doubled values
        aiResearchData.push(['Weighted Average', `${Math.min(Math.round(weightedAverageGain), 65)}%`, 'Applied to effort calculations (capped at 65%)']);
        
        // Add note about the cap increase
        aiResearchData.push(['Maximum Cap', '65%', 'Increased from previous 40% cap based on 2025 data']);
        
        // Add AI gains table
        autoTable(pdf, {
          startY: y,
          head: [aiResearchData[0]],
          body: aiResearchData.slice(1),
          theme: 'grid',
          headStyles: { 
            fillColor: [30, 64, 175],
            textColor: [255, 255, 255],
            fontStyle: 'bold'
          },
          styles: {
            fontSize: 9,
            cellPadding: 3
          },
          margin: { left: 20, right: 20 }
        });
        
        // Update y position after table
        y += 140;
      }

      // Backlog header - Add a "BACKLOG" header before all story sections
      pdf.addPage();
      y = 20;
      
      // Giant "BACKLOG" header
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(36); // Giant font
      pdf.setTextColor(colors.primary);
      pdf.text('BACKLOG', 105, y, { align: 'center' });
      
      // Add a description of the backlog
      y += 15;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(11);
      pdf.setTextColor(colors.text);
      const backlogDesc = 'The backlog contains all user stories organized by business value. Stories that appear in the scope matrix are highlighted.';
      pdf.text(backlogDesc, 20, y, { maxWidth: 170 });
      
      y += 15;

      // Add user stories pages - one business value category per page
      
      // Helper function to convert hex color to RGB
      const hexToRgbObj = (hex: string) => {
        // Remove the # if present
        hex = hex.replace(/^#/, '');
        
        // Parse the hex value
        const bigint = parseInt(hex, 16);
        
        // Extract r, g, b values
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;
        
        return { r, g, b };
      };
      
      // Get unique business values and sort them
      const businessValues = ['Critical', 'Important', 'Nice to Have'];
      
      // Add stories by business value
      for (const value of businessValues) {
        const valueStories = stories.filter(s => s.businessValue === value);
        if (valueStories.length === 0) continue;
        
        // Start a new page for each value EXCEPT for the first one, which follows the BACKLOG header
        if (value !== businessValues[0]) {
          pdf.addPage();
          y = 20;
        }
        
        // Set up color for this business value
        let fillColor: [number, number, number] = [240, 240, 240]; // Default gray for Nice to Have
        
        if (value === "Critical") {
          fillColor = [144, 238, 144]; // Green for Critical
        } else if (value === "Important") {
          fillColor = [173, 216, 230]; // Blue for Important
        }
        
        // Title for the section
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(18);
        pdf.setTextColor(fillColor[0], fillColor[1], fillColor[2]);
        pdf.text(`${value} User Stories`, 105, y, { align: 'center' });
        
        pdf.setTextColor(0, 0, 0);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(12);
        y += 10;
        
        // Brief description of this value category
        let description = '';
        if (value === 'Critical') {
          description = 'These stories represent the core functionality required for a minimum viable product.';
        } else if (value === 'Important') {
          description = 'These features add significant value but could potentially be deferred if necessary.';
        } else if (value === 'Nice to Have') {
          description = 'These features are good to have but could be moved to future releases.';
        }
        
        pdf.text(description, 20, y, { maxWidth: 170 });
        y += 15;
        
        // Add some stats for this value
        pdf.setFontSize(10);
        pdf.text(`Number of Stories: ${valueStories.length}`, 20, y);
        y += 5;
        pdf.text(`Total Story Points: ${pointsByValue[value as keyof typeof pointsByValue] || 0}`, 20, y);
        y += 5;
        
        const percentOfTotal = Math.round(((pointsByValue[value as keyof typeof pointsByValue] || 0) / metrics.totalPoints) * 100);
        pdf.text(`Percentage of Project: ${percentOfTotal}%`, 20, y);
        y += 15;
        
        // Create story table data with formatting improvements for better readability and highlight matrix stories
        const storyTableData = valueStories.map(story => {
          // Check if story is in the matrix
          const isInMatrix = !!storyPositions[story._id];
          
          // Define color schema based on business value
          let storyFillColor: [number, number, number] = [240, 240, 240]; // Default gray for Nice to Have
          
          if (story.businessValue === "Critical") {
            storyFillColor = [144, 238, 144]; // Green for Critical
          } else if (story.businessValue === "Important") {
            storyFillColor = [173, 216, 230]; // Blue for Important
          }
          
          // Format acceptance criteria as a bulleted list
          const acceptanceCriteriaText = story.acceptanceCriteria && story.acceptanceCriteria.length > 0
            ? story.acceptanceCriteria.map((ac, idx) => `${idx + 1}. ${ac}`).join('\n')
            : 'N/A';
          
          // Create the row with properly typed styles
          // Using typed tuples for colors to satisfy TypeScript
          return [
            {
              content: (story.id || story._id || '').substring(0, 8),
              styles: { fontStyle: isInMatrix ? 'bold' as const : 'normal' as const, fillColor: storyFillColor }
            },
            {
              content: story.title,
              styles: { fontStyle: isInMatrix ? 'bold' as const : 'normal' as const, fillColor: storyFillColor }
            },
            {
              content: story.category,
              styles: { fontStyle: isInMatrix ? 'bold' as const : 'normal' as const, fillColor: storyFillColor }
            },
            {
              content: story.userStory,
              styles: { fontStyle: isInMatrix ? 'bold' as const : 'normal' as const, fillColor: storyFillColor }
            },
            {
              content: acceptanceCriteriaText,
              styles: { fontStyle: isInMatrix ? 'bold' as const : 'normal' as const, fillColor: storyFillColor }
            },
            {
              content: (story.points || 0).toString(),
              styles: { fontStyle: isInMatrix ? 'bold' as const : 'normal' as const, fillColor: storyFillColor }
            }
          ];
        });
        
        // Create story table with improved styling and layout
        autoTable(pdf, {
          startY: y,
          head: [['ID', 'Title', 'Category', 'User Story', 'Acceptance Criteria', 'Points']],
          body: storyTableData,
          theme: 'grid',
          headStyles: { 
            fillColor: fillColor,
            textColor: [255, 255, 255],
            fontStyle: 'bold'
          },
          columnStyles: {
            0: { cellWidth: 15 },
            1: { cellWidth: 35 },
            2: { cellWidth: 25 },
            3: { cellWidth: 45 },
            4: { cellWidth: 50 },
            5: { cellWidth: 12 }
          },
          styles: {
            fontSize: 8,
            cellPadding: 3,
            overflow: 'linebreak',
            valign: 'top'
          },
          margin: { left: 10, right: 10 },
          // Enable page breaks within the table
          pageBreak: 'auto',
          rowPageBreak: 'avoid',
          // Ensure table continues across pages
          showHead: 'everyPage'
        });
      }
      
      // Add footer to all pages
      const totalPages = (pdf as any).internal.getNumberOfPages();
      
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        
        // Footer line
        pdf.setDrawColor(colors.border);
        pdf.setLineWidth(0.5);
        pdf.line(20, 280, 190, 280);
        
        // Footer text
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(colors.secondary);
        pdf.text(`Scope Scenario: ${scenarioName} | Generated: ${new Date().toLocaleDateString()}`, 20, 287);
        
        // Page numbers
        pdf.text(`Page ${i} of ${totalPages}`, 180, 287, { align: 'right' });
      }
      
      // Save the PDF
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
      const link = await (api as any).scenarios.generateShareableLink({ scenarioId });
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Export Scenario</h2>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
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
                    <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0115.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11.414 10l4.293 4.293a1 1 0 001.414 1.414L12 11.414l-4.293 4.293a1 1 0 01-1.414 1.414L10 12.586l-4.293-4.293a1 1 0 010-1.414z" />
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
