interface AIImageEditRequest {
  imageData: string;
  prompt: string;
  context?: {
    propertyId?: string;
    roomType?: string;
  };
  userId: string;
}

interface AIImageEditResult {
  success: boolean;
  editedImageUrl?: string;
  editedImageData?: string;
  error?: string;
}

// Google Gemini Flash 2.5 Imagen API configuration
const AI_CONFIG = {
  apiEndpoint: process.env.GEMINI_API_ENDPOINT || 'https://generativelanguage.googleapis.com/v1beta',
  apiKey: process.env.GEMINI_API_KEY || 'mock-api-key',
  model: 'gemini-2.0-flash-exp',
  imageModel: 'imagen-3.0-generate-001',
  maxRetries: 3,
  timeout: 60000, // 60 seconds for image processing
  maxImageSize: 20 * 1024 * 1024, // 20MB
  supportedFormats: ['image/jpeg', 'image/png', 'image/webp'],
};

export async function aiImageEdit(request: AIImageEditRequest): Promise<AIImageEditResult> {
  try {
    // Validate request
    if (!request.imageData || !request.prompt) {
      return {
        success: false,
        error: 'Image data and prompt are required',
      };
    }

    // Validate and optimize image
    const imageValidation = await validateAndOptimizeImage(request.imageData);
    if (!imageValidation.success) {
      return {
        success: false,
        error: imageValidation.error,
      };
    }

    // Prepare AI request
    const aiRequest = {
      model: AI_CONFIG.model,
      prompt: enhancePrompt(request.prompt, request.context),
      image: imageValidation.optimizedImageData,
      parameters: {
        quality: 'high',
        style: 'realistic',
        aspectRatio: determineAspectRatio(imageValidation.dimensions),
      },
      metadata: {
        userId: request.userId,
        timestamp: new Date().toISOString(),
      },
    };

    // Call AI service with retries
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= AI_CONFIG.maxRetries; attempt++) {
      try {
        const result = await callAIService(aiRequest);
        if (result.success) {
          // Optimize the result image
          const optimizedResult = await optimizeResultImage(result);
          return optimizedResult;
        }
        lastError = new Error(result.error);
      } catch (error) {
        lastError = error as Error;
        console.warn(`AI service attempt ${attempt} failed:`, error);
        
        if (attempt < AI_CONFIG.maxRetries) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    return {
      success: false,
      error: `AI service failed after ${AI_CONFIG.maxRetries} attempts: ${lastError?.message}`,
    };

  } catch (error) {
    console.error('AI image edit error:', error);
    return {
      success: false,
      error: 'AI service error',
    };
  }
}

interface ImageValidationResult {
  success: boolean;
  error?: string;
  optimizedImageData?: string;
  dimensions?: { width: number; height: number };
  format?: string;
}

async function validateAndOptimizeImage(imageData: string): Promise<ImageValidationResult> {
  try {
    // Parse image data
    const mimeType = getImageMimeType(imageData);
    if (!AI_CONFIG.supportedFormats.includes(mimeType)) {
      return {
        success: false,
        error: `Unsupported image format: ${mimeType}. Supported formats: ${AI_CONFIG.supportedFormats.join(', ')}`
      };
    }

    // Get image size
    const base64Data = imageData.split(',')[1];
    const imageSize = (base64Data.length * 3) / 4; // Approximate size in bytes
    
    if (imageSize > AI_CONFIG.maxImageSize) {
      return {
        success: false,
        error: `Image too large: ${Math.round(imageSize / 1024 / 1024)}MB. Maximum size: ${AI_CONFIG.maxImageSize / 1024 / 1024}MB`
      };
    }

    // Get image dimensions (this would use a proper image processing library in production)
    const dimensions = await getImageDimensions(imageData);
    
    // Optimize image if needed
    let optimizedImageData = imageData;
    if (imageSize > 5 * 1024 * 1024) { // If larger than 5MB, compress
      optimizedImageData = await compressImage(imageData, 0.8);
    }

    return {
      success: true,
      optimizedImageData,
      dimensions,
      format: mimeType,
    };

  } catch (error) {
    return {
      success: false,
      error: `Image validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

async function getImageDimensions(imageData: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = () => {
      reject(new Error('Failed to load image for dimension calculation'));
    };
    img.src = imageData;
  });
}

async function compressImage(imageData: string, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      // Maintain aspect ratio while reducing size if too large
      let { width, height } = img;
      const maxDimension = 2048;
      
      if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height);
        width *= ratio;
        height *= ratio;
      }

      canvas.width = width;
      canvas.height = height;
      
      ctx.drawImage(img, 0, 0, width, height);
      
      const compressedData = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedData);
    };
    img.onerror = () => {
      reject(new Error('Failed to load image for compression'));
    };
    img.src = imageData;
  });
}

function determineAspectRatio(dimensions: { width: number; height: number }): string {
  const ratio = dimensions.width / dimensions.height;
  
  if (Math.abs(ratio - 1) < 0.1) return 'ASPECT_RATIO_1_1';
  if (Math.abs(ratio - 4/3) < 0.1) return 'ASPECT_RATIO_4_3';
  if (Math.abs(ratio - 16/9) < 0.1) return 'ASPECT_RATIO_16_9';
  if (Math.abs(ratio - 9/16) < 0.1) return 'ASPECT_RATIO_9_16';
  
  return ratio > 1 ? 'ASPECT_RATIO_16_9' : 'ASPECT_RATIO_9_16';
}

async function optimizeResultImage(result: AIImageEditResult): Promise<AIImageEditResult> {
  if (!result.success || !result.editedImageData) {
    return result;
  }

  try {
    // Convert to WebP for better compression if supported
    const optimizedData = await convertToWebP(result.editedImageData);
    
    return {
      ...result,
      editedImageData: optimizedData,
    };
  } catch (error) {
    // If optimization fails, return original result
    console.warn('Image optimization failed:', error);
    return result;
  }
}

async function convertToWebP(imageData: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      // Try WebP first, fallback to JPEG
      try {
        const webpData = canvas.toDataURL('image/webp', 0.9);
        if (webpData.startsWith('data:image/webp')) {
          resolve(webpData);
        } else {
          // WebP not supported, use JPEG
          resolve(canvas.toDataURL('image/jpeg', 0.9));
        }
      } catch {
        // Fallback to JPEG
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      }
    };
    img.onerror = () => {
      reject(new Error('Failed to load image for WebP conversion'));
    };
    img.src = imageData;
  });
}

async function callAIService(request: any): Promise<AIImageEditResult> {
  // Mock implementation - in production, this would call the actual Gemini API
  if (AI_CONFIG.apiKey === 'mock-api-key') {
    return mockAIResponse(request);
  }

  try {
    // Step 1: Process the image with Gemini Vision to understand context
    const imageAnalysis = await analyzeImageWithGemini(request.image, request.prompt);
    
    // Step 2: Generate enhanced prompt for Imagen
    const enhancedPrompt = await generateEnhancedPrompt(
      request.prompt, 
      imageAnalysis, 
      request.parameters
    );

    // Step 3: Generate new image with Imagen
    const generatedImage = await generateImageWithImagen(enhancedPrompt, request.parameters);

    return {
      success: true,
      editedImageUrl: generatedImage.url,
      editedImageData: generatedImage.data,
    };

  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('AI service timeout');
    }
    throw error;
  }
}

async function analyzeImageWithGemini(imageData: string, prompt: string): Promise<string> {
  const response = await fetch(`${AI_CONFIG.apiEndpoint}/models/${AI_CONFIG.model}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': AI_CONFIG.apiKey,
    },
    body: JSON.stringify({
      contents: [{
        parts: [
          {
            text: `Analyze this room image and provide a detailed description focusing on: furniture, lighting, colors, style, and spatial layout. User wants to: ${prompt}. Provide specific details that would help generate an improved version.`
          },
          {
            inline_data: {
              mime_type: getImageMimeType(imageData),
              data: imageData.split(',')[1] // Remove data:image/jpeg;base64, prefix
            }
          }
        ]
      }],
      generationConfig: {
        temperature: 0.4,
        topK: 32,
        topP: 1,
        maxOutputTokens: 1024,
      }
    }),
    signal: AbortSignal.timeout(AI_CONFIG.timeout),
  });

  if (!response.ok) {
    throw new Error(`Gemini Vision API error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  return result.candidates?.[0]?.content?.parts?.[0]?.text || 'Unable to analyze image';
}

async function generateEnhancedPrompt(
  originalPrompt: string, 
  imageAnalysis: string, 
  parameters: any
): Promise<string> {
  const response = await fetch(`${AI_CONFIG.apiEndpoint}/models/${AI_CONFIG.model}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': AI_CONFIG.apiKey,
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `Based on this room analysis: "${imageAnalysis}"
          
          User request: "${originalPrompt}"
          
          Generate a detailed, specific prompt for an AI image generator that will create an improved version of this room. Focus on:
          - Maintaining the room's basic structure and layout
          - Implementing the user's requested changes
          - Ensuring realistic lighting and proportions
          - Creating a professional, real estate marketing quality result
          - Keeping the same perspective and camera angle
          
          Return only the image generation prompt, no explanations.`
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 512,
      }
    }),
    signal: AbortSignal.timeout(AI_CONFIG.timeout),
  });

  if (!response.ok) {
    throw new Error(`Prompt enhancement error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  return result.candidates?.[0]?.content?.parts?.[0]?.text || originalPrompt;
}

async function generateImageWithImagen(prompt: string, parameters: any): Promise<{url: string, data: string}> {
  const response = await fetch(`${AI_CONFIG.apiEndpoint}/models/${AI_CONFIG.imageModel}:generateImage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': AI_CONFIG.apiKey,
    },
    body: JSON.stringify({
      prompt: prompt,
      sampleCount: 1,
      aspectRatio: parameters?.aspectRatio || 'ASPECT_RATIO_16_9',
      safetyFilterLevel: 'BLOCK_ONLY_HIGH',
      personGeneration: 'DONT_ALLOW',
      imageGenerationConfig: {
        includeRaiInfo: false,
        includeWatermark: false,
        seedValue: Math.floor(Math.random() * 1000000),
      }
    }),
    signal: AbortSignal.timeout(AI_CONFIG.timeout),
  });

  if (!response.ok) {
    throw new Error(`Imagen API error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  const imageData = result.candidates?.[0]?.image?.data;
  
  if (!imageData) {
    throw new Error('No image generated by Imagen API');
  }

  // Convert to data URL
  const dataUrl = `data:image/jpeg;base64,${imageData}`;
  
  return {
    url: await uploadToStorage(imageData), // This would upload to your CDN/storage
    data: dataUrl
  };
}

function getImageMimeType(dataUrl: string): string {
  const match = dataUrl.match(/^data:([^;]+);base64,/);
  return match ? match[1] : 'image/jpeg';
}

async function uploadToStorage(imageData: string): Promise<string> {
  // Mock implementation - in production, upload to your CDN/storage service
  return `https://cdn.dinooverlay.com/generated/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;
}

function enhancePrompt(originalPrompt: string, context?: AIImageEditRequest['context']): string {
  let enhancedPrompt = originalPrompt;

  // Add context-specific enhancements
  if (context?.roomType) {
    enhancedPrompt = `For a ${context.roomType}: ${enhancedPrompt}`;
  }

  // Add quality and style guidelines
  enhancedPrompt += '. Maintain realistic lighting and proportions. Ensure high quality and professional appearance.';

  // Add real estate specific guidelines
  enhancedPrompt += ' The result should be suitable for real estate marketing and appeal to potential buyers.';

  return enhancedPrompt;
}

// Mock AI response for development/testing
async function mockAIResponse(request: any): Promise<AIImageEditResult> {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));

  // Simulate occasional failures for testing
  if (Math.random() < 0.1) {
    return {
      success: false,
      error: 'Mock AI processing failed',
    };
  }

  // Generate mock edited image (in production, this would be the actual AI result)
  const mockEditedImage = generateMockEditedImage(request.image, request.prompt);

  return {
    success: true,
    editedImageData: mockEditedImage,
    editedImageUrl: `https://mock-cdn.dinooverlay.com/edited/${Date.now()}.jpg`,
  };
}

function generateMockEditedImage(originalImage: string, prompt: string): string {
  // In a real implementation, this would return the AI-edited image
  // For now, we'll return a modified version of the original with a comment
  const base64Data = originalImage.split(',')[1];
  const mockComment = `<!-- AI Edit Applied: ${prompt} -->`;
  
  // Return original image with mock processing indicator
  return originalImage; // In reality, this would be the edited image
}

export async function getAIServiceStatus(): Promise<{
  available: boolean;
  latency?: number;
  error?: string;
}> {
  try {
    const startTime = Date.now();
    
    // Health check endpoint
    const response = await fetch(`${AI_CONFIG.apiEndpoint}/health`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${AI_CONFIG.apiKey}`,
      },
      signal: AbortSignal.timeout(5000),
    });

    const latency = Date.now() - startTime;

    if (response.ok) {
      return { available: true, latency };
    } else {
      return { 
        available: false, 
        error: `Service unavailable: ${response.status}` 
      };
    }

  } catch (error) {
    return { 
      available: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}