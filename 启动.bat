@echo off
chcp 65001 >nul
echo.
echo 📚 启动 Simple备份文件可视化工具
echo ===============================================
echo.

REM 检查Node.js是否安装
where node >nul 2>nul
if errorlevel 1 (
    echo ❌ 错误: 请先安装Node.js
    echo 💡 下载地址: https://nodejs.org/
    echo 📋 推荐版本: 18+ 或 20+
    echo.
    pause
    exit /b 1
)

REM 显示Node.js版本
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ 检测到Node.js版本: %NODE_VERSION%

echo.
echo 🔄 正在清理之前的服务...
REM 杀死所有node.exe进程
taskkill /f /im node.exe >nul 2>nul
if %errorlevel% equ 0 (
    echo ✅ 已停止之前运行的Node.js服务
) else (
    echo ℹ️  没有发现运行中的Node.js服务
)

echo.
echo 📦 正在启动应用服务...
echo.
echo 💡 启动完成标志:
echo    🎨 前端服务: "Local: http://localhost:5173"
echo    🖥️  后端服务: "服务器运行在端口 3000"
echo.
echo 🚀 启动中，请稍候...

timeout /t 2 /nobreak >nul

npm run dev

echo.
echo 🎉 应用启动完成！
echo.
echo 📱 访问地址:
echo    🌐 前端界面: http://localhost:5173
echo    🔧 后端API:  http://localhost:3000
echo.
echo 📖 使用说明:
echo    1️⃣  拖拽上传Simple备份JSON文件
echo    2️⃣  预览数据和统计信息
echo    3️⃣  配置文档标题和作者
echo    4️⃣  选择HTML或PDF格式生成
echo    5️⃣  下载生成的可视化文档
echo.
echo 💡 按Ctrl+C停止服务
echo.
pause 