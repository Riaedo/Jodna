/**
 * Image Compression Utility conforming to Phase 3 Task 5
 * Brand Logo: Compressed to <= 150KB (153,600 bytes)
 * Background Image: Compressed to <= 500KB (512,000 bytes)
 * Supports JPEG, PNG, and WebP formats.
 * Preserves proportional aspect ratio without distortion.
 * Uses HTML5 Canvas API with iterative quality reduction.
 */

export interface CompressionOptions {
  maxSizeBytes: number; // e.g. 150 * 1024 or 500 * 1024
  maxWidth?: number;
  maxHeight?: number;
  initialQuality?: number;
  mimeType?: 'image/jpeg' | 'image/png' | 'image/webp';
  strictBase64CharLimit?: number; // e.g. 580,000 chars to satisfy Firestore Security Rules
}

export interface CompressedImageResult {
  dataUrl: string;
  sizeBytes: number;
  width: number;
  height: number;
  format: string;
}

/**
 * Calculates accurate byte size of a Base64 data URL
 */
export function getBase64ByteSize(base64DataUrl: string): number {
  if (!base64DataUrl) return 0;
  const commaIndex = base64DataUrl.indexOf(',');
  const base64String = commaIndex >= 0 ? base64DataUrl.slice(commaIndex + 1) : base64DataUrl;
  const padding = (base64String.endsWith('==') ? 2 : base64String.endsWith('=') ? 1 : 0);
  return Math.max(0, Math.round((base64String.length * 3) / 4) - padding);
}

/**
 * Loads an image from a File or Data URL
 */
function loadImage(source: File | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('ไม่สามารถโหลดรูปภาพได้ โปรดตรวจสอบความถูกต้องของไฟล์'));

    if (typeof source === 'string') {
      img.src = source;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          img.src = e.target.result as string;
        } else {
          reject(new Error('เกิดข้อผิดพลาดในการอ่านไฟล์รูปภาพ'));
        }
      };
      reader.onerror = () => reject(new Error('เกิดข้อผิดพลาดในการอ่านไฟล์รูปภาพ'));
      reader.readAsDataURL(source);
    }
  });
}

/**
 * Compresses an image with iterative quality & dimension downscaling
 */
export async function compressImage(
  source: File | string,
  options: CompressionOptions
): Promise<CompressedImageResult> {
  const {
    maxSizeBytes,
    maxWidth = 1920,
    maxHeight = 1080,
    initialQuality = 0.88,
    mimeType = 'image/jpeg',
    strictBase64CharLimit = 580000,
  } = options;

  const img = await loadImage(source);

  let currentWidth = img.naturalWidth || img.width;
  let currentHeight = img.naturalHeight || img.height;

  if (!currentWidth || !currentHeight) {
    throw new Error('ไม่สามารถตรวจสอบขนาดความกว้าง/ความสูงของรูปภาพได้');
  }

  // Calculate proportional dimensions
  if (currentWidth > maxWidth || currentHeight > maxHeight) {
    const ratio = Math.min(maxWidth / currentWidth, maxHeight / currentHeight);
    currentWidth = Math.round(currentWidth * ratio);
    currentHeight = Math.round(currentHeight * ratio);
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('เบราว์เซอร์ไม่รองรับ HTML Canvas สำหรับประมวลผลรูปภาพ');
  }

  let quality = initialQuality;
  let dataUrl = '';
  let sizeBytes = 0;
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    canvas.width = currentWidth;
    canvas.height = currentHeight;

    // Fill white background for JPEG format to avoid black transparencies
    if (mimeType === 'image/jpeg') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, currentWidth, currentHeight);
    } else {
      ctx.clearRect(0, 0, currentWidth, currentHeight);
    }

    ctx.drawImage(img, 0, 0, currentWidth, currentHeight);

    dataUrl = canvas.toDataURL(mimeType, quality);
    sizeBytes = getBase64ByteSize(dataUrl);

    // Verify if size fits within target bytes AND within Firestore string character limit
    const fitsByteLimit = sizeBytes <= maxSizeBytes;
    const fitsCharLimit = !strictBase64CharLimit || dataUrl.length <= strictBase64CharLimit;

    if (fitsByteLimit && fitsCharLimit) {
      return {
        dataUrl,
        sizeBytes,
        width: currentWidth,
        height: currentHeight,
        format: mimeType,
      };
    }

    // Iteratively scale down quality and/or dimensions
    attempts++;
    if (quality > 0.45) {
      quality = Math.max(0.40, quality - 0.12);
    } else {
      // Further reduce dimensions by 15%
      currentWidth = Math.round(currentWidth * 0.85);
      currentHeight = Math.round(currentHeight * 0.85);
      if (currentWidth < 120 || currentHeight < 120) {
        break; // Reached lower reasonable boundary
      }
    }
  }

  // Final check
  if (sizeBytes <= maxSizeBytes && (!strictBase64CharLimit || dataUrl.length <= strictBase64CharLimit)) {
    return {
      dataUrl,
      sizeBytes,
      width: currentWidth,
      height: currentHeight,
      format: mimeType,
    };
  }

  const maxKb = Math.round(maxSizeBytes / 1024);
  const actualKb = Math.round(sizeBytes / 1024);
  throw new Error(
    `ไม่สามารถบีบอัดรูปภาพให้ไม่เกิน ${maxKb}KB ได้ (ขนาดหลังบีบอัด: ${actualKb}KB) โปรดเลือกรูปภาพที่มีขนาดเล็กลง`
  );
}

