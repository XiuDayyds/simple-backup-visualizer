import axios from 'axios';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { URL } from 'url';
import { emitProgress } from '../routes/progress';
import { ProgressManager } from '../utils/progressManager';

interface DiaryEntry {
  date: string;
  content?: string;
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

// Configuration for parallel processing
const PARALLEL_BATCH_SIZE = 5; // Process 5 media items at once
const SKIP_MEDIA_DOWNLOAD = true; // Skip downloading media for better performance
const IMAGE_QUALITY = 85;
const IMAGE_MAX_WIDTH = 800;
const IMAGE_MAX_HEIGHT = 600;

export async function processMediaOptimized(
  diaryData: DiaryEntry[],
  jobId: string,
  progressManager?: ProgressManager
): Promise<DiaryEntry[]> {
  console.log(`${jobId}: 开始处理媒体文件（优化版）...`);
  
  const processedData = [...diaryData];
  const mediaDir = path.join(__dirname, '../../temp/media', jobId);
  
  // If we're skipping downloads, no need to create directory
  if (!SKIP_MEDIA_DOWNLOAD) {
    if (!fs.existsSync(mediaDir)) {
      fs.mkdirSync(mediaDir, { recursive: true });
    }
  }

  // Count total media items for progress tracking
  let totalMediaItems = 0;
  const mediaJobs: Array<{
    entryIndex: number;
    mediaIndex?: number;
    type: 'image' | 'video' | 'audio';
    url: string;
  }> = [];

  // Collect all media processing jobs
  for (let i = 0; i < diaryData.length; i++) {
    const entry = diaryData[i];
    
    if (entry.album) {
      for (let j = 0; j < entry.album.length; j++) {
        const mediaItem = entry.album[j];
        if ((mediaItem.type === 'image' || mediaItem.type === 'video') && mediaItem.url) {
          mediaJobs.push({
            entryIndex: i,
            mediaIndex: j,
            type: mediaItem.type as 'image' | 'video',
            url: mediaItem.url
          });
          totalMediaItems++;
        }
      }
    }
    
    if (entry.audio) {
      mediaJobs.push({
        entryIndex: i,
        type: 'audio',
        url: entry.audio
      });
      totalMediaItems++;
    }
  }

  console.log(`${jobId}: 共有 ${totalMediaItems} 个媒体文件需要处理`);

  // If skipping downloads, just return original data
  if (SKIP_MEDIA_DOWNLOAD) {
    console.log(`${jobId}: 跳过媒体下载，使用原始URL`);
    
    // Still emit progress updates for UI consistency
    if (progressManager && totalMediaItems > 0) {
      for (let i = 0; i < totalMediaItems; i += 10) {
        const progress = Math.min(i, totalMediaItems);
        const mediaProgress = progress / totalMediaItems;
        const overallProgress = 20 + Math.round(mediaProgress * 20);
        progressManager.updateProcessed(Math.round(mediaProgress * processedData.length));
        emitProgress(jobId, overallProgress, `优化媒体处理 (${progress}/${totalMediaItems})`, 'process');
        await new Promise(resolve => setImmediate(resolve));
      }
    }
    
    return processedData;
  }

  // Process media in parallel batches
  let processedMediaItems = 0;
  
  for (let i = 0; i < mediaJobs.length; i += PARALLEL_BATCH_SIZE) {
    const batch = mediaJobs.slice(i, Math.min(i + PARALLEL_BATCH_SIZE, mediaJobs.length));
    
    // Process batch in parallel
    const batchPromises = batch.map(async (job) => {
      try {
        if (job.type === 'image') {
          const processedUrl = await processImageOptimized(
            job.url,
            mediaDir,
            `${job.entryIndex}-${job.mediaIndex}`,
            jobId
          );
          
          if (processedUrl && job.mediaIndex !== undefined) {
            processedData[job.entryIndex].album![job.mediaIndex] = {
              ...processedData[job.entryIndex].album![job.mediaIndex],
              url: processedUrl
            };
          }
        } else if (job.type === 'video') {
          // Keep original video URLs
          console.log(`${jobId}: 保留视频原始URL`);
        } else if (job.type === 'audio') {
          const audioInfo = await processAudioOptimized(
            job.url,
            mediaDir,
            `audio-${job.entryIndex}`,
            jobId
          );
          
          if (audioInfo) {
            processedData[job.entryIndex].audioInfo = audioInfo;
          }
        }
      } catch (error) {
        console.error(`${jobId}: 处理媒体失败:`, error);
      }
    });
    
    // Wait for batch to complete
    await Promise.all(batchPromises);
    
    // Update progress
    processedMediaItems += batch.length;
    if (progressManager && totalMediaItems > 0) {
      const mediaProgress = processedMediaItems / totalMediaItems;
      const overallProgress = 20 + Math.round(mediaProgress * 20);
      progressManager.updateProcessed(Math.round(mediaProgress * processedData.length));
      emitProgress(
        jobId, 
        overallProgress, 
        `并行处理媒体 (${processedMediaItems}/${totalMediaItems})`, 
        'process'
      );
    }
    
    // Small delay to prevent blocking
    await new Promise(resolve => setImmediate(resolve));
  }

  console.log(`${jobId}: 媒体文件处理完成（优化版）`);
  return processedData;
}

async function processImageOptimized(
  imageUrl: string,
  outputDir: string,
  filename: string,
  jobId: string
): Promise<string | null> {
  try {
    // Validate URL
    const url = new URL(imageUrl);
    if (!['http:', 'https:'].includes(url.protocol)) {
      console.warn(`${jobId}: 不支持的图片协议: ${url.protocol}`);
      return null;
    }

    // Use axios with shorter timeout and smaller buffer
    const response = await axios({
      method: 'GET',
      url: imageUrl,
      responseType: 'arraybuffer',
      timeout: 15000, // Reduced to 15 seconds
      maxContentLength: 10 * 1024 * 1024, // Max 10MB
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/*',
        'Referer': url.origin,
      },
    });

    if (response.status !== 200) {
      throw new Error(`HTTP ${response.status}`);
    }

    const originalBuffer = Buffer.from(response.data);
    
    // Optimize image with Sharp
    const processedBuffer = await sharp(originalBuffer)
      .resize(IMAGE_MAX_WIDTH, IMAGE_MAX_HEIGHT, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({
        quality: IMAGE_QUALITY,
        progressive: true,
        mozjpeg: true, // Use mozjpeg for better compression
      })
      .toBuffer();
    
    // Convert to base64 data URI
    const base64Data = processedBuffer.toString('base64');
    const dataUri = `data:image/jpeg;base64,${base64Data}`;
    
    return dataUri;

  } catch (error) {
    // Silently fail and return null to use original URL
    return null;
  }
}

async function processAudioOptimized(
  audioUrl: string,
  outputDir: string,
  filename: string,
  jobId: string
): Promise<DiaryEntry['audioInfo'] | null> {
  try {
    const url = new URL(audioUrl);
    if (!['http:', 'https:'].includes(url.protocol)) {
      return null;
    }

    // Just get metadata without downloading the full file
    const headResponse = await axios({
      method: 'HEAD',
      url: audioUrl,
      timeout: 10000, // Reduced to 10 seconds
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'audio/*',
        'Referer': url.origin,
      },
    });

    const contentLength = headResponse.headers['content-length'];
    const contentType = headResponse.headers['content-type'] || '';
    
    // Get file extension
    let extension = getAudioExtensionFromContentType(contentType);
    if (!extension) {
      extension = path.extname(url.pathname).toLowerCase();
      if (!extension || !['.mp3', '.m4a', '.wav', '.ogg', '.aac'].includes(extension)) {
        extension = '.mp3';
      }
    }

    // Format file size
    const sizeInBytes = parseInt(contentLength || '0', 10);
    const sizeFormatted = formatFileSize(sizeInBytes);

    // Get filename
    const audioFilename = path.basename(url.pathname) || `audio-${Date.now()}${extension}`;

    return {
      originalUrl: audioUrl,
      filename: audioFilename,
      size: sizeFormatted,
      format: getAudioFormat(contentType, extension),
    };

  } catch (error) {
    // Return basic info even if request fails
    const url = new URL(audioUrl);
    const audioFilename = path.basename(url.pathname) || 'unknown-audio';
    
    return {
      originalUrl: audioUrl,
      filename: audioFilename,
      size: '未知大小',
      format: '音频文件',
    };
  }
}

function getAudioExtensionFromContentType(contentType: string): string {
  const typeMap: Record<string, string> = {
    'audio/mpeg': '.mp3',
    'audio/mp3': '.mp3',
    'audio/mp4': '.m4a',
    'audio/m4a': '.m4a',
    'audio/wav': '.wav',
    'audio/wave': '.wav',
    'audio/ogg': '.ogg',
    'audio/aac': '.aac',
    'audio/webm': '.webm',
  };

  const type = contentType.split(';')[0].trim().toLowerCase();
  return typeMap[type] || '';
}

function getAudioFormat(contentType: string, extension: string): string {
  const formatMap: Record<string, string> = {
    'audio/mpeg': 'MP3',
    'audio/mp3': 'MP3',
    'audio/mp4': 'M4A',
    'audio/m4a': 'M4A',
    'audio/wav': 'WAV',
    'audio/wave': 'WAV',
    'audio/ogg': 'OGG',
    'audio/aac': 'AAC',
    'audio/webm': 'WebM',
    '.mp3': 'MP3',
    '.m4a': 'M4A',
    '.wav': 'WAV',
    '.ogg': 'OGG',
    '.aac': 'AAC',
    '.webm': 'WebM',
  };

  const type = contentType.split(';')[0].trim().toLowerCase();
  return formatMap[type] || formatMap[extension] || '音频文件';
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export async function cleanupMediaOptimized(jobId: string): Promise<void> {
  try {
    const mediaDir = path.join(__dirname, '../../temp/media', jobId);
    
    if (fs.existsSync(mediaDir)) {
      const files = fs.readdirSync(mediaDir);
      for (const file of files) {
        fs.unlinkSync(path.join(mediaDir, file));
      }
      fs.rmdirSync(mediaDir);
      console.log(`${jobId}: 清理媒体目录: ${mediaDir}`);
    }
  } catch (error) {
    console.error(`${jobId}: 清理媒体文件失败:`, error);
  }
}