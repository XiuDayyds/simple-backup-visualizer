import React from 'react';
import { Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
          {/* 版权信息 */}
          <div className="text-sm text-gray-500">
            © 2025 Simple备份文件转可视化页面. 保留所有权利.
          </div>
          
          {/* 中间信息 */}
          <div className="flex items-center space-x-1 text-sm text-gray-500">
            <span>用</span>
            <Heart className="w-4 h-4 text-red-500" fill="currentColor" />
            <span>制作</span>
          </div>
          
          {/* 右侧信息 */}
          <div className="text-sm text-gray-500">
            来自Simple用户铮烬
          </div>
        </div>
      </div>
    </footer>
  );
} 