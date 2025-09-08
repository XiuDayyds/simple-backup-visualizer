import React, { useState, useEffect } from 'react';
import { ProcessedDiaryEntry, DocumentGenerationOptions, UploadProgress } from '../types/diary';
import { ArrowLeft, Download, FileText, Settings, Image, Volume2, Tag, Folder, Globe, AlertCircle } from 'lucide-react';
import { generateDocument, downloadFile } from '../services/api';
import toast from 'react-hot-toast';

interface DocumentGeneratorProps {
  data: ProcessedDiaryEntry[];
  onBack: () => void;
  onReset: () => void;
}

// Helper function to format remaining time
function formatRemainingTime(ms: number): string {
  const seconds = Math.ceil(ms / 1000);
  if (seconds < 60) {
    return `约 ${seconds} 秒`;
  }
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) {
    return minutes === 1 ? '约 1 分钟' : `约 ${minutes} 分钟`;
  }
  const hours = Math.ceil(minutes / 60);
  return hours === 1 ? '约 1 小时' : `约 ${hours} 小时`;
}

export default function DocumentGenerator({ data, onBack, onReset }: DocumentGeneratorProps) {
  const [options, setOptions] = useState<DocumentGenerationOptions>({
    title: '我的日记',
    author: '',
    includeImages: true,
    includeAudio: true,
    includeTags: true,
    includeCollections: true,
    pageSize: 'A4',
    theme: 'light',
    outputFormat: 'html',
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [targetProgress, setTargetProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [estimatedRemaining, setEstimatedRemaining] = useState<number | undefined>(undefined);

  // Smooth progress animation using requestAnimationFrame
  useEffect(() => {
    if (Math.abs(targetProgress - progress) < 0.5) {
      setProgress(targetProgress);
      return;
    }

    const animationFrame = requestAnimationFrame(() => {
      // Smooth interpolation towards target
      const diff = targetProgress - progress;
      const step = diff * 0.1; // 10% of the difference per frame
      setProgress(prev => {
        const newProgress = prev + step;
        // Ensure we don't overshoot
        if (diff > 0) {
          return Math.min(newProgress, targetProgress);
        } else {
          return Math.max(newProgress, targetProgress);
        }
      });
    });

    return () => cancelAnimationFrame(animationFrame);
  }, [progress, targetProgress]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setProgress(0);
    setTargetProgress(0);
    setProgressMessage('');
    setDownloadUrl(null);
    setEstimatedRemaining(undefined);

    try {
      const jsonData = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const file = new File([blob], 'diary.json', { type: 'application/json' });

      const result = await generateDocument(file, options, (progressData: UploadProgress) => {
        setTargetProgress(progressData.percentage);
        if (progressData.message) {
          setProgressMessage(progressData.message);
        }
        // Handle estimated remaining time for large files
        if (progressData.estimatedRemaining !== undefined && data.length > 5000) {
          setEstimatedRemaining(progressData.estimatedRemaining);
        }
      });

      if (result.success && result.downloadUrl) {
        // Smoothly animate to 100%
        setTargetProgress(100);
        setProgressMessage('生成完成！');
        
        // Wait for animation to complete
        setTimeout(() => {
          setDownloadUrl(result.downloadUrl);
          const formatName = options.outputFormat === 'pdf' ? 'PDF' : 'HTML';
          toast.success(`${formatName}生成成功！`);
        }, 500);
      } else {
        throw new Error(result.message || '文档生成失败');
      }
    } catch (error) {
      console.error('文档生成错误:', error);
      toast.error(error instanceof Error ? error.message : '文档生成失败');
      setTargetProgress(0);
      setProgress(0);
    } finally {
      setTimeout(() => {
        setIsGenerating(false);
      }, 600);
    }
  };

  const handleDownload = async () => {
    if (!downloadUrl) return;
    
    try {
      const filename = downloadUrl.split('/').pop() || `diary.${options.outputFormat}`;
      const blob = await downloadFile(filename);
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
      const formatName = options.outputFormat === 'pdf' ? 'PDF' : 'HTML';
      toast.success(`${formatName}下载成功！`);
    } catch (error) {
      console.error('下载失败:', error);
      toast.error('下载失败，请重试');
    }
  };

  const getFormatInfo = () => {
    if (options.outputFormat === 'pdf') {
      return {
        icon: FileText,
        name: 'PDF',
        description: '便携式文档格式，适合打印和分享',
        features: ['支持图片', '支持文字', '音频/视频显示为链接', '适合打印'],
        limitations: ['不支持直接播放音频/视频']
      };
    } else {
      return {
        icon: Globe,
        name: 'HTML',
        description: '网页格式，支持完整的多媒体体验',
        features: ['支持图片', '支持文字', '支持音频播放', '支持视频播放', '交互式体验'],
        limitations: ['需要浏览器打开']
      };
    }
  };

  const formatInfo = getFormatInfo();
  const FormatIcon = formatInfo.icon;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">
            生成文档
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            选择输出格式并配置生成选项，创建美观的日记文档
          </p>
        </div>
        
        <div className="flex flex-row space-x-3">
          <button
            onClick={onBack}
            className="btn-secondary flex-1 sm:flex-none"
            disabled={isGenerating}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            <span className="hidden xs:inline">返回</span>
            <span className="xs:hidden">返回</span>
          </button>
          <button
            onClick={onReset}
            className="btn-secondary flex-1 sm:flex-none"
            disabled={isGenerating}
          >
            <span className="hidden xs:inline">重新开始</span>
            <span className="xs:hidden">重置</span>
          </button>
        </div>
      </div>

      <div className="space-y-6 lg:grid lg:grid-cols-2 lg:gap-8 lg:space-y-0">
        <div className="space-y-6">
          <div className="card">
            <div className="flex items-center mb-4">
              <FormatIcon className="w-5 h-5 text-gray-600 mr-2" />
              <h3 className="text-base sm:text-lg font-medium text-gray-900">输出格式</h3>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
                <label className={`relative flex flex-col p-3 sm:p-4 border-2 rounded-lg transition-all ${
                  isGenerating 
                    ? 'cursor-not-allowed opacity-50' 
                    : 'cursor-pointer touch-manipulation'
                } ${
                  options.outputFormat === 'html' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="outputFormat"
                    value="html"
                    checked={options.outputFormat === 'html'}
                    disabled={isGenerating}
                    onChange={(e) => {
                      setOptions(prev => ({ ...prev, outputFormat: e.target.value as 'html' | 'pdf' }));
                      setDownloadUrl(null); // 清空下载链接，需要重新生成
                      setProgress(0); // 重置进度
                    }}
                    className="sr-only"
                  />
                  <div className="flex items-center space-x-2 mb-2">
                    <Globe className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-gray-900">HTML</span>
                  </div>
                  <span className="text-xs sm:text-sm text-gray-600">完整多媒体支持</span>
                  <span className="text-xs text-green-600 mt-1">推荐</span>
                </label>
                
                <label className={`relative flex flex-col p-3 sm:p-4 border-2 rounded-lg transition-all ${
                  isGenerating 
                    ? 'cursor-not-allowed opacity-50' 
                    : 'cursor-pointer touch-manipulation'
                } ${
                  options.outputFormat === 'pdf' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="outputFormat"
                    value="pdf"
                    checked={options.outputFormat === 'pdf'}
                    disabled={isGenerating}
                    onChange={(e) => {
                      setOptions(prev => ({ 
                        ...prev, 
                        outputFormat: e.target.value as 'html' | 'pdf',
                        // PDF模式下强制使用浅色主题
                        theme: e.target.value === 'pdf' ? 'light' : prev.theme
                      }));
                      setDownloadUrl(null); // 清空下载链接，需要重新生成
                      setProgress(0); // 重置进度
                    }}
                    className="sr-only"
                  />
                  <div className="flex items-center space-x-2 mb-2">
                    <FileText className="w-5 h-5 text-red-600" />
                    <span className="font-medium text-gray-900">PDF</span>
                  </div>
                  <span className="text-xs sm:text-sm text-gray-600">适合打印分享</span>
                </label>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                <h4 className="font-medium text-gray-900 mb-2 text-sm sm:text-base">{formatInfo.name} 格式特点</h4>
                <p className="text-xs sm:text-sm text-gray-600 mb-3">{formatInfo.description}</p>
                
                <div className="space-y-2">
                  <div>
                    <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded">支持功能</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {formatInfo.features.map((feature, index) => (
                        <span key={index} className="text-xs text-gray-600 bg-white px-2 py-1 rounded border">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  {formatInfo.limitations.length > 0 && (
                    <div>
                      <span className="text-xs font-medium text-orange-700 bg-orange-100 px-2 py-1 rounded">注意事项</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {formatInfo.limitations.map((limitation, index) => (
                          <span key={index} className="text-xs text-gray-600 bg-white px-2 py-1 rounded border">
                            {limitation}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center mb-4">
              <Settings className="w-5 h-5 text-gray-600 mr-2" />
              <h3 className="text-base sm:text-lg font-medium text-gray-900">基础设置</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  文档标题
                </label>
                <input
                  type="text"
                  value={options.title}
                  onChange={(e) => setOptions(prev => ({ ...prev, title: e.target.value }))}
                  className="input-field text-base"
                  placeholder="我的日记"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  作者
                </label>
                <input
                  type="text"
                  value={options.author}
                  onChange={(e) => setOptions(prev => ({ ...prev, author: e.target.value }))}
                  className="input-field text-base"
                  placeholder="请输入作者姓名"
                />
              </div>
              
              {options.outputFormat === 'pdf' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    页面尺寸
                  </label>
                  <select
                    value={options.pageSize}
                    onChange={(e) => setOptions(prev => ({ ...prev, pageSize: e.target.value as any }))}
                    className="input-field text-base"
                  >
                    <option value="A4">A4</option>
                    <option value="A5">A5</option>
                    <option value="Letter">Letter</option>
                  </select>
                </div>
              )}
              
              {options.outputFormat === 'html' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    主题风格
                  </label>
                  <select
                    value={options.theme}
                    onChange={(e) => setOptions(prev => ({ ...prev, theme: e.target.value as any }))}
                    className="input-field text-base"
                  >
                    <option value="light">浅色主题</option>
                    <option value="dark">深色主题</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="flex items-center mb-4">
              <FileText className="w-5 h-5 text-gray-600 mr-2" />
              <h3 className="text-base sm:text-lg font-medium text-gray-900">内容选项</h3>
            </div>
            
            <div className="space-y-4">
              <label className="flex items-center touch-manipulation">
                <input
                  type="checkbox"
                  checked={options.includeImages}
                  onChange={(e) => setOptions(prev => ({ ...prev, includeImages: e.target.checked }))}
                  className="h-5 w-5 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <Image className="w-4 h-4 text-gray-600 ml-3 mr-2" />
                <span className="text-sm text-gray-700">包含图片</span>
              </label>
              
              <label className="flex items-center touch-manipulation">
                <input
                  type="checkbox"
                  checked={options.includeAudio}
                  onChange={(e) => setOptions(prev => ({ ...prev, includeAudio: e.target.checked }))}
                  className="h-5 w-5 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <Volume2 className="w-4 h-4 text-gray-600 ml-3 mr-2" />
                <span className="text-sm text-gray-700">
                  包含音频
                  {options.outputFormat === 'pdf' && (
                    <span className="text-xs text-gray-500 ml-1">(显示为链接)</span>
                  )}
                </span>
              </label>
              
              <label className="flex items-center touch-manipulation">
                <input
                  type="checkbox"
                  checked={options.includeTags}
                  onChange={(e) => setOptions(prev => ({ ...prev, includeTags: e.target.checked }))}
                  className="h-5 w-5 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <Tag className="w-4 h-4 text-gray-600 ml-3 mr-2" />
                <span className="text-sm text-gray-700">包含标签</span>
              </label>
              
              <label className="flex items-center touch-manipulation">
                <input
                  type="checkbox"
                  checked={options.includeCollections}
                  onChange={(e) => setOptions(prev => ({ ...prev, includeCollections: e.target.checked }))}
                  className="h-5 w-5 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <Folder className="w-4 h-4 text-gray-600 ml-3 mr-2" />
                <span className="text-sm text-gray-700">包含分类信息</span>
              </label>
            </div>

            {options.outputFormat === 'pdf' && (options.includeAudio) && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-amber-800 min-w-0">
                    <p className="font-medium">PDF格式限制</p>
                    <p>音频和视频在PDF中将显示为可点击的链接，无法直接播放。如需完整多媒体体验，建议选择HTML格式。</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-4">
              生成预览
            </h3>
            
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
              <div className="text-sm text-gray-600 space-y-1">
                <p><span className="font-medium">输出格式:</span> {formatInfo.name}</p>
                <p><span className="font-medium">文档标题:</span> {options.title}</p>
                <p><span className="font-medium">作者:</span> {options.author || '未设置'}</p>
                {options.outputFormat === 'pdf' && (
                  <p><span className="font-medium">页面尺寸:</span> {options.pageSize}</p>
                )}
                {options.outputFormat === 'html' && (
                  <p><span className="font-medium">主题:</span> {options.theme === 'light' ? '浅色' : '深色'}</p>
                )}
                <p><span className="font-medium">总条目:</span> {data.length} 条</p>
              </div>
            </div>

            {!isGenerating && !downloadUrl && (
              <button
                onClick={handleGenerate}
                className="btn-primary w-full touch-manipulation"
              >
                <FormatIcon className="w-4 h-4 mr-2" />
                开始生成{formatInfo.name}
              </button>
            )}

            {isGenerating && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">生成进度</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <div className={`progress-bar ${isGenerating ? 'active' : ''}`}>
                  <div 
                    className={`progress-fill ${isGenerating ? 'active' : ''}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-xs sm:text-sm text-gray-600">
                    {progressMessage || `正在生成${formatInfo.name}文档...`}
                  </p>
                  {estimatedRemaining !== undefined && data.length > 5000 && (
                    <p className="text-xs text-gray-500">
                      预计剩余时间: {formatRemainingTime(estimatedRemaining)}
                    </p>
                  )}
                </div>
              </div>
            )}

            {downloadUrl && (
              <div className="space-y-3">
                <div className="flex items-center justify-center w-full h-20 bg-green-50 border border-green-200 rounded-lg">
                  <div className="text-center">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <FormatIcon className="w-4 h-4 text-green-600" />
                    </div>
                    <p className="text-sm font-medium text-green-800">{formatInfo.name}生成完成</p>
                  </div>
                </div>
                
                <button
                  onClick={handleDownload}
                  className="btn-primary w-full touch-manipulation"
                >
                  <Download className="w-4 h-4 mr-2" />
                  下载{formatInfo.name}
                </button>
                
                <button
                  onClick={onReset}
                  className="btn-secondary w-full touch-manipulation"
                >
                  生成新的文档
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 