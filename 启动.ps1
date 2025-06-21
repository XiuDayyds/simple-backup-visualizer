# Simple备份文件可视化工具启动脚本
# Simple Backup Visualizer Launcher

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
    Write-Host ""
    Write-Host "Press any key to exit..." -ForegroundColor Gray
    Write-Host "按任意键退出..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

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
    Write-Host "Please wait, do not close this window" -ForegroundColor Gray
    Write-Host "请耐心等待，不要关闭窗口" -ForegroundColor Gray
    Write-Host ""
    
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