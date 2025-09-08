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

export async function processMedia(
  diaryData: DiaryEntry[],
  jobId: string,
  progressManager?: ProgressManager
): Promise<DiaryEntry[]> {
  console.log(`${jobId}: 开始处理媒体文件...`);
  
  const processedData = [...diaryData];
  const mediaDir = path.join(__dirname, '../../temp/media', jobId);
  
  // 确保媒体目录存在
  if (!fs.existsSync(mediaDir)) {
    fs.mkdirSync(mediaDir, { recursive: true });
  }

  // Count total media items for progress tracking
  let totalMediaItems = 0;
  let processedMediaItems = 0;
  for (const entry of diaryData) {
    if (entry.album) {
      totalMediaItems += entry.album.length;
    }
    if (entry.audio) {
      totalMediaItems++;
    }
  }

  for (let i = 0; i < processedData.length; i++) {
    const entry = processedData[i];
    
    // Update progress periodically
    if (totalMediaItems > 0) {
      // Update progress more frequently - every entry or every 5 entries for large datasets
      const updateFrequency = totalMediaItems > 100 ? 5 : 1;
      if (i % updateFrequency === 0 || i === processedData.length - 1) {
        const mediaProgress = processedMediaItems / totalMediaItems;
        const overallProgress = 20 + Math.round(mediaProgress * 20); // Map to 20-40% range
        
        // Update progress manager if available
        if (progressManager) {
          progressManager.updateProcessed(Math.round(mediaProgress * processedData.length));
        }
        
        emitProgress(jobId, overallProgress, `处理媒体文件 (${processedMediaItems}/${totalMediaItems})`, 'process');
      }
    }
    
    // 处理图片
    if (entry.album && entry.album.length > 0) {
      const processedAlbum = [];
      
      for (let j = 0; j < entry.album.length; j++) {
        const mediaItem = entry.album[j];
        
        if (mediaItem.type === 'image' && mediaItem.url) {
          try {
            console.log(`${jobId}: 处理第${i + 1}条记录的第${j + 1}张图片`);
            const processedUrl = await downloadAndProcessImage(
              mediaItem.url,
              mediaDir,
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
            
            // Update progress counter and emit progress
            processedMediaItems++;
            if (progressManager && totalMediaItems > 0) {
              const mediaProgress = processedMediaItems / totalMediaItems;
              const overallProgress = 20 + Math.round(mediaProgress * 20);
              progressManager.updateProcessed(Math.round(mediaProgress * processedData.length));
              emitProgress(jobId, overallProgress, `处理图片 (${processedMediaItems}/${totalMediaItems})`, 'process');
            }
          } catch (error) {
            console.error(`${jobId}: 处理图片失败 (${i}-${j}):`, error);
            // 保留原始URL
            processedAlbum.push(mediaItem);
            processedMediaItems++; // Also count failed items
          }
        } else if (mediaItem.type === 'video' && mediaItem.url) {
          try {
            console.log(`${jobId}: 处理第${i + 1}条记录的第${j + 1}个视频`);
            // 对于视频文件，我们只保留原始URL，不进行下载处理
            // 在HTML中将显示为可播放的video元素
            processedAlbum.push({
              ...mediaItem,
              url: mediaItem.url, // 保持原始URL
            });
            
            // Update progress counter and emit progress
            processedMediaItems++;
            if (progressManager && totalMediaItems > 0) {
              const mediaProgress = processedMediaItems / totalMediaItems;
              const overallProgress = 20 + Math.round(mediaProgress * 20);
              progressManager.updateProcessed(Math.round(mediaProgress * processedData.length));
              emitProgress(jobId, overallProgress, `处理视频 (${processedMediaItems}/${totalMediaItems})`, 'process');
            }
          } catch (error) {
            console.error(`${jobId}: 处理视频失败 (${i}-${j}):`, error);
            // 保留原始URL
            processedAlbum.push(mediaItem);
            processedMediaItems++; // Also count failed items
          }
        } else {
          processedAlbum.push(mediaItem);
          if (mediaItem.type === 'image' || mediaItem.type === 'video') {
            processedMediaItems++;
          }
        }
      }
      
      processedData[i].album = processedAlbum;
    }

    // 处理音频
    if (entry.audio) {
      try {
        console.log(`${jobId}: 处理第${i + 1}条记录的音频`);
        const audioInfo = await downloadAndProcessAudio(
          entry.audio,
          mediaDir,
          `audio-${i}`,
          jobId
        );
        
        if (audioInfo) {
          processedData[i].audioInfo = audioInfo;
        }
        
        // Update progress counter and emit progress
        processedMediaItems++;
        if (progressManager && totalMediaItems > 0) {
          const mediaProgress = processedMediaItems / totalMediaItems;
          const overallProgress = 20 + Math.round(mediaProgress * 20);
          progressManager.updateProcessed(Math.round(mediaProgress * processedData.length));
          emitProgress(jobId, overallProgress, `处理音频 (${processedMediaItems}/${totalMediaItems})`, 'process');
        }
      } catch (error) {
        console.error(`${jobId}: 处理音频失败 (${i}):`, error);
        processedMediaItems++; // Also count failed items
      }
    }
  }

  console.log(`${jobId}: 媒体文件处理完成`);
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
      console.warn(`${jobId}: 不支持的图片协议: ${url.protocol}`);
      return null;
    }

    // 下载图片
    const response = await axios({
      method: 'GET',
      url: imageUrl,
      responseType: 'arraybuffer',
      timeout: 30000, // 增加到30秒
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/*',
        'Referer': url.origin,
      },
    });

    if (response.status !== 200) {
      throw new Error(`HTTP ${response.status}`);
    }

    // 处理图片数据
    const originalBuffer = Buffer.from(response.data);
    const contentType = response.headers['content-type'] || '';
    let mimeType = contentType.split(';')[0].trim();

    console.log(`${jobId}: 处理图片 ${filename}，原始大小: ${(originalBuffer.length / 1024).toFixed(2)}KB，类型: ${mimeType}`);

    // 使用Sharp处理图片
    let processedBuffer: Buffer;
    let finalMimeType: string;

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
      console.log(`${jobId}: 图片处理成功，处理后大小: ${(processedBuffer.length / 1024).toFixed(2)}KB`);
    } catch (sharpError) {
      console.warn(`${jobId}: Sharp处理失败，使用原始图片:`, sharpError);
      processedBuffer = originalBuffer;
      finalMimeType = mimeType || 'image/jpeg';
    }

    // 转换为base64
    const base64Data = processedBuffer.toString('base64');
    const dataUri = `data:${finalMimeType};base64,${base64Data}`;
    
    return dataUri;

  } catch (error) {
    console.error(`${jobId}: 下载图片失败 (${imageUrl}):`, error);
    return null;
  }
}

async function downloadAndProcessAudio(
  audioUrl: string,
  outputDir: string,
  filename: string,
  jobId: string
): Promise<DiaryEntry['audioInfo'] | null> {
  try {
    // 验证URL
    const url = new URL(audioUrl);
    if (!['http:', 'https:'].includes(url.protocol)) {
      console.warn(`${jobId}: 不支持的音频协议: ${url.protocol}`);
      return null;
    }

    console.log(`${jobId}: 下载音频: ${audioUrl}`);

    // 先获取音频文件信息
    const headResponse = await axios({
      method: 'HEAD',
      url: audioUrl,
      timeout: 20000, // 增加到20秒
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'audio/*',
        'Referer': url.origin,
      },
    });

    const contentLength = headResponse.headers['content-length'];
    const contentType = headResponse.headers['content-type'] || '';
    
    // 获取文件扩展名
    let extension = getAudioExtensionFromContentType(contentType);
    if (!extension) {
      extension = path.extname(url.pathname).toLowerCase();
      if (!extension || !['.mp3', '.m4a', '.wav', '.ogg', '.aac'].includes(extension)) {
        extension = '.mp3'; // 默认扩展名
      }
    }

    // 格式化文件大小
    const sizeInBytes = parseInt(contentLength || '0', 10);
    const sizeFormatted = formatFileSize(sizeInBytes);

    // 获取文件名
    const audioFilename = path.basename(url.pathname) || `audio-${Date.now()}${extension}`;

    // 下载音频文件（限制大小以避免内存问题）
    const maxSize = 50 * 1024 * 1024; // 50MB 限制
    if (sizeInBytes > maxSize) {
      console.warn(`${jobId}: 音频文件过大 (${sizeFormatted})，跳过下载`);
      return {
        originalUrl: audioUrl,
        filename: audioFilename,
        size: sizeFormatted,
        format: getAudioFormat(contentType, extension),
      };
    }

    // 实际下载音频文件
    const response = await axios({
      method: 'GET',
      url: audioUrl,
      responseType: 'arraybuffer',
      timeout: 45000, // 增加到45秒
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'audio/*',
        'Referer': url.origin,
      },
    });

    if (response.status !== 200) {
      throw new Error(`HTTP ${response.status}`);
    }

    // 保存音频文件到本地
    const audioBuffer = Buffer.from(response.data);
    const outputPath = path.join(outputDir, `${filename}${extension}`);
    fs.writeFileSync(outputPath, audioBuffer);

    console.log(`${jobId}: 音频下载成功: ${audioFilename} (${sizeFormatted})`);

    return {
      originalUrl: audioUrl,
      filename: audioFilename,
      size: sizeFormatted,
      format: getAudioFormat(contentType, extension),
    };

  } catch (error) {
    console.error(`${jobId}: 下载音频失败 (${audioUrl}):`, error);
    
    // 返回基本信息，即使下载失败
    const url = new URL(audioUrl);
    const audioFilename = path.basename(url.pathname) || 'unknown-audio';
    
    return {
      originalUrl: audioUrl,
      filename: audioFilename,
      size: '未知大小',
      format: '未知格式',
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

export async function cleanupMedia(jobId: string): Promise<void> {
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