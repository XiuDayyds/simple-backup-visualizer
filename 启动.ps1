# Simple备份文件可视化工具启动脚本
# Simple Backup Visualizer Launcher

<<<<<<< HEAD
# 设置PowerShell控制台以正确显示中文字符
# Set PowerShell console to display Chinese characters correctly
$PSDefaultParameterValues['Out-File:Encoding'] = 'utf8'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8

# 当发生错误时停止执行
# Stop execution on error
$ErrorActionPreference = "Stop"

# 函数：打印带颜色的标题
# Function: Print colored title
function Print-Title {
    param(
        [string]$Message,
        [string]$Color = "Cyan"
    )
    Write-Host "================================================" -ForegroundColor $Color
    Write-Host $Message -ForegroundColor "Green"
    Write-Host "================================================" -ForegroundColor $Color
    Write-Host ""
}

# 函数：打印信息
# Function: Print information
function Print-Info {
    param(
        [string]$Message,
        [string]$ChineseMessage
    )
    Write-Host "[INFO] $Message" -ForegroundColor Yellow
    Write-Host "[信息] $ChineseMessage" -ForegroundColor Yellow
}

# 函数：打印成功信息
# Function: Print success message
function Print-Success {
    param(
        [string]$Message,
        [string]$ChineseMessage
    )
    Write-Host "[OK] $Message" -ForegroundColor Green
    Write-Host "[完成] $ChineseMessage" -ForegroundColor Green
}

# 函数：打印错误并退出
# Function: Print error and exit
function Print-ErrorAndExit {
    param(
        [string]$Message,
        [string]$ChineseMessage,
        [string[]]$Solutions
    )
    Write-Host "[ERROR] $Message" -ForegroundColor Red
    Write-Host "[错误] $ChineseMessage" -ForegroundColor Red
    if ($Solutions) {
        Write-Host ""
        Write-Host "Possible solutions / 可能的解决方案:" -ForegroundColor Yellow
        foreach ($solution in $Solutions) {
            Write-Host "- $solution" -ForegroundColor Gray
        }
    }
=======
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
>>>>>>> aea728735c9d33f737f3bbe34ed9cf7e4cd4ac68
    Write-Host ""
    Write-Host "Press any key to exit..." -ForegroundColor Gray
    Write-Host "按任意键退出..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

<<<<<<< HEAD
# 函数：检查并安装依赖
# Function: Check and install dependencies
function Install-Dependencies {
    param(
        [string]$Path,
        [string]$Name,
        [string]$Step
    )
    Print-Info "Installing $Name dependencies..." "$Step 安装 $Name 依赖..."
    try {
        if ($Path) {
            Set-Location $Path
        }
        npm install
        if ($Path) {
            Set-Location ..
        }
        Print-Success "$Name dependencies installed" "$Name 依赖安装完成"
    }
    catch {
        if ($Path) {
            Set-Location .. -ErrorAction SilentlyContinue
        }
        $solutions = @(
            "Check network connection / 检查网络连接",
            "Use China mirror: npm config set registry https://registry.npmmirror.com/",
            "Run as administrator / 使用管理员权限运行"
        )
        Print-ErrorAndExit "$Name dependencies installation failed!" "$Name 依赖安装失败！" $solutions
    }
}

# --- 脚本主流程 ---
# --- Main Script Flow ---

Print-Title "   Simple Backup Visualizer Launcher`n   Simple备份文件可视化工具启动器"

# 1. 检查Node.js
Print-Info "Checking Node.js installation..." "检查Node.js安装..."
try {
    $nodeVersion = node --version
    Print-Success "Node.js version detected: $nodeVersion" "检测到Node.js版本：$nodeVersion"
}
catch {
    $solutions = @(
        "Please install Node.js from: https://nodejs.org/",
        "Recommended version: 18+ or 20+"
    )
    Print-ErrorAndExit "Node.js not found!" "未检测到Node.js！" $solutions
}

# 2. 检查并安装依赖
$needInstallRoot = -not (Test-Path "node_modules")
$needInstallClient = -not (Test-Path "client/node_modules")
$needInstallServer = -not (Test-Path "server/node_modules")

if ($needInstallRoot -or $needInstallClient -or $needInstallServer) {
    Write-Host ""
    Print-Info "Installing project dependencies, this may take a few minutes..." "正在安装项目依赖，首次安装可能需要几分钟..."
=======
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
>>>>>>> aea728735c9d33f737f3bbe34ed9cf7e4cd4ac68
    Write-Host "Please wait, do not close this window" -ForegroundColor Gray
    Write-Host "请耐心等待，不要关闭窗口" -ForegroundColor Gray
    Write-Host ""
    
<<<<<<< HEAD
    if ($needInstallRoot)   { Install-Dependencies -Path "" -Name "Root" -Step "[1/3]" }
    if ($needInstallClient) { Install-Dependencies -Path "client" -Name "Frontend" -Step "[2/3]" }
    if ($needInstallServer) { Install-Dependencies -Path "server" -Name "Backend" -Step "[3/3]" }
    
    Write-Host ""
    Print-Success "All dependencies installed successfully!" "所有依赖安装完成！"
} else {
    Print-Success "Dependencies are already installed." "依赖已是最新状态。"
}

# 3. 清理旧进程
Write-Host ""
Print-Info "Cleaning up previous Node.js processes..." "正在清理旧的Node.js进程..."
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Print-Success "Cleanup complete." "清理完成。"

# 4. 启动应用
Write-Host ""
Print-Info "Starting application..." "正在启动应用..."
Write-Host ""
Write-Host "The application will start in a new window." -ForegroundColor Cyan
Write-Host "应用将在一个新窗口中启动。" -ForegroundColor Cyan
Write-Host "You can close this script window after the new window appears." -ForegroundColor Gray
Write-Host "当新窗口出现后，您可以关闭当前脚本窗口。" -ForegroundColor Gray
Write-Host ""

$scriptContent = "
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8;
Write-Host 'Starting services... (Please wait)' -ForegroundColor Yellow;
Write-Host '按 Ctrl+C 停止服务';
npm run dev;
"

try {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $scriptContent
    Print-Success "Application is starting in a new window." "应用正在新窗口中启动。"
}
catch {
    $solutions = @(
        "Check for port conflicts (e.g., 3000, 5173) / 检查端口冲突 (如 3000, 5173)",
        "Try running this script as an administrator / 尝试以管理员身份运行此脚本"
    )
    Print-ErrorAndExit "Failed to start application!" "启动应用失败！" $solutions
}

Write-Host ""
Write-Host "Access URLs / 访问地址:" -ForegroundColor Cyan
Write-Host "  - Frontend / 前端: http://localhost:5173" -ForegroundColor Green
Write-Host "  - Backend / 后端:  http://localhost:3000" -ForegroundColor Green
Write-Host ""
Write-Host "This window can be closed now." -ForegroundColor Gray
Write-Host "此窗口现在可以关闭。" -ForegroundColor Gray
Write-Host ""

# 脚本结束 
=======
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
>>>>>>> aea728735c9d33f737f3bbe34ed9cf7e4cd4ac68
