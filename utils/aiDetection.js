import { ImageAnnotatorClient } from '@google-cloud/vision';

// Initialize the Google Cloud Vision client
const client = new ImageAnnotatorClient({
  keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE, // Optional: if using service account key file
  // Or use API key directly
  apiKey: process.env.GOOGLE_CLOUD_VISION_API_KEY
});

// Lay's specific keywords for detection
const laysKeywords = [
  'lays', 'lay\'s', 'lays classic', 'lays masala', 'lays magic masala',
  'lays cream onion', 'lays cheese herbs', 'lays tomato tango', 'lays macho chilli',
  'lays chip', 'lays chips', 'lays potato chip', 'lays potato chips',
  'lays crisp', 'lays crisps', 'lays snack', 'lays snacks',
  'lays bag', 'lays bags', 'lays packet', 'lays packets',
  'lay chip', 'lay chips', 'lais chip', 'lais chips', 'lais lays'
];

/**
 * Analyze image using Google Cloud Vision API to detect Lay's products
 * @param {string} imageUrl - URL of the image to analyze
 * @returns {Object} Detection results
 */
export const analyzeImageForLays = async (imageUrl) => {
  try {
    console.log('🔍 Starting AI analysis for image:', imageUrl);

    // Prepare the request
    const request = {
      image: {
        source: {
          imageUri: imageUrl
        }
      },
      features: [
        { type: 'OBJECT_LOCALIZATION', maxResults: 10 },
        { type: 'LABEL_DETECTION', maxResults: 20 },
        { type: 'TEXT_DETECTION', maxResults: 50 },
        { type: 'LOGO_DETECTION', maxResults: 10 }
      ]
    };

    // Call the Vision API
    const [result] = await client.annotateImage(request);
    
    const objects = result.localizedObjectAnnotations || [];
    const labels = result.labelAnnotations || [];
    const textAnnotations = result.textAnnotations || [];
    const logoAnnotations = result.logoAnnotations || [];

    console.log('📊 API Response:', {
      objects: objects.length,
      labels: labels.length,
      textAnnotations: textAnnotations.length,
      logoAnnotations: logoAnnotations.length
    });

    // Extract text from OCR
    const extractedText = textAnnotations.length > 0 ? textAnnotations[0].description : '';
    console.log('📝 Extracted text:', extractedText.substring(0, 100) + '...');

    // Check for Lay's text in OCR
    const laysTextKeywords = [
      'lays', 'lay\'s', 'lays classic', 'lays masala', 'lays magic masala',
      'lays cream onion', 'lays cheese herbs', 'lays tomato tango', 'lays macho chilli'
    ];
    const laysTextFound = laysTextKeywords.some(keyword => 
      extractedText.toLowerCase().includes(keyword.toLowerCase())
    );

    // Check for Lay's logos
    const laysLogosFound = logoAnnotations.filter(logo => 
      laysKeywords.some(keyword => 
        logo.description.toLowerCase().includes(keyword.toLowerCase())
      )
    );

    console.log('🎯 Detection results:', {
      laysTextFound,
      laysLogosFound: laysLogosFound.length,
      logoDescriptions: laysLogosFound.map(logo => logo.description)
    });

    // Determine if Lay's is detected
    const laysDetected = laysTextFound || laysLogosFound.length > 0;

    let laysCount = 0;
    let confidence = 0;
    let detectionMethod = 'none';

    if (laysDetected) {
      if (laysLogosFound.length > 0) {
        // Use logo detection - count each Lay's logo as one product
        laysCount = laysLogosFound.length;
        confidence = laysLogosFound.reduce((sum, logo) => sum + logo.score, 0) / laysLogosFound.length;
        detectionMethod = 'logo';
      } else if (laysTextFound) {
        // Use text detection - look for generic chip objects/labels
        const chipKeywords = ['chip', 'chips', 'potato chip', 'potato chips', 'crisp', 'crisps', 'snack', 'snacks', 'bag', 'packet'];
        
        const chipObjects = objects.filter(obj => 
          chipKeywords.some(keyword => obj.name.toLowerCase().includes(keyword))
        );
        
        const chipLabels = labels.filter(label => 
          chipKeywords.some(keyword => label.description.toLowerCase().includes(keyword))
        );

        laysCount = Math.max(chipObjects.length, chipLabels.length, 1); // At least 1 if text found
        confidence = Math.max(
          chipObjects.length > 0 ? chipObjects.reduce((sum, obj) => sum + obj.score, 0) / chipObjects.length : 0,
          chipLabels.length > 0 ? chipLabels.reduce((sum, label) => sum + label.score, 0) / chipLabels.length : 0,
          0.7 // Default confidence for text detection
        );
        detectionMethod = 'text';
      }
    }

    const detectionResult = {
      laysDetected,
      laysCount,
      confidence: Math.round(confidence * 100) / 100, // Round to 2 decimal places
      detectionMethod,
      logoDetections: laysLogosFound.map(logo => ({
        description: logo.description,
        score: logo.score,
        boundingPoly: logo.boundingPoly
      })),
      extractedText: extractedText.substring(0, 500), // Limit text length
      detectedObjects: objects.slice(0, 10).map(obj => ({
        name: obj.name,
        score: obj.score
      })),
      detectedLabels: labels.slice(0, 10).map(label => ({
        description: label.description,
        score: label.score
      })),
      processedAt: new Date()
    };

    console.log('✅ AI Analysis completed:', {
      laysDetected: detectionResult.laysDetected,
      laysCount: detectionResult.laysCount,
      confidence: detectionResult.confidence,
      detectionMethod: detectionResult.detectionMethod
    });

    return detectionResult;

  } catch (error) {
    console.error('❌ Error in AI analysis:', error);
    
    // Return default result on error
    return {
      laysDetected: false,
      laysCount: 0,
      confidence: 0,
      detectionMethod: 'none',
      logoDetections: [],
      extractedText: '',
      detectedObjects: [],
      detectedLabels: [],
      processedAt: new Date(),
      error: error.message
    };
  }
};

/**
 * Process multiple images and return combined results
 * @param {Array} imageUrls - Array of image URLs
 * @returns {Object} Combined detection results
 */
export const analyzeMultipleImages = async (imageUrls) => {
  try {
    const results = await Promise.all(
      imageUrls.map(url => analyzeImageForLays(url))
    );

    // Combine results
    const combinedResult = {
      laysDetected: results.some(result => result.laysDetected),
      totalLaysCount: results.reduce((sum, result) => sum + result.laysCount, 0),
      averageConfidence: results.length > 0 
        ? results.reduce((sum, result) => sum + result.confidence, 0) / results.length 
        : 0,
      detectionMethods: results.map(result => result.detectionMethod),
      imageResults: results,
      processedAt: new Date()
    };

    return combinedResult;
  } catch (error) {
    console.error('❌ Error in multiple image analysis:', error);
    return {
      laysDetected: false,
      totalLaysCount: 0,
      averageConfidence: 0,
      detectionMethods: [],
      imageResults: [],
      processedAt: new Date(),
      error: error.message
    };
  }
};
