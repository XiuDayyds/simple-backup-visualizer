import fs from 'fs';
import path from 'path';
import { generateHTML } from './src/services/htmlGenerator';

// 确保目录存在
const tempDir = path.join(__dirname, 'temp');
const outputDir = path.join(__dirname, 'output');
[tempDir, outputDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// 测试完整文件
async function testFullFile() {
  try {
    // 读取完整的测试文件
    const testDataPath = path.join(__dirname, '..', 'backup_moment_110382707_2025_09_06_00_40_04.json');
    const testData = JSON.parse(fs.readFileSync(testDataPath, 'utf-8'));
    
    console.log(`📊 读取到 ${testData.length} 条记录`);
    
    // 统计各类数据
    const stats = {
      total: testData.length,
      withContent: testData.filter((e: any) => e.content).length,
      withImages: testData.filter((e: any) => e.album && e.album.some((m: any) => m.type === 'image')).length,
      withVideos: testData.filter((e: any) => e.album && e.album.some((m: any) => m.type === 'video')).length,
      withAudio: testData.filter((e: any) => e.audio).length,
      withMusic: testData.filter((e: any) => e.music).length,
      withTags: testData.filter((e: any) => e.tags && e.tags.length > 0).length,
      withCollection: testData.filter((e: any) => e.collection).length,
    };
    
    console.log('📈 数据统计:');
    console.log(`  - 文本内容: ${stats.withContent} 条`);
    console.log(`  - 包含图片: ${stats.withImages} 条`);
    console.log(`  - 包含视频: ${stats.withVideos} 条`);
    console.log(`  - 包含音频: ${stats.withAudio} 条`);
    console.log(`  - 包含音乐分享: ${stats.withMusic} 条`);
    console.log(`  - 包含标签: ${stats.withTags} 条`);
    console.log(`  - 包含合集: ${stats.withCollection} 条`);
    
    // 生成选项
    const options = {
      title: 'Simple备份完整测试',
      author: '测试用户',
      includeImages: true,
      includeAudio: true,
      includeTags: true,
      includeCollections: true,
      theme: 'light'
    };
    
    console.log('\n⚙️ 开始生成HTML...');
    
    // 生成HTML
    const outputPath = await generateHTML(testData, options, 'test-full-' + Date.now());
    
    console.log('✅ HTML生成成功!');
    
    // 读取并检查HTML内容
    const htmlContent = fs.readFileSync(outputPath, 'utf-8');
    
    // 检查各种组件
    const checks = [
      { pattern: 'music-share', name: '音乐分享组件' },
      { pattern: 'audio-player', name: '音频播放器' },
      { pattern: 'entry-images', name: '图片容器' },
      { pattern: 'entry-videos', name: '视频容器' },
      { pattern: 'entry-tags', name: '标签容器' },
      { pattern: 'entry-collection', name: '合集标记' },
    ];
    
    console.log('\n🔍 组件检查:');
    checks.forEach(check => {
      const count = (htmlContent.match(new RegExp(check.pattern, 'g')) || []).length;
      if (count > 0) {
        console.log(`  ✅ ${check.name}: 找到 ${count} 个`);
      } else {
        console.log(`  ⚠️ ${check.name}: 未找到`);
      }
    });
    
    // 保存到output目录
    const destPath = path.join(outputDir, 'full_test_output.html');
    fs.copyFileSync(outputPath, destPath);
    
    console.log('\n✅ 测试完成!');
    console.log('📁 输出文件:', destPath);
    console.log('🌐 浏览器查看: file://' + destPath.replace(/\\/g, '/'));
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
    if (error instanceof Error) {
      console.error('错误详情:', error.stack);
    }
  }
}

testFullFile();