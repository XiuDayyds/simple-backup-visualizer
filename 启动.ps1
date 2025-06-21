# Simple备份文件可视化工具启动脚本
# Simple Backup Visualizer Launcher

# 设置控制台编码为UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8

# 设置错误处理
$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "   Simple Backup Visualizer Launcher" -ForegroundColor Green
Write-Host "   Simple备份文件可视化工具启动器" -ForegroundColor Green  
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# 检查Node.js是否安装
Write-Host "[INFO] Checking Node.js installation..." -ForegroundColor Yellow
Write-Host "[信息] 检查Node.js安装..." -ForegroundColor Yellow

try {
    $nodeVersion = node --version
    Write-Host "[OK] Node.js version detected: $nodeVersion" -ForegroundColor Green
    Write-Host "[完成] 检测到Node.js版本：$nodeVersion" -ForegroundColor Green
}
catch {
    Write-Host "[ERROR] Node.js not found!" -ForegroundColor Red
    Write-Host "[错误] 未检测到Node.js！" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Node.js first:" -ForegroundColor Yellow
    Write-Host "请先安装Node.js：" -ForegroundColor Yellow
    Write-Host "Download: https://nodejs.org/" -ForegroundColor Cyan
    Write-Host "Recommended version: 18+ or 20+" -ForegroundColor Cyan
    Write-Host "推荐版本：18+ 或 20+" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Press any key to exit..." -ForegroundColor Gray
    Write-Host "按任意键退出..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# 检查依赖
Write-Host ""
Write-Host "[INFO] Checking project dependencies..." -ForegroundColor Yellow
Write-Host "[信息] 检查项目依赖..." -ForegroundColor Yellow

$needInstall = $false

if (-not (Test-Path "node_modules")) {
    Write-Host "[WARN] First run detected, need to install dependencies" -ForegroundColor Magenta
    Write-Host "[警告] 检测到首次运行，需要安装依赖" -ForegroundColor Magenta
    $needInstall = $true
}
elseif (-not (Test-Path "client\node_modules")) {
    Write-Host "[WARN] Frontend dependencies missing" -ForegroundColor Magenta
    Write-Host "[警告] 检测到前端依赖缺失" -ForegroundColor Magenta
    $needInstall = $true
}
elseif (-not (Test-Path "server\node_modules")) {
    Write-Host "[WARN] Backend dependencies missing" -ForegroundColor Magenta
    Write-Host "[警告] 检测到后端依赖缺失" -ForegroundColor Magenta
    $needInstall = $true
}
else {
    Write-Host "[OK] Dependencies check completed" -ForegroundColor Green
    Write-Host "[完成] 依赖检查完成" -ForegroundColor Green
}

# 安装依赖
if ($needInstall) {
    Write-Host ""
    Write-Host "[INFO] Installing project dependencies..." -ForegroundColor Yellow
    Write-Host "[信息] 正在安装项目依赖，首次安装可能需要几分钟..." -ForegroundColor Yellow
    Write-Host "Please wait, do not close this window" -ForegroundColor Gray
    Write-Host "请耐心等待，不要关闭窗口" -ForegroundColor Gray
    Write-Host ""
    
    # 安装根目录依赖
    Write-Host "[STEP 1/3] Installing root dependencies..." -ForegroundColor Cyan
    Write-Host "[步骤 1/3] 安装根目录依赖..." -ForegroundColor Cyan
    try {
        npm install
        Write-Host "[OK] Root dependencies installed" -ForegroundColor Green
        Write-Host "[完成] 根目录依赖安装完成" -ForegroundColor Green
    }
    catch {
        Write-Host "[ERROR] Root dependencies installation failed!" -ForegroundColor Red
        Write-Host "[错误] 根目录依赖安装失败！" -ForegroundColor Red
        Write-Host ""
        Write-Host "Possible solutions:" -ForegroundColor Yellow
        Write-Host "可能的解决方案：" -ForegroundColor Yellow
        Write-Host "1. Check network connection / 检查网络连接" -ForegroundColor Gray
        Write-Host "2. Use China mirror: npm config set registry https://registry.npmmirror.com/" -ForegroundColor Gray
        Write-Host "   使用国内镜像：npm config set registry https://registry.npmmirror.com/" -ForegroundColor Gray
        Write-Host "3. Run as administrator / 使用管理员权限运行" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Press any key to exit..." -ForegroundColor Gray
        Write-Host "按任意键退出..." -ForegroundColor Gray
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        exit 1
    }
    
    # 安装前端依赖
    Write-Host "[STEP 2/3] Installing frontend dependencies..." -ForegroundColor Cyan
    Write-Host "[步骤 2/3] 安装前端依赖..." -ForegroundColor Cyan
    try {
        Set-Location client
        npm install
        Set-Location ..
        Write-Host "[OK] Frontend dependencies installed" -ForegroundColor Green
        Write-Host "[完成] 前端依赖安装完成" -ForegroundColor Green
    }
    catch {
        Set-Location .. -ErrorAction SilentlyContinue
        Write-Host "[ERROR] Frontend dependencies installation failed!" -ForegroundColor Red
        Write-Host "[错误] 前端依赖安装失败！" -ForegroundColor Red
        Write-Host ""
        Write-Host "Press any key to exit..." -ForegroundColor Gray
        Write-Host "按任意键退出..." -ForegroundColor Gray
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        exit 1
    }
    
    # 安装后端依赖
    Write-Host "[STEP 3/3] Installing backend dependencies..." -ForegroundColor Cyan
    Write-Host "[步骤 3/3] 安装后端依赖..." -ForegroundColor Cyan
    try {
        Set-Location server
        npm install
        Set-Location ..
        Write-Host "[OK] Backend dependencies installed" -ForegroundColor Green
        Write-Host "[完成] 后端依赖安装完成" -ForegroundColor Green
    }
    catch {
        Set-Location .. -ErrorAction SilentlyContinue
        Write-Host "[ERROR] Backend dependencies installation failed!" -ForegroundColor Red
        Write-Host "[错误] 后端依赖安装失败！" -ForegroundColor Red
        Write-Host ""
        Write-Host "Press any key to exit..." -ForegroundColor Gray
        Write-Host "按任意键退出..." -ForegroundColor Gray
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        exit 1
    }
    
    Write-Host ""
    Write-Host "[OK] Dependencies installation completed!" -ForegroundColor Green
    Write-Host "[完成] 依赖安装完成！" -ForegroundColor Green
}

# 清理之前的服务
Write-Host ""
Write-Host "[INFO] Cleaning previous services..." -ForegroundColor Yellow
Write-Host "[信息] 正在清理之前的服务..." -ForegroundColor Yellow

try {
    Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-Host "[OK] Previous Node.js services stopped" -ForegroundColor Green
    Write-Host "[完成] 已停止之前运行的Node.js服务" -ForegroundColor Green
}
catch {
    Write-Host "[INFO] No running Node.js services found" -ForegroundColor Gray
    Write-Host "[信息] 没有发现运行中的Node.js服务" -ForegroundColor Gray
}

# 启动应用
Write-Host ""
Write-Host "[INFO] Starting application services..." -ForegroundColor Yellow
Write-Host "[信息] 正在启动应用服务..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Startup completion indicators:" -ForegroundColor Cyan
Write-Host "启动完成标志：" -ForegroundColor Cyan
Write-Host '  Frontend: "Local: http://localhost:5173"' -ForegroundColor Gray
Write-Host '  前端服务："Local: http://localhost:5173"' -ForegroundColor Gray
Write-Host '  Backend: "Server running on port 3000"' -ForegroundColor Gray  
Write-Host '  后端服务："服务器运行在端口 3000"' -ForegroundColor Gray
Write-Host ""
Write-Host "[INFO] Starting, please wait..." -ForegroundColor Yellow
Write-Host "[信息] 启动中，请稍候..." -ForegroundColor Yellow

Start-Sleep -Seconds 2

try {
    npm run dev
}
catch {
    Write-Host ""
    Write-Host "[ERROR] Application startup failed!" -ForegroundColor Red
    Write-Host "[错误] 应用启动失败！" -ForegroundColor Red
    Write-Host ""
    Write-Host "Possible reasons:" -ForegroundColor Yellow
    Write-Host "可能的原因：" -ForegroundColor Yellow
    Write-Host "1. Port occupied / 端口被占用" -ForegroundColor Gray
    Write-Host "2. Incomplete dependencies / 依赖安装不完整" -ForegroundColor Gray
    Write-Host "3. Permission issues / 系统权限问题" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Press any key to exit..." -ForegroundColor Gray
    Write-Host "按任意键退出..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

Write-Host ""
Write-Host "[SUCCESS] Application started successfully!" -ForegroundColor Green
Write-Host "[成功] 应用启动完成！" -ForegroundColor Green
Write-Host ""
Write-Host "Access URLs:" -ForegroundColor Cyan
Write-Host "访问地址：" -ForegroundColor Cyan
Write-Host "  Frontend: http://localhost:5173" -ForegroundColor Green
Write-Host "  前端界面：http://localhost:5173" -ForegroundColor Green
Write-Host "  Backend API: http://localhost:3000" -ForegroundColor Green
Write-Host "  后端API：http://localhost:3000" -ForegroundColor Green
Write-Host ""
Write-Host "Usage Instructions:" -ForegroundColor Cyan
Write-Host "使用说明：" -ForegroundColor Cyan
Write-Host "  1. Drag and drop Simple backup JSON file" -ForegroundColor Gray
Write-Host "     拖拽上传Simple备份JSON文件" -ForegroundColor Gray
Write-Host "  2. Preview data and statistics" -ForegroundColor Gray
Write-Host "     预览数据和统计信息" -ForegroundColor Gray
Write-Host "  3. Configure document title and author" -ForegroundColor Gray
Write-Host "     配置文档标题和作者" -ForegroundColor Gray
Write-Host "  4. Select HTML or PDF format" -ForegroundColor Gray
Write-Host "     选择HTML或PDF格式生成" -ForegroundColor Gray
Write-Host "  5. Download generated document" -ForegroundColor Gray
Write-Host "     下载生成的可视化文档" -ForegroundColor Gray
Write-Host ""
Write-Host "Press Ctrl+C to stop services" -ForegroundColor Yellow
Write-Host "按Ctrl+C停止服务" -ForegroundColor Yellow
Write-Host ""

# 等待用户输入
Write-Host "Press any key to exit..." -ForegroundColor Gray
Write-Host "按任意键退出..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") 