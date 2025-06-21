import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { validateDiaryData, processDiaryData } from '@/utils/diaryProcessor';
import { ProcessedDiaryEntry, DiaryEntry } from '@/types/diary';

interface FileUploaderProps {
  onDataLoaded: (data: ProcessedDiaryEntry[]) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

// 挥手打招呼图标组件
const WelcomeIcon = ({ className }: { className?: string }) => (
  <svg 
    className={className}
    viewBox="0 0 1160 1024" 
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M100.9664 505.4464c-6.485333 4.778667-11.8784 10.4448-19.182933 20.8896-13.7216 19.592533-5.597867 55.637333 17.544533 82.875733 1.160533 1.365333 44.6464 55.842133 65.877333 81.1008a1689.6 1689.6 0 0 0 124.450134 133.597867c9.762133 9.352533 19.592533 18.500267 29.4912 27.511467a422.024533 422.024533 0 0 0 172.168533 91.9552c93.047467 22.9376 180.292267 11.332267 244.3264-41.7792 75.229867-62.395733 106.632533-129.024 115.575467-245.9648 10.376533-136.533333-18.773333-201.386667-115.234134-314.9824-28.194133-33.245867-52.4288-52.497067-66.423466-53.8624a40.96 40.96 0 0 0-43.8272 50.244266c2.389333 10.0352 18.500267 33.860267 47.581866 67.1744l-55.227733 43.690667A86132.053333 86132.053333 0 0 1 394.581333 186.231467c-30.037333-35.362133-42.052267-46.421333-53.4528-50.7904a40.277333 40.277333 0 0 0-39.3216 6.144c-9.352533 7.714133-14.199467 15.701333-15.36 25.1904L493.1584 410.282667a33.3824 33.3824 0 0 1-5.051733 48.401066 37.137067 37.137067 0 0 1-50.5856-5.188266L225.553067 203.844267c-17.681067-11.946667-30.993067-10.6496-49.629867 4.778666-11.946667 9.898667-19.114667 27.784533-16.042667 34.816 1.706667 3.822933 7.7824 12.424533 17.749334 24.917334l32.290133 37.956266 0.4096 0.477867 162.338133 191.146667a33.3824 33.3824 0 0 1-5.12 48.469333 37.137067 37.137067 0 0 1-50.517333-5.256533L142.336 335.530667a867.396267 867.396267 0 0 1-23.005867-27.170134l-0.2048-0.2048c0.6144 0.8192 0.546133 0.955733-0.273066 1.092267 1.2288-0.2048-9.898667 8.465067-19.387734 17.476267a33.723733 33.723733 0 0 0-11.605333 30.72c1.501867 12.629333 8.669867 28.535467 20.2752 45.6704a258.2528 258.2528 0 0 0 16.725333 21.845333l6.485334 7.645867 0.887466 1.024 2.389334 2.730666c0.682667 0.682667 0.682667 0.8192 1.570133 1.979734l141.789867 166.980266a33.3824 33.3824 0 0 1-5.051734 48.3328 37.137067 37.137067 0 0 1-50.5856-5.188266l-121.514666-143.018667z m575.351467-287.1296c39.936 3.959467 75.229867 31.9488 115.3024 79.189333 107.042133 126.020267 143.223467 206.6432 131.2768 363.656534-10.24 134.144-49.629867 217.770667-139.946667 292.6592-83.899733 69.495467-195.106133 84.241067-309.0432 56.183466a495.274667 495.274667 0 0 1-203.844267-108.7488c-10.4448-9.4208-20.821333-19.0464-31.061333-28.8768a1759.163733 1759.163733 0 0 1-129.706667-139.127466c-21.981867-26.2144-65.3312-80.554667-65.536-80.827734C2.594133 604.091733-12.629333 536.917333 21.9136 487.697067c11.332267-16.110933 21.7088-27.101867 33.928533-36.2496a307.6096 307.6096 0 0 1-7.9872-11.264c-17.134933-25.3952-28.535467-50.517333-31.402666-75.707734a99.396267 99.396267 0 0 1 32.290133-86.903466c15.701333-14.9504 27.101867-24.576 38.912-30.378667-3.413333-33.109333 14.062933-68.471467 40.891733-90.7264 29.764267-24.712533 62.464-33.928533 94.685867-27.4432a114.2784 114.2784 0 0 1 144.042667-57.480533c27.0336 10.24 44.987733 26.8288 82.875733 71.4752 28.808533 33.928533 67.037867 78.779733 114.688 134.485333 20.0704-38.229333 62.805333-63.965867 111.4112-59.1872z" />
    <path d="M578.696533 426.530133a68.266667 68.266667 0 1 0 136.533334 0 68.266667 68.266667 0 1 0-136.533334 0Z" />
  </svg>
);

export default function FileUploader({ onDataLoaded, isLoading, setIsLoading }: FileUploaderProps) {
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    message: string;
    details?: any;
  } | null>(null);