export interface ImageValidationResult {
  valid: boolean;
  byteSize: number;
  charLength: number;
  error?: string;
}

/**
 * Validates image against byte size, Base64 character length, and Firestore 1MB document limit
 */
export function validateImageConstraints(
  dataUrl: string,
  type: 'logo' | 'background'
): ImageValidationResult {
  if (!dataUrl || typeof dataUrl !== 'string') {
    return { valid: false, byteSize: 0, charLength: 0, error: 'ข้อมูลรูปภาพว่างเปล่าหรือไม่ถูกต้อง' };
  }

  const charLength = dataUrl.length;
  const byteSize = getBase64ByteSize(dataUrl);

  const maxBytes = type === 'logo' ? 150 * 1024 : 500 * 1024;
  const maxChars = type === 'logo' ? 200000 : 600000;
  const FIRESTORE_DOC_MAX_BYTES = 1048576; // 1MB Firestore document limit

  // 1. Strict byte size limit check
  if (byteSize > maxBytes) {
    const actualKb = Math.round(byteSize / 1024);
    const limitKb = Math.round(maxBytes / 1024);
    return {
      valid: false,
      byteSize,
      charLength,
      error: `ขนาดรูปภาพ (${actualKb}KB) เกินขีดจำกัดสูงสุด ${limitKb}KB`,
    };
  }

  // 2. Strict Base64 character length check (Firestore Security Rules compliance)
  if (charLength > maxChars) {
    return {
      valid: false,
      byteSize,
      charLength,
      error: `ความยาว Base64 (${charLength.toLocaleString()} ตัวอักษร) เกินขีดจำกัดกฎความปลอดภัยของระบบ (${maxChars.toLocaleString()} ตัวอักษร)`,
    };
  }

  // 3. Document 1MB overall size guard: single image field must not exceed 850KB to leave room for other user profile metadata
  if (byteSize > 850 * 1024 || charLength > 900000 || byteSize >= FIRESTORE_DOC_MAX_BYTES) {
    return {
      valid: false,
      byteSize,
      charLength,
      error: 'ขนาดข้อมูลรูปภาพรวมอาจทำให้เอกสารเกินขีดจำกัดสูงสุด 1MB ของ Firestore',
    };
  }

  return { valid: true, byteSize, charLength };
}

/**
 * Task 5: Compress Brand Logo to <= 150KB (153,600 bytes)
 * Firestore rule limit: brandLogo.size() <= 200,000 characters
 */
export async function compressBrandLogo(
  source: File | string
): Promise<CompressedImageResult> {
  const result = await compressImage(source, {
    maxSizeBytes: 150 * 1024, // 150KB
    maxWidth: 360,
    maxHeight: 360,
    initialQuality: 0.90,
    mimeType: 'image/png', // PNG preserves crisp vector-like logo edges & transparency
    strictBase64CharLimit: 195000, // Firestore limit is 200,000
  });

  const validation = validateImageConstraints(result.dataUrl, 'logo');
  if (!validation.valid) {
    throw new Error(validation.error || 'รูปภาพโลโก้ไม่ผ่านเงื่อนไขความปลอดภัยของระบบ');
  }

  return result;
}

/**
 * Task 5: Compress Background Image to <= 500KB (512,000 bytes)
 * Firestore rule limit: bgImage.size() <= 600,000 characters
 */
export async function compressBackgroundImage(
  source: File | string
): Promise<CompressedImageResult> {
  const result = await compressImage(source, {
    maxSizeBytes: 500 * 1024, // 500KB
    maxWidth: 1600,
    maxHeight: 900,
    initialQuality: 0.85,
    mimeType: 'image/jpeg',
    strictBase64CharLimit: 580000, // Firestore limit is 600,000
  });

  const validation = validateImageConstraints(result.dataUrl, 'background');
  if (!validation.valid) {
    throw new Error(validation.error || 'รูปภาพพื้นหลังไม่ผ่านเงื่อนไขความปลอดภัยของระบบ');
  }

  return result;
}
