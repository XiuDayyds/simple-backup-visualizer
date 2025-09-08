import React from 'react';
import { BookOpen, Github } from 'lucide-react';

export default function Header() {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          {/* Logo和标题 */}
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="sm:text-xl text-lg font-semibold text-gray-900 truncate">
                <span className="hidden sm:inline">Simple备份文件可视化</span>
                <span className="sm:hidden">Simple可视化</span>
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 truncate">
                <span className="hidden sm:inline">将JSON备份文件转化为美观的可视化页面</span>
                <span className="sm:hidden">JSON转可视化页面</span>
              </p>
            </div>
          </div>

          {/* 右侧链接 */}
          <div className="flex items-center ml-2">
            <a
              href="https://github.com/XiuDayyds/simple-backup-visualizer"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200 touch-manipulation"
              title="查看源码"
            >
              <Github className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </header>
  );
} 
