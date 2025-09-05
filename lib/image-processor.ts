interface ImageProcessingResult {
  success: boolean;
  processedImageData?: string;
  metadata?: ImageMetadata;
  error?: string;
}

interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
}

// Supported image formats
const SUPPORTED_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_DIMENSIONS = { width: 4096, height: 4096 };

export async function processImage(
  imageData: string,
  imageUrl?: string
): Promise<ImageProcessingResult> {
  try {
    let processedData = imageData;

    // If imageUrl is provided, fetch the image
    if (imageUrl && !imageData) {
      const fetchResult = await fetchImageFromUrl(imageUrl);
      if (!fetchResult.success) {
        return { success: false, error: fetchResult.error };
      }
      processedData = fetchResult.data!;
    }

    // Validate base64 format
    if (!isValidBase64Image(processedData)) {
      return { 
        success: false, 
        error: 'Invalid image data format. Expected base64 encoded image.' 
      };
    }

    // Extract image metadata
    const metadata = await extractImageMetadata(processedData);
    if (!metadata) {
      return { 
        success: false, 
        error: 'Unable to process image metadata' 
      };
    }

    // Validate image format
    if (!SUPPORTED_FORMATS.includes(metadata.format)) {
      return { 
        success: false, 
        error: `Unsupported image format: ${metadata.format}. Supported formats: ${SUPPORTED_FORMATS.join(', ')}` 
      };
    }

    // Validate file size
    if (metadata.size > MAX_FILE_SIZE) {
      return { 
        success: false, 
        error: `Image too large: ${Math.round(metadata.size / 1024 / 1024)}MB. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB` 
      };
    }

    // Validate dimensions
    if (metadata.width > MAX_DIMENSIONS.width || metadata.height > MAX_DIMENSIONS.height) {
      return { 
        success: false, 
        error: `Image dimensions too large: ${metadata.width}x${metadata.height}. Maximum: ${MAX_DIMENSIONS.width}x${MAX_DIMENSIONS.height}` 
      };
    }

    // Optimize image if needed
    const optimizedData = await optimizeImage(processedData, metadata);

    return {
      success: true,
      processedImageData: optimizedData,
      metadata,
    };

  } catch (error) {
    console.error('Image processing error:', error);
    return { 
      success: false, 
      error: 'Image processing failed' 
    };
  }
}

async function fetchImageFromUrl(url: string): Promise<{
  success: boolean;
  data?: string;
  error?: string;
}> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return { 
        success: false, 
        error: `Failed to fetch image: ${response.status} ${response.statusText}` 
      };
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !SUPPORTED_FORMATS.includes(contentType)) {
      return { 
        success: false, 
        error: `Unsupported content type: ${contentType}` 
      };
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const dataUrl = `data:${contentType};base64,${base64}`;

    return { success: true, data: dataUrl };

  } catch (error) {
    return { 
      success: false, 
      error: 'Failed to fetch image from URL' 
    };
  }
}

function isValidBase64Image(data: string): boolean {
  try {
    // Check if it's a data URL
    const dataUrlRegex = /^data:image\/(jpeg|jpg|png|webp);base64,/;
    if (!dataUrlRegex.test(data)) {
      return false;
    }

    // Extract base64 part
    const base64Data = data.split(',')[1];
    if (!base64Data) {
      return false;
    }

    // Validate base64
    const buffer = Buffer.from(base64Data, 'base64');
    return buffer.toString('base64') === base64Data;

  } catch {
    return false;
  }
}

async function extractImageMetadata(dataUrl: string): Promise<ImageMetadata | null> {
  try {
    // Extract format from data URL
    const formatMatch = dataUrl.match(/^data:image\/([^;]+);base64,/);
    if (!formatMatch) {
      return null;
    }

    const format = `image/${formatMatch[1]}`;
    const base64Data = dataUrl.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');

    // For a complete implementation, you would use a library like 'sharp' or 'jimp'
    // to extract actual image dimensions. For now, we'll estimate based on buffer size
    const size = buffer.length;
    
    // Rough estimation of dimensions (this would be more accurate with proper image parsing)
    const estimatedPixels = size / 3; // Rough estimate for RGB
    const estimatedDimension = Math.sqrt(estimatedPixels);
    
    return {
      width: Math.round(estimatedDimension),
      height: Math.round(estimatedDimension),
      format,
      size,
    };

  } catch {
    return null;
  }
}

async function optimizeImage(dataUrl: string, metadata: ImageMetadata): Promise<string> {
  // For now, return the original data
  // In a production environment, you would implement image optimization here
  // using libraries like 'sharp' for server-side optimization
  
  // Potential optimizations:
  // - Resize if too large
  // - Convert to WebP if supported
  // - Compress JPEG quality
  // - Strip metadata
  
  return dataUrl;
}

export function validateImageFormat(format: string): boolean {
  return SUPPORTED_FORMATS.includes(format);
}

export function getMaxFileSize(): number {
  return MAX_FILE_SIZE;
}

export function getMaxDimensions(): { width: number; height: number } {
  return MAX_DIMENSIONS;
}

export function getSupportedFormats(): string[] {
  return [...SUPPORTED_FORMATS];
}