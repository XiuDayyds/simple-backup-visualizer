import axios from 'axios';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { URL } from 'url';

interface DiaryEntry {
  date: string;
  content: string;
  collection?: string;
  album?: Array<{ type: string; url: string }>;
  audio?: string;
  audioInfo?: {
    originalUrl: string;
    filename: string;
    size: string;
    duration?: string;
    format?: string;
  };
  tags?: string[];
}

export async function processImages(
  diaryData: DiaryEntry[],
  jobId: string
): Promise<DiaryEntry[]> {
  console.log(`开始处理图片任务: ${jobId}`);
  
  const processedData = [...diaryData];
  const imageDir = path.join(__dirname, '../../temp/images', jobId);
  
  // 确保图片目录存在
  if (!fs.existsSync(imageDir)) {
    fs.mkdirSync(imageDir, { recursive: true });
  }

  for (let i = 0; i < processedData.length; i++) {
    const entry = processedData[i];
    
    if (entry.album && entry.album.length > 0) {
      const processedAlbum = [];
      
      for (let j = 0; j < entry.album.length; j++) {
        const mediaItem = entry.album[j];
        
        if (mediaItem.type === 'image' && mediaItem.url) {
          try {
            const processedUrl = await downloadAndProcessImage(
              mediaItem.url,
              imageDir,
              `${i}-${j}`,
              jobId
            );
            
            if (processedUrl) {
              processedAlbum.push({
                ...mediaItem,
                url: processedUrl,
              });
            } else {
              // 如果下载失败，保留原始URL
              processedAlbum.push(mediaItem);
            }
          } catch (error) {
            console.error(`处理图片失败 (${i}-${j}):`, error);
            // 保留原始URL
            processedAlbum.push(mediaItem);
          }
        } else {
          processedAlbum.push(mediaItem);
        }
      }
      
      processedData[i] = {
        ...entry,
        album: processedAlbum,
      };
    }
  }

  console.log(`图片处理完成: ${jobId}`);
  return processedData;
}

async function downloadAndProcessImage(
  imageUrl: string,
  outputDir: string,
  filename: string,
  jobId: string
): Promise<string | null> {
  try {
    // 验证URL
    const url = new URL(imageUrl);
    if (!['http:', 'https:'].includes(url.protocol)) {
      console.warn(`${jobId}: 不支持的协议: ${url.protocol}`);
      return null;
    }

    // 下载图片
    console.log(`${jobId}: 下载图片: ${imageUrl}`);
    const response = await axios({
      method: 'GET',
      url: imageUrl,
      responseType: 'arraybuffer',
      timeout: 15000, // 15秒超时
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/*',
        'Referer': url.origin,
      },
    });

    if (response.status !== 200) {
      throw new Error(`HTTP ${response.status}`);
    }

    // 获取文件类型
    const contentType = response.headers['content-type'] || '';
    let mimeType = contentType.split(';')[0].trim();
    
    // 处理图片数据
    const originalBuffer = Buffer.from(response.data);
    let processedBuffer: Buffer;
    let finalMimeType: string;

    console.log(`${jobId}: 处理图片，原始大小: ${originalBuffer.length} 字节，类型: ${mimeType}`);

    // 使用Sharp处理图片，统一转换为JPEG格式以确保兼容性
    try {
      processedBuffer = await sharp(originalBuffer)
        .resize(800, 600, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({
          quality: 85,
          progressive: true,
        })
        .toBuffer();
      
      finalMimeType = 'image/jpeg';
      console.log(`${jobId}: 图片处理成功，处理后大小: ${processedBuffer.length} 字节`);
    } catch (sharpError) {
      console.warn(`${jobId}: Sharp处理失败，使用原始图片:`, sharpError);
      processedBuffer = originalBuffer;
      finalMimeType = mimeType || 'image/jpeg';
    }

    // 转换为base64
    const base64Data = processedBuffer.toString('base64');
    const dataUri = `data:${finalMimeType};base64,${base64Data}`;
    
    console.log(`${jobId}: 图片转换为base64成功，数据大小: ${base64Data.length} 字符`);
    return dataUri;

  } catch (error) {
    console.error(`${jobId}: 下载图片失败 (${imageUrl}):`, error);
    return null;
  }
}

function getExtensionFromContentType(contentType: string): string {
  const typeMap: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/bmp': '.bmp',
    'image/tiff': '.tiff',
  };

  const type = contentType.split(';')[0].trim().toLowerCase();
  return typeMap[type] || '';
}

export async function cleanupImages(jobId: string): Promise<void> {
  try {
    const imageDir = path.join(__dirname, '../../temp/images', jobId);
    
    if (fs.existsSync(imageDir)) {
      const files = fs.readdirSync(imageDir);
      for (const file of files) {
        fs.unlinkSync(path.join(imageDir, file));
      }
      fs.rmdirSync(imageDir);
      console.log(`清理图片目录: ${imageDir}`);
    }
  } catch (error) {
    console.error(`清理图片失败 (${jobId}):`, error);
  }
}

export async function getImageStats(diaryData: DiaryEntry[]): Promise<{
  totalImages: number;
  imageUrls: string[];
  supportedImages: number;
  unsupportedImages: number;
}> {
  const imageUrls: string[] = [];
  
  diaryData.forEach(entry => {
    if (entry.album) {
      entry.album.forEach(item => {
        if (item.type === 'image' && item.url) {
          imageUrls.push(item.url);
        }
      });
    }
  });

  let supportedImages = 0;
  let unsupportedImages = 0;

  imageUrls.forEach(url => {
    try {
      const urlObj = new URL(url);
      if (['http:', 'https:'].includes(urlObj.protocol)) {
        supportedImages++;
      } else {
        unsupportedImages++;
      }
    } catch {
      unsupportedImages++;
    }
  });

  return {
    totalImages: imageUrls.length,
    imageUrls,
    supportedImages,
    unsupportedImages,
  };
} 