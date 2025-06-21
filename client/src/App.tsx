import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import FileUploader from './components/FileUploader';
import DataPreview from './components/DataPreview';
import DocumentGenerator from './components/DocumentGenerator';
import Header from './components/Header';
import Footer from './components/Footer';
import { ProcessedDiaryEntry } from './types/diary';

export default function App() {
  const [diaryData, setDiaryData] = useState<ProcessedDiaryEntry[]>([]);
  const [currentStep, setCurrentStep] = useState<'upload' | 'preview' | 'generate'>('upload');
  const [isLoading, setIsLoading] = useState(false);

  const handleDataLoaded = (data: ProcessedDiaryEntry[]) => {
    setDiaryData(data);
    setCurrentStep('preview');
  };

  const handleBackToUpload = () => {
    setDiaryData([]);
    setCurrentStep('upload');
  };

  const handleProceedToGenerate = () => {
    setCurrentStep('generate');
  };

  const handleBackToPreview = () => {
    setCurrentStep('preview');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* 步骤指示器 */}
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center justify-center space-x-2 sm:space-x-4">
              <div className={`flex items-center ${currentStep === 'upload' ? 'text-primary-600' : currentStep === 'preview' || currentStep === 'generate' ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium ${currentStep === 'upload' ? 'bg-primary-100 text-primary-600' : currentStep === 'preview' || currentStep === 'generate' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                  1
                </div>
                <span className="ml-1 sm:ml-2 text-xs sm:text-sm font-medium hidden xs:inline">上传文件</span>
                <span className="ml-1 sm:ml-2 text-xs sm:text-sm font-medium xs:hidden">上传</span>
              </div>
              
              <div className={`w-4 sm:w-8 h-px ${currentStep === 'preview' || currentStep === 'generate' ? 'bg-green-600' : 'bg-gray-300'}`} />
              
              <div className={`flex items-center ${currentStep === 'preview' ? 'text-primary-600' : currentStep === 'generate' ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium ${currentStep === 'preview' ? 'bg-primary-100 text-primary-600' : currentStep === 'generate' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                  2
                </div>
                <span className="ml-1 sm:ml-2 text-xs sm:text-sm font-medium hidden xs:inline">预览数据</span>
                <span className="ml-1 sm:ml-2 text-xs sm:text-sm font-medium xs:hidden">预览</span>
              </div>
              
              <div className={`w-4 sm:w-8 h-px ${currentStep === 'generate' ? 'bg-green-600' : 'bg-gray-300'}`} />
              
              <div className={`flex items-center ${currentStep === 'generate' ? 'text-primary-600' : 'text-gray-400'}`}>
                <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium ${currentStep === 'generate' ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-400'}`}>
                  3
                </div>
                <span className="ml-1 sm:ml-2 text-xs sm:text-sm font-medium hidden xs:inline">生成文档</span>
                <span className="ml-1 sm:ml-2 text-xs sm:text-sm font-medium xs:hidden">生成</span>
              </div>
            </div>
          </div>

          {/* 主要内容区域 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 min-h-[500px] sm:min-h-[600px]">
            {currentStep === 'upload' && (
              <FileUploader
                onDataLoaded={handleDataLoaded}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
              />
            )}
            
            {currentStep === 'preview' && (
              <DataPreview
                data={diaryData}
                onBack={handleBackToUpload}
                onProceed={handleProceedToGenerate}
              />
            )}
            
            {currentStep === 'generate' && (
              <DocumentGenerator
                data={diaryData}
                onBack={handleBackToPreview}
                onReset={handleBackToUpload}
              />
            )}
          </div>
        </div>
      </main>
      
      <Footer />
      
      {/* Toast通知 */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            style: {
              background: '#10b981',
            },
          },
          error: {
            style: {
              background: '#ef4444',
            },
          },
        }}
      />
    </div>
  );
} 