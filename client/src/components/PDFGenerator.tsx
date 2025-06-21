import React, { useState } from 'react';
import { ProcessedDiaryEntry, PDFGenerationOptions } from '../types/diary';
import { ArrowLeft, Download, FileText, Settings, Image, Volume2, Tag, Folder } from 'lucide-react';
import { generatePDF, downloadPDF } from '../services/api';
import toast from 'react-hot-toast';

interface PDFGeneratorProps {
  data: ProcessedDiaryEntry[];
  onBack: () => void;
  onReset: () => void;
}

export default function PDFGenerator({ data, onBack, onReset }: PDFGeneratorProps) {
  const [options, setOptions] = useState<PDFGenerationOptions>({
    title: '我的日记',
    author: '',
    includeImages: true,
    includeAudio: true,
    includeTags: true,
    includeCollections: true,
    pageSize: 'A4',
    theme: 'light',
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setProgress(0);
    setDownloadUrl(null);

    try {
      // 创建临时文件
      const jsonData = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const file = new File([blob], 'diary.json', { type: 'application/json' });

      // 生成PDF
      const result = await generatePDF(file, options, (progressData) => {
        setProgress(progressData.percentage);
      });

      if (result.success && result.downloadUrl) {
        setDownloadUrl(result.downloadUrl);
        toast.success('PDF生成成功！');
      } else {
        throw new Error(result.message || 'PDF生成失败');
      }
    } catch (error) {
      console.error('PDF生成错误:', error);
      toast.error(error instanceof Error ? error.message : 'PDF生成失败');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!downloadUrl) return;
    
    try {
      // 从下载URL中提取文件名
      const filename = downloadUrl.split('/').pop() || 'diary.pdf';
      
      // 使用API下载函数获取文件blob
      const blob = await downloadPDF(filename);
      
      // 创建下载链接
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // 清理
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
      toast.success('PDF下载成功！');
    } catch (error) {
      console.error('下载失败:', error);
      toast.error('下载失败，请重试');
    }
  };

  return (
    <div className="p-8">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            生成PDF
          </h2>
          <p className="text-gray-600">
            配置PDF生成选项，生成美观的日记文档
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="btn-secondary"
            disabled={isGenerating}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </button>
          <button
            onClick={onReset}
            className="btn-secondary"
            disabled={isGenerating}
          >
            重新开始
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 配置面板 */}
        <div className="space-y-6">
          <div className="card">
            <div className="flex items-center mb-4">
              <Settings className="w-5 h-5 text-gray-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">基础设置</h3>
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
                  className="input-field"
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
                  className="input-field"
                  placeholder="请输入作者姓名"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  页面尺寸
                </label>
                <select
                  value={options.pageSize}
                  onChange={(e) => setOptions(prev => ({ ...prev, pageSize: e.target.value as any }))}
                  className="input-field"
                >
                  <option value="A4">A4</option>
                  <option value="A5">A5</option>
                  <option value="Letter">Letter</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  主题风格
                </label>
                <select
                  value={options.theme}
                  onChange={(e) => setOptions(prev => ({ ...prev, theme: e.target.value as any }))}
                  className="input-field"
                >
                  <option value="light">浅色主题</option>
                  <option value="dark">深色主题</option>
                </select>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center mb-4">
              <FileText className="w-5 h-5 text-gray-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">内容选项</h3>
            </div>
            
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={options.includeImages}
                  onChange={(e) => setOptions(prev => ({ ...prev, includeImages: e.target.checked }))}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <Image className="w-4 h-4 text-gray-600 ml-3 mr-2" />
                <span className="text-sm text-gray-700">包含图片</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={options.includeAudio}
                  onChange={(e) => setOptions(prev => ({ ...prev, includeAudio: e.target.checked }))}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <Volume2 className="w-4 h-4 text-gray-600 ml-3 mr-2" />
                <span className="text-sm text-gray-700">包含音频链接</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={options.includeTags}
                  onChange={(e) => setOptions(prev => ({ ...prev, includeTags: e.target.checked }))}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <Tag className="w-4 h-4 text-gray-600 ml-3 mr-2" />
                <span className="text-sm text-gray-700">包含标签</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={options.includeCollections}
                  onChange={(e) => setOptions(prev => ({ ...prev, includeCollections: e.target.checked }))}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <Folder className="w-4 h-4 text-gray-600 ml-3 mr-2" />
                <span className="text-sm text-gray-700">包含分类信息</span>
              </label>
            </div>
          </div>
        </div>

        {/* 生成面板 */}
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              生成预览
            </h3>
            
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
              <div className="text-sm text-gray-600 space-y-1">
                <p><span className="font-medium">文档标题:</span> {options.title}</p>
                <p><span className="font-medium">作者:</span> {options.author || '未设置'}</p>
                <p><span className="font-medium">页面尺寸:</span> {options.pageSize}</p>
                <p><span className="font-medium">主题:</span> {options.theme === 'light' ? '浅色' : '深色'}</p>
                <p><span className="font-medium">总条目:</span> {data.length} 条</p>
              </div>
            </div>

            {!isGenerating && !downloadUrl && (
              <button
                onClick={handleGenerate}
                className="btn-primary w-full"
              >
                <FileText className="w-4 h-4 mr-2" />
                开始生成PDF
              </button>
            )}

            {isGenerating && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">生成进度</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-500 text-center">
                  正在处理图片和生成PDF，请稍候...
                </p>
              </div>
            )}

            {downloadUrl && (
              <div className="space-y-3">
                <div className="flex items-center justify-center w-full h-20 bg-green-50 border border-green-200 rounded-lg">
                  <div className="text-center">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <FileText className="w-4 h-4 text-green-600" />
                    </div>
                    <p className="text-sm font-medium text-green-800">PDF生成完成</p>
                  </div>
                </div>
                
                <button
                  onClick={handleDownload}
                  className="btn-primary w-full"
                >
                  <Download className="w-4 h-4 mr-2" />
                  下载PDF
                </button>
                
                <button
                  onClick={onReset}
                  className="btn-secondary w-full"
                >
                  生成新的PDF
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 