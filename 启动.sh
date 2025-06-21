#!/bin/bash

echo
echo "📚 启动 Simple备份文件可视化工具"
echo "==============================================="
echo

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 请先安装Node.js"
    echo "💡 下载地址: https://nodejs.org/"
    echo "📋 推荐版本: 18+ 或 20+"
    echo
    exit 1
fi

# 显示Node.js版本
NODE_VERSION=$(node --version)
echo "✅ 检测到Node.js版本: $NODE_VERSION"

echo
echo "🔄 正在清理之前的服务..."
# 查找并停止之前的Node.js进程
if pgrep -f "node.*server" > /dev/null; then
    pkill -f "node.*server"
    echo "✅ 已停止之前运行的后端服务"
else
    echo "ℹ️  没有发现运行中的后端服务"
fi

if pgrep -f "vite" > /dev/null; then
    pkill -f "vite"
    echo "✅ 已停止之前运行的前端服务"
else
    echo "ℹ️  没有发现运行中的前端服务"
fi

echo
echo "📦 正在启动应用服务..."
echo
echo "💡 启动完成标志:"
echo "   🎨 前端服务: \"Local: http://localhost:5173\""
echo "   🖥️  后端服务: \"服务器运行在端口 3000\""
echo
echo "🚀 启动中，请稍候..."

# 添加延迟让用户看到信息
sleep 2

npm run dev &

# 等待服务启动
sleep 3

echo
echo "🎉 应用启动完成！"
echo
echo "📱 访问地址:"
echo "   🌐 前端界面: http://localhost:5173"
echo "   🔧 后端API:  http://localhost:3000"
echo
echo "📖 使用说明:"
echo "   1️⃣  拖拽上传Simple备份JSON文件"
echo "   2️⃣  预览数据和统计信息"
echo "   3️⃣  配置文档标题和作者"
echo "   4️⃣  选择HTML或PDF格式生成"
echo "   5️⃣  下载生成的可视化文档"
echo
echo "💡 按Ctrl+C停止服务"
echo

# 等待用户中断
wait 