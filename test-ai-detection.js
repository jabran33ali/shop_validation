// Test script for AI detection functionality
import { analyzeImageForLays } from './utils/aiDetection.js';
import dotenv from 'dotenv';

dotenv.config();

// Test with a sample image URL
const testImageUrl = 'https://example.com/test-image.jpg'; // Replace with actual image URL

console.log('🧪 Testing AI Detection...');
console.log('API Key configured:', !!process.env.GOOGLE_CLOUD_VISION_API_KEY);

try {
  const result = await analyzeImageForLays(testImageUrl);
  console.log('✅ Test completed successfully!');
  console.log('Result:', JSON.stringify(result, null, 2));
} catch (error) {
  console.error('❌ Test failed:', error.message);
}
