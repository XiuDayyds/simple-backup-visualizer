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
    echo "按Enter键退出..."
    read
    exit 1
fi

# 显示Node.js版本
NODE_VERSION=$(node --version)
echo "✅ 检测到Node.js版本: $NODE_VERSION"

# 检查是否需要安装依赖
echo
echo "🔍 检查项目依赖..."

install_deps() {
    echo
    echo "📦 正在安装项目依赖，首次安装可能需要几分钟..."
    echo "💡 请耐心等待，不要关闭终端"
    echo

    echo "🔧 安装根目录依赖..."
    if ! npm install; then
        echo
        echo "❌ 根目录依赖安装失败！"
        echo "💡 可能的解决方案："
        echo "   1. 检查网络连接"
        echo "   2. 尝试使用国内镜像：npm config set registry https://registry.npmmirror.com/"
        echo "   3. 尝试使用sudo权限运行"
        echo
        echo "按Enter键退出..."
        read
        exit 1
    fi

    echo "🎨 安装前端依赖..."
    cd client
    if ! npm install; then
        echo
        echo "❌ 前端依赖安装失败！"
        cd ..
        echo "按Enter键退出..."
        read
        exit 1
    fi
    cd ..

    echo "🖥️  安装后端依赖..."
    cd server
    if ! npm install; then
        echo
        echo "❌ 后端依赖安装失败！"
        cd ..
        echo "按Enter键退出..."
        read
        exit 1
    fi
    cd ..

    echo
    echo "✅ 依赖安装完成！"
}

if [[ ! -d "node_modules" ]]; then
    echo "⚠️  检测到首次运行，需要安装依赖"
    install_deps
elif [[ ! -d "client/node_modules" ]]; then
    echo "⚠️  检测到前端依赖缺失"
    install_deps
elif [[ ! -d "server/node_modules" ]]; then
    echo "⚠️  检测到后端依赖缺失"
    install_deps
else
    echo "✅ 依赖检查完成"
fi

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

# 启动应用
if ! npm run dev; then
    echo
    echo "❌ 应用启动失败！"
    echo "💡 可能的原因："
    echo "   1. 端口被占用（尝试关闭其他Node.js程序）"
    echo "   2. 依赖安装不完整（删除node_modules文件夹重新运行）"
    echo "   3. 系统权限问题（尝试使用sudo权限运行）"
    echo
    echo "按Enter键退出..."
    read
    exit 1
fi

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