  const processFile = useCallback(async (file: File) => {
    setIsLoading(true);
    setValidationResult(null);

    try {
      // 验证文件类型
      if (!file.name.toLowerCase().endsWith('.json')) {
        throw new Error('只支持JSON格式文件');
      }

      // 验证文件大小 (最大10MB)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error('文件大小不能超过10MB');
      }

      // 读取文件内容
      const text = await file.text();
      
      // 解析JSON
      let jsonData: any;
      try {
        // 兼容性处理：修复Simple平台导出的JSON文件中可能存在的尾随逗号问题
        // 背景：Simple平台在导出JSON备份文件时，会在数组的最后一个对象后面多加一个逗号
        // 例如：[{...}, {...},] 这种格式会导致JSON.parse()失败
        // 这里先尝试直接解析，如果失败则尝试移除尾随逗号后再解析
        // 注意：当Simple平台修复这个bug后，这段兼容性代码依然是安全的
        let cleanedText = text;
        try {
          jsonData = JSON.parse(text);
        } catch (initialError) {
          // 如果直接解析失败，尝试修复尾随逗号问题
          // 移除JSON数组中最后一个逗号（在]或}前的逗号）
          cleanedText = text.replace(/,(\s*[}\]])/g, '$1');
          jsonData = JSON.parse(cleanedText);
        }
      } catch (parseError) {
        throw new Error('JSON格式无效，请检查文件格式');
      }

      // 验证数据结构
      const validationError = validateDiaryData(jsonData);
      if (validationError) {
        setValidationResult({
          isValid: false,
          message: validationError,
        });
        toast.error('数据验证失败');
        return;
      }

      // 处理数据
      const processedData = processDiaryData(jsonData as DiaryEntry[]);
      
      setValidationResult({
        isValid: true,
        message: `成功解析 ${processedData.length} 条日记记录`,
        details: {
          totalEntries: processedData.length,
          dateRange: processedData.length > 0 ? {
            earliest: processedData[processedData.length - 1].formattedDate,
            latest: processedData[0].formattedDate,
          } : null,
        }
      });

      toast.success('文件解析成功！');
      
      // 传递数据给父组件
      setTimeout(() => {
        onDataLoaded(processedData);
      }, 1000);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '文件处理失败';
      setValidationResult({
        isValid: false,
        message: errorMessage,
      });
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [onDataLoaded, setIsLoading]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      processFile(acceptedFiles[0]);
    }
  }, [processFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/json': ['.json'],
    },
    multiple: false,
    disabled: isLoading,
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* 标题 */}
      <div className="text-center mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">
          上传Simple备份文件
        </h2>
        <p className="text-sm sm:text-base text-gray-600">
          选择或拖拽你的JSON格式的备份文件到下方区域
        </p>
      </div>

      {/* 拖拽上传区域 */}
      <div
        {...getRootProps()}
        className={`
          drag-area cursor-pointer transition-all duration-200 min-h-[200px] sm:min-h-[240px]
          ${isDragActive ? 'drag-active' : ''}
          ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center justify-center space-y-3 sm:space-y-4 py-8 sm:py-12">
          {isLoading ? (
            <>
              <div className="loading-spinner w-10 h-10 sm:w-12 sm:h-12" />
              <p className="text-base sm:text-lg font-medium text-gray-600">处理文件中...</p>
              <p className="text-xs sm:text-sm text-gray-500 text-center px-4">请稍候，正在解析和验证您的数据</p>
            </>
          ) : (
            <>
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary-100 rounded-full flex items-center justify-center">
                <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-primary-600" />
              </div>
              <div className="text-center px-4">
                <p className="text-base sm:text-lg font-medium text-gray-600 mb-1">
                  {isDragActive ? '松开以上传文件' : '点击选择文件或拖拽到此处'}
                </p>
                <p className="text-xs sm:text-sm text-gray-500">
                  支持JSON格式文件，最大10MB
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 验证结果 */}
      {validationResult && (
        <div className={`mt-4 sm:mt-6 p-4 rounded-lg border ${validationResult.isValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-start space-x-3">
            {validationResult.isValid ? (
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className={`font-medium ${validationResult.isValid ? 'text-green-800' : 'text-red-800'}`}>
                {validationResult.isValid ? '验证成功' : '验证失败'}
              </p>
              <p className={`text-sm mt-1 ${validationResult.isValid ? 'text-green-700' : 'text-red-700'}`}>
                {validationResult.message}
              </p>
              {validationResult.isValid && validationResult.details && (
                <div className="mt-2 text-sm text-green-700">
                  <p>• 总记录数: {validationResult.details.totalEntries}</p>
                  {validationResult.details.dateRange && (
                    <p className="break-words">• 时间范围: {validationResult.details.dateRange.earliest} 至 {validationResult.details.dateRange.latest}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 欢迎用户 */}
      <div className="mt-6 sm:mt-8 p-4 sm:p-6 bg-gray-50 rounded-lg">
        <div className="flex items-start space-x-3">
          <WelcomeIcon className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-gray-900 mb-2">守望者你好</h3>
            <div className="text-sm text-gray-600 space-y-2">
              <p>• 传入你Simple的备份文件，一般后缀是.json文件</p>
              <p>• 就可以得到可视化的网页文件或pdf啦</p>
              <p>• 目前比较推荐下载html，会比较美观</p>
              <p>• 让我们为Simple干杯🍻</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 