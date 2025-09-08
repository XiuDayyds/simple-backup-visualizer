import fs from 'fs';
import path from 'path';
import { generateHTML } from './src/services/htmlGenerator';

// 确保temp目录存在
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// 直接测试HTML生成
async function testHTMLGeneration() {
  try {
    // 测试数据
    const testData = [
      {
        date: "2025-09-07 10:00:00",
        content: "测试包含音乐分享的条目",
        music: "分享某某的单曲《测试歌曲》: https://music.163.com/test (来自@网易云音乐)"
      },
      {
        date: "2025-09-07 09:00:00",
        content: "测试普通文本条目"
      },
      {
        date: "2025-09-07 08:00:00",
        content: "包含图片和音乐的条目",
        album: [
          {type: "image", url: "https://example.com/image.jpg"}
        ],
        music: "https://music.qq.com/test"
      }
    ];
    
    // 生成选项
    const options = {
      title: '音乐字段测试',
      includeImages: true,
      includeAudio: true,
      includeTags: true,
      includeCollections: true,
      theme: 'light'
    };
    
    // 生成HTML
    const outputPath = await generateHTML(testData, options, 'test-music-123');
    
    console.log('✅ HTML生成成功:', outputPath);
    
    // 读取并检查HTML内容
    const htmlContent = fs.readFileSync(outputPath, 'utf-8');
    
    // 检查是否包含音乐分享组件
    if (htmlContent.includes('music-share')) {
      console.log('✅ HTML包含音乐分享组件');
      
      // 统计音乐分享的数量
      const musicShareCount = (htmlContent.match(/music-share/g) || []).length;
      console.log(`✅ 找到 ${musicShareCount} 个音乐分享组件`);
    } else {
      console.log('⚠️ HTML未包含音乐分享组件');
    }
    
    // 检查是否包含音乐链接
    if (htmlContent.includes('music.163.com') && htmlContent.includes('music.qq.com')) {
      console.log('✅ 音乐链接正确嵌入');
    } else {
      console.log('⚠️ 音乐链接未正确嵌入');
    }
    
    // 复制到output目录以便查看
    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const destPath = path.join(outputDir, 'test_music_output.html');
    fs.copyFileSync(outputPath, destPath);
    console.log('✅ 文件已复制到:', destPath);
    console.log('📌 可以在浏览器中打开查看: file://' + destPath.replace(/\\/g, '/'));
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

testHTMLGeneration();