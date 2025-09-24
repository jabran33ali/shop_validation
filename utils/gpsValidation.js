/**
 * GPS Validation Utility Functions
 * Validates if user was within specified radius of shop during visit
 */

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in meters
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

/**
 * Convert degrees to radians
 * @param {number} degrees - Degrees to convert
 * @returns {number} Radians
 */
function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Validate GPS coordinates for a visit
 * @param {Object} visitLocation - Visit location data
 * @param {Object} shopCoordinates - Shop GPS coordinates
 * @param {number} radiusThreshold - Radius threshold in meters (default: 30)
 * @returns {Object} GPS validation result
 */
export function validateVisitGPS(visitLocation, shopCoordinates, radiusThreshold = 30) {
  try {
    // Debug: Log input parameters
    console.log('🔍 GPS Validation Debug - Input visitLocation:', JSON.stringify(visitLocation, null, 2));
    console.log('🔍 GPS Validation Debug - Input shopCoordinates:', JSON.stringify(shopCoordinates, null, 2));
    console.log('🔍 GPS Validation Debug - visitLocation.startAudit:', visitLocation.startAudit);
    console.log('🔍 GPS Validation Debug - visitLocation.photoClick:', visitLocation.photoClick);
    console.log('🔍 GPS Validation Debug - visitLocation.proceedClick:', visitLocation.proceedClick);
    
    // Check if shop coordinates are available
    if (!shopCoordinates || shopCoordinates.gps_n === undefined || shopCoordinates.gps_n === null || shopCoordinates.gps_e === undefined || shopCoordinates.gps_e === null) {
      return {
        isValid: false,
        validationStatus: 'no_data',
        error: 'Shop coordinates not available',
        shopCoordinates: null,
        startAuditDistance: null,
        photoClickDistance: null,
        proceedClickDistance: null,
        validationDetails: {
          startAuditValid: false,
          photoClickValid: false,
          proceedClickValid: false
        },
        radiusThreshold,
        validatedAt: new Date()
      };
    }

    const shopLat = shopCoordinates.gps_n;
    const shopLon = shopCoordinates.gps_e;
    
    console.log('🔍 Shop coordinates extracted:', { shopLat, shopLon });
    
    // Initialize validation result
    const validationResult = {
      shopCoordinates: {
        latitude: shopLat,
        longitude: shopLon
      },
      radiusThreshold,
      validatedAt: new Date()
    };

    // Validate Start Audit location
    let startAuditDistance = null;
    let startAuditValid = false;
    
    console.log('🔍 Start Audit Debug - visitLocation.startAudit:', JSON.stringify(visitLocation.startAudit, null, 2));
    
    if (visitLocation.startAudit && 
        visitLocation.startAudit !== null &&
        visitLocation.startAudit.latitude !== null && 
        visitLocation.startAudit.latitude !== undefined &&
        visitLocation.startAudit.longitude !== null && 
        visitLocation.startAudit.longitude !== undefined) {
      startAuditDistance = calculateDistance(
        shopLat, 
        shopLon, 
        visitLocation.startAudit.latitude, 
        visitLocation.startAudit.longitude
      );
      startAuditValid = startAuditDistance <= radiusThreshold;
      console.log('🔍 Start Audit calculation:', {
        shopLat, shopLon,
        visitLat: visitLocation.startAudit.latitude,
        visitLon: visitLocation.startAudit.longitude,
        distance: startAuditDistance,
        valid: startAuditValid,
        threshold: radiusThreshold
      });
    }

    // Validate Photo Click location
    let photoClickDistance = null;
    let photoClickValid = false;
    
    console.log('🔍 Photo Click Debug - visitLocation.photoClick:', JSON.stringify(visitLocation.photoClick, null, 2));
    
    if (visitLocation.photoClick && 
        visitLocation.photoClick !== null &&
        visitLocation.photoClick.latitude !== null && 
        visitLocation.photoClick.latitude !== undefined &&
        visitLocation.photoClick.longitude !== null && 
        visitLocation.photoClick.longitude !== undefined) {
      photoClickDistance = calculateDistance(
        shopLat, 
        shopLon, 
        visitLocation.photoClick.latitude, 
        visitLocation.photoClick.longitude
      );
      photoClickValid = photoClickDistance <= radiusThreshold;
      console.log('🔍 Photo Click calculation:', {
        shopLat, shopLon,
        visitLat: visitLocation.photoClick.latitude,
        visitLon: visitLocation.photoClick.longitude,
        distance: photoClickDistance,
        valid: photoClickValid,
        threshold: radiusThreshold
      });
    }

    // Validate Proceed Click location
    let proceedClickDistance = null;
    let proceedClickValid = false;
    
    console.log('🔍 Proceed Click Debug - visitLocation.proceedClick:', JSON.stringify(visitLocation.proceedClick, null, 2));
    
    if (visitLocation.proceedClick && 
        visitLocation.proceedClick !== null &&
        visitLocation.proceedClick.latitude !== null && 
        visitLocation.proceedClick.latitude !== undefined &&
        visitLocation.proceedClick.longitude !== null && 
        visitLocation.proceedClick.longitude !== undefined) {
      proceedClickDistance = calculateDistance(
        shopLat, 
        shopLon, 
        visitLocation.proceedClick.latitude, 
        visitLocation.proceedClick.longitude
      );
      proceedClickValid = proceedClickDistance <= radiusThreshold;
      console.log('🔍 Proceed Click calculation:', {
        shopLat, shopLon,
        visitLat: visitLocation.proceedClick.latitude,
        visitLon: visitLocation.proceedClick.longitude,
        distance: proceedClickDistance,
        valid: proceedClickValid,
        threshold: radiusThreshold
      });
    }

    // Determine overall validation status
    const validCount = [startAuditValid, photoClickValid, proceedClickValid].filter(Boolean).length;
    const totalCount = [startAuditDistance, photoClickDistance, proceedClickDistance].filter(d => d !== null).length;
    
    // If no GPS data at all, check if at least proceedClick has coordinates
    if (totalCount === 0 && proceedClickDistance !== null) {
      console.log('🔍 Only proceedClick GPS data available, using that for validation');
    }

    let validationStatus = 'no_data';
    let isValid = false;

    if (totalCount === 0) {
      validationStatus = 'no_data';
    } else if (validCount === totalCount && validCount > 0) {
      validationStatus = 'valid';
      isValid = true;
    } else if (validCount === 0) {
      validationStatus = 'invalid';
    } else {
      validationStatus = 'partial';
      isValid = validCount >= 2; // Consider valid if at least 2 out of 3 are valid
    }

    // Build final result
    const finalResult = {
      isValid,
      validationStatus,
      startAuditDistance,
      photoClickDistance,
      proceedClickDistance,
      validationDetails: {
        startAuditValid,
        photoClickValid,
        proceedClickValid
      },
      ...validationResult
    };

    console.log('🔍 GPS Validation Debug - Final Result:', JSON.stringify(finalResult, null, 2));
    return finalResult;

  } catch (error) {
    console.error('Error in GPS validation:', error);
    return {
      isValid: false,
      validationStatus: 'no_data',
      error: error.message,
      shopCoordinates: null,
      startAuditDistance: null,
      photoClickDistance: null,
      proceedClickDistance: null,
      validationDetails: {
        startAuditValid: false,
        photoClickValid: false,
        proceedClickValid: false
      },
      radiusThreshold,
      validatedAt: new Date()
    };
  }
}

