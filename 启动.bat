@echo off
chcp 65001 >nul 2>&1

echo.
echo ================================================
echo   Simple Backup Visualizer Launcher
echo   Simple备份文件可视化工具启动器
echo ================================================
echo.

REM Check Node.js installation
where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js not found!
    echo [错误] 未检测到Node.js！
    echo.
    echo Please install Node.js first:
    echo 请先安装Node.js：
    echo Download: https://nodejs.org/
    echo Recommended version: 18+ or 20+
    echo 推荐版本：18+ 或 20+
    echo.
    echo Press any key to exit...
    echo 按任意键退出...
    pause >nul
    exit /b 1
)

REM Show Node.js version
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [INFO] Node.js version detected: %NODE_VERSION%
echo [信息] 检测到Node.js版本：%NODE_VERSION%

REM Check dependencies
echo.
echo [INFO] Checking project dependencies...
echo [信息] 检查项目依赖...

if not exist "node_modules" (
    echo [WARN] First run detected, need to install dependencies
    echo [警告] 检测到首次运行，需要安装依赖
    goto INSTALL_DEPS
)

if not exist "client\node_modules" (
    echo [WARN] Frontend dependencies missing
    echo [警告] 检测到前端依赖缺失
    goto INSTALL_DEPS
)

if not exist "server\node_modules" (
    echo [WARN] Backend dependencies missing  
    echo [警告] 检测到后端依赖缺失
    goto INSTALL_DEPS
)

echo [OK] Dependencies check completed
echo [完成] 依赖检查完成
goto START_APP

:INSTALL_DEPS
echo.
echo [INFO] Installing project dependencies...
echo [信息] 正在安装项目依赖，首次安装可能需要几分钟...
echo Please wait, do not close this window
echo 请耐心等待，不要关闭窗口
echo.

echo [STEP 1/3] Installing root dependencies...
echo [步骤 1/3] 安装根目录依赖...
call npm install
if errorlevel 1 (
    echo.
    echo [ERROR] Root dependencies installation failed!
    echo [错误] 根目录依赖安装失败！
    echo.
    echo Possible solutions:
    echo 可能的解决方案：
    echo 1. Check network connection / 检查网络连接
    echo 2. Use China mirror: npm config set registry https://registry.npmmirror.com/
    echo    使用国内镜像：npm config set registry https://registry.npmmirror.com/
    echo 3. Run as administrator / 使用管理员权限运行
    echo.
    echo Press any key to exit...
    echo 按任意键退出...
    pause >nul
    exit /b 1
)

echo [STEP 2/3] Installing frontend dependencies...
echo [步骤 2/3] 安装前端依赖...
cd client
call npm install
if errorlevel 1 (
    echo.
    echo [ERROR] Frontend dependencies installation failed!
    echo [错误] 前端依赖安装失败！
    cd ..
    echo Press any key to exit...
    echo 按任意键退出...
    pause >nul
    exit /b 1
)
cd ..

echo [STEP 3/3] Installing backend dependencies...
echo [步骤 3/3] 安装后端依赖...
cd server
call npm install
if errorlevel 1 (
    echo.
    echo [ERROR] Backend dependencies installation failed!
    echo [错误] 后端依赖安装失败！
    cd ..
    echo Press any key to exit...
    echo 按任意键退出...
    pause >nul
    exit /b 1
)
cd ..

echo.
echo [OK] Dependencies installation completed!
echo [完成] 依赖安装完成！

:START_APP
echo.
echo [INFO] Cleaning previous services...
echo [信息] 正在清理之前的服务...
taskkill /f /im node.exe >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Previous Node.js services stopped
    echo [完成] 已停止之前运行的Node.js服务
) else (
    echo [INFO] No running Node.js services found
    echo [信息] 没有发现运行中的Node.js服务
)

echo.
echo [INFO] Starting application services...
echo [信息] 正在启动应用服务...
echo.
echo Startup completion indicators:
echo 启动完成标志：
echo   Frontend: "Local: http://localhost:5173"
echo   前端服务："Local: http://localhost:5173"
echo   Backend: "Server running on port 3000"
echo   后端服务："服务器运行在端口 3000"
echo.
echo [INFO] Starting, please wait...
echo [信息] 启动中，请稍候...

timeout /t 2 /nobreak >nul

call npm run dev
if errorlevel 1 (
    echo.
    echo [ERROR] Application startup failed!
    echo [错误] 应用启动失败！
    echo.
    echo Possible reasons:
    echo 可能的原因：
    echo 1. Port occupied / 端口被占用
    echo 2. Incomplete dependencies / 依赖安装不完整
    echo 3. Permission issues / 系统权限问题
    echo.
    echo Press any key to exit...
    echo 按任意键退出...
    pause >nul
    exit /b 1
)

echo.
echo [SUCCESS] Application started successfully!
echo [成功] 应用启动完成！
echo.
echo Access URLs:
echo 访问地址：
echo   Frontend: http://localhost:5173
echo   前端界面：http://localhost:5173
echo   Backend API: http://localhost:3000
echo   后端API：http://localhost:3000
echo.
echo Usage Instructions:
echo 使用说明：
echo   1. Drag and drop Simple backup JSON file
echo      拖拽上传Simple备份JSON文件
echo   2. Preview data and statistics
echo      预览数据和统计信息
echo   3. Configure document title and author
echo      配置文档标题和作者
echo   4. Select HTML or PDF format
echo      选择HTML或PDF格式生成
echo   5. Download generated document
echo      下载生成的可视化文档
echo.
echo Press Ctrl+C to stop services
echo 按Ctrl+C停止服务
echo.
pause 