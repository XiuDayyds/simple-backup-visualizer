import React from 'react';
import { ProcessedDiaryEntry } from '../types/diary';
import { ArrowLeft, ArrowRight, Calendar, Tag, Image, Volume2, Folder, Music } from 'lucide-react';
import { getDataStatistics } from '../utils/diaryProcessor';

interface DataPreviewProps {
  data: ProcessedDiaryEntry[];
  onBack: () => void;
  onProceed: () => void;
}

export default function DataPreview({ data, onBack, onProceed }: DataPreviewProps) {
  const statistics = getDataStatistics(data);
  const previewData = data.slice(0, 5); // 只显示前5条作为预览

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* 头部 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">
            数据预览
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            检查解析结果，确认数据正确后前往生成页面
          </p>
        </div>
        
        <div className="flex flex-row sm:items-center space-x-3">
          <button
            onClick={onBack}
            className="btn-secondary flex-1 sm:flex-none"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </button>
          <button
            onClick={onProceed}
            className="btn-primary flex-1 sm:flex-none"
          >
            前往生成
            <ArrowRight className="w-4 h-4 ml-2" />
          </button>
        </div>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
          <div className="flex items-center">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 mr-2" />
            <div>
              <p className="text-xs sm:text-sm text-blue-600 font-medium">总记录数</p>
              <p className="text-lg sm:text-2xl font-bold text-blue-900">{statistics.totalEntries}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
          <div className="flex items-center">
            <Image className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 mr-2" />
            <div>
              <p className="text-xs sm:text-sm text-green-600 font-medium">包含图片</p>
              <p className="text-lg sm:text-2xl font-bold text-green-900">{statistics.withImages}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 sm:p-4">
          <div className="flex items-center">
            <Tag className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 mr-2" />
            <div>
              <p className="text-xs sm:text-sm text-purple-600 font-medium">包含标签</p>
              <p className="text-lg sm:text-2xl font-bold text-purple-900">{statistics.withTags}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 sm:p-4">
          <div className="flex items-center">
            <Folder className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 mr-2" />
            <div>
              <p className="text-xs sm:text-sm text-orange-600 font-medium">分类数量</p>
              <p className="text-lg sm:text-2xl font-bold text-orange-900">{statistics.uniqueCollections}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 时间范围 */}
      {statistics.dateRange && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-gray-900 mb-2">时间范围</h3>
          <p className="text-sm text-gray-600">
            从 <span className="font-medium">{statistics.dateRange.earliest}</span> 到{' '}
            <span className="font-medium">{statistics.dateRange.latest}</span>
          </p>
        </div>
      )}

      {/* 数据预览 */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
          <h3 className="text-base sm:text-lg font-medium text-gray-900">
            内容预览 (前5条记录)
          </h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {previewData.map((entry, index) => (
            <div key={index} className="px-4 sm:px-6 py-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-2 space-y-2 sm:space-y-0">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">
                    {entry.formattedDate}
                  </span>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                  {entry.collection && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      <Folder className="w-3 h-3 mr-1" />
                      {entry.collection}
                    </span>
                  )}
                  {entry.album && entry.album.length > 0 && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <Image className="w-3 h-3 mr-1" />
                      {entry.album.length}
                    </span>
                  )}
                  {entry.audio && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      <Volume2 className="w-3 h-3 mr-1" />
                      音频
                    </span>
                  )}
                  {entry.music && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
                      <Music className="w-3 h-3 mr-1" />
                      音乐
                    </span>
                  )}
                </div>
              </div>
              
              <div className="text-sm text-gray-600 mb-3">
                {entry.content 
                  ? (entry.content.length > 200 
                      ? entry.content.substring(0, 200) + '...' 
                      : entry.content
                    )
                  : <span className="text-gray-400 italic">此条记录仅包含多媒体内容</span>
                }
              </div>
              
              {entry.tags && entry.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {entry.tags.map((tag, tagIndex) => (
                    <span
                      key={tagIndex}
                      className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700"
                    >
                      <Tag className="w-3 h-3 mr-1" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        
        {data.length > 5 && (
          <div className="px-4 sm:px-6 py-4 bg-gray-50 border-t border-gray-200">
            <p className="text-sm text-gray-500 text-center">
              还有 {data.length - 5} 条记录未显示...
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 