/**
 * Get GPS validation summary for multiple visits
 * @param {Array} visits - Array of visit objects with gpsValidation
 * @returns {Object} Summary statistics
 */
export function getGPSValidationSummary(visits) {
  const totalVisits = visits.length;
  const visitsWithGPS = visits.filter(visit => visit.gpsValidation && visit.gpsValidation.validationStatus !== 'no_data');
  const validVisits = visitsWithGPS.filter(visit => visit.gpsValidation.isValid);
  const invalidVisits = visitsWithGPS.filter(visit => visit.gpsValidation.validationStatus === 'invalid');
  const partialVisits = visitsWithGPS.filter(visit => visit.gpsValidation.validationStatus === 'partial');
  const noDataVisits = visits.filter(visit => !visit.gpsValidation || visit.gpsValidation.validationStatus === 'no_data');

  const averageDistance = visitsWithGPS.length > 0 
    ? visitsWithGPS.reduce((sum, visit) => {
        const distances = [
          visit.gpsValidation.startAuditDistance,
          visit.gpsValidation.photoClickDistance,
          visit.gpsValidation.proceedClickDistance
        ].filter(d => d !== null);
        return sum + (distances.reduce((a, b) => a + b, 0) / distances.length);
      }, 0) / visitsWithGPS.length
    : 0;

  return {
    totalVisits,
    visitsWithGPS: visitsWithGPS.length,
    validVisits: validVisits.length,
    invalidVisits: invalidVisits.length,
    partialVisits: partialVisits.length,
    noDataVisits: noDataVisits.length,
    averageDistance: Math.round(averageDistance * 100) / 100,
    validationRate: visitsWithGPS.length > 0 ? Math.round((validVisits.length / visitsWithGPS.length) * 100) : 0
  };
}
