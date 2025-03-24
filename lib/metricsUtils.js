/**
 * Utility functions for calculating project metrics
 */

/**
 * Calculate metrics based on stories, positions and project settings
 * @param {Array} stories - Array of story objects
 * @param {Object} storyPositions - Object mapping story IDs to positions
 * @param {Object} settings - Project settings
 * @returns {Object} Metrics object
 */
export const calculateMetrics = (stories, storyPositions, settings) => {
  if (!stories || !storyPositions || !settings) {
    return null;
  }

  // Default to 8 hours per point if pointsToHoursConversion is not set
  const pointsToHoursConversion = settings.pointsToHoursConversion || 8;
  
  // Calculate total points
  const totalPoints = stories.reduce((sum, story) => {
    return sum + (story.points || story.storyPoints || 0);
  }, 0);
  
  // Calculate total hours based on points and conversion rate
  const totalHours = totalPoints * pointsToHoursConversion;
  
  // Calculate working days based on hours per day
  const hoursPerDay = settings.hoursPerDay || 6;
  const workingDays = Math.ceil(totalHours / hoursPerDay);
  
  // Calculate cost based on contributor cost and allocation
  const contributorCost = settings.contributorCost || 800; // Default daily rate
  const contributorCount = settings.contributorCount || 2;
  const contributorAllocation = settings.contributorAllocation || 0.8; // 80% allocation
  
  const estimatedCost = workingDays * contributorCost * contributorCount * contributorAllocation;
  
  // Calculate self-managed partner discount if enabled
  let partnerDiscount = 0;
  if (settings.selfManagedPartner && settings.selfManagedPartner.enabled) {
    const managementReduction = settings.selfManagedPartner.managementReductionPercent || 0.5; // Default 50%
    partnerDiscount = estimatedCost * managementReduction;
  }
  
  // Count stories by business value
  const storiesByValue = {
    Critical: 0,
    Important: 0,
    'Nice to Have': 0,
    High: 0,
    Medium: 0,
    Low: 0
  };
  
  stories.forEach(story => {
    if (story.businessValue) {
      if (storiesByValue[story.businessValue] !== undefined) {
        storiesByValue[story.businessValue]++;
      }
    }
  });
  
  // Group High with Critical, Medium with Important, and Low with Nice to Have
  const storiesByValueStandardized = {
    Critical: storiesByValue.Critical + storiesByValue.High,
    Important: storiesByValue.Important + storiesByValue.Medium,
    'Nice to Have': storiesByValue['Nice to Have'] + storiesByValue.Low
  };
  
  return {
    totalPoints,
    totalHours,
    workingDays,
    estimatedCost,
    partnerDiscount,
    finalCost: estimatedCost - partnerDiscount,
    storiesByValue: storiesByValueStandardized,
    contributorCount,
    hoursPerDay,
    pointsToHoursConversion
  };
};
