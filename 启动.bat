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
    echo 按任意键退出...
    pause >nul
    exit /b 1
)

REM 显示Node.js版本
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ 检测到Node.js版本: %NODE_VERSION%

REM 检查是否需要安装依赖
echo.
echo 🔍 检查项目依赖...

if not exist "node_modules" (
    echo ⚠️  检测到首次运行，需要安装依赖
    goto INSTALL_DEPS
)

if not exist "client\node_modules" (
    echo ⚠️  检测到前端依赖缺失
    goto INSTALL_DEPS
)

if not exist "server\node_modules" (
    echo ⚠️  检测到后端依赖缺失
    goto INSTALL_DEPS
)

echo ✅ 依赖检查完成
goto START_APP

:INSTALL_DEPS
echo.
echo 📦 正在安装项目依赖，首次安装可能需要几分钟...
echo 💡 请耐心等待，不要关闭窗口
echo.

echo 🔧 安装根目录依赖...
call npm install
if errorlevel 1 (
    echo.
    echo ❌ 根目录依赖安装失败！
    echo 💡 可能的解决方案：
    echo    1. 检查网络连接
    echo    2. 尝试使用国内镜像：npm config set registry https://registry.npmmirror.com/
    echo    3. 使用管理员权限运行
    echo.
    echo 按任意键退出...
    pause >nul
    exit /b 1
)

echo 🎨 安装前端依赖...
cd client
call npm install
if errorlevel 1 (
    echo.
    echo ❌ 前端依赖安装失败！
    cd ..
    echo 按任意键退出...
    pause >nul
    exit /b 1
)
cd ..

echo 🖥️  安装后端依赖...
cd server
call npm install
if errorlevel 1 (
    echo.
    echo ❌ 后端依赖安装失败！
    cd ..
    echo 按任意键退出...
    pause >nul
    exit /b 1
)
cd ..

echo.
echo ✅ 依赖安装完成！

:START_APP
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

call npm run dev
if errorlevel 1 (
    echo.
    echo ❌ 应用启动失败！
    echo 💡 可能的原因：
    echo    1. 端口被占用（尝试关闭其他Node.js程序）
    echo    2. 依赖安装不完整（删除node_modules文件夹重新运行）
    echo    3. 系统权限问题（尝试管理员权限运行）
    echo.
    echo 按任意键退出...
    pause >nul
    exit /b 1
)

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