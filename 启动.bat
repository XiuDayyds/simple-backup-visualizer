@echo off
chcp 65001 >nul 2>&1

echo.
echo ================================================
echo   Simple Backup Visualizer Launcher
echo ================================================
echo.

REM Check Node.js installation
where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js not found!
    echo Please install Node.js first: https://nodejs.org/
    echo Recommended version: 18+ or 20+
    echo.
    pause
    exit /b 1
)

REM Show Node.js version
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [INFO] Node.js version detected: %NODE_VERSION%

REM Check dependencies
echo.
echo [INFO] Checking project dependencies...

if not exist "node_modules" (
    echo [WARN] First run detected, installing dependencies...
    goto INSTALL_DEPS
)

if not exist "client\node_modules" (
    echo [WARN] Frontend dependencies missing
    goto INSTALL_DEPS
)

if not exist "server\node_modules" (
    echo [WARN] Backend dependencies missing  
    goto INSTALL_DEPS
)

echo [OK] Dependencies check completed
goto START_APP

:INSTALL_DEPS
echo.
echo [INFO] Installing project dependencies...
echo Please wait, this may take a few minutes...
echo.

echo [STEP 1/3] Installing root dependencies...
call npm install
if errorlevel 1 (
    echo.
    echo [ERROR] Root dependencies installation failed!
    echo Possible solutions:
    echo 1. Check network connection
    echo 2. Use China mirror: npm config set registry https://registry.npmmirror.com/
    echo 3. Run as administrator
    echo.
    pause
    exit /b 1
)

echo [STEP 2/3] Installing frontend dependencies...
cd client
call npm install
if errorlevel 1 (
    echo.
    echo [ERROR] Frontend dependencies installation failed!
    cd ..
    pause
    exit /b 1
)
cd ..

echo [STEP 3/3] Installing backend dependencies...
cd server
call npm install
if errorlevel 1 (
    echo.
    echo [ERROR] Backend dependencies installation failed!
    cd ..
    pause
    exit /b 1
)
cd ..

echo.
echo [OK] Dependencies installation completed!

:START_APP
echo.
echo [INFO] Cleaning previous services...
taskkill /f /im node.exe >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Previous Node.js services stopped
) else (
    echo [INFO] No running Node.js services found
)

echo.
echo [INFO] Starting application services...
echo.
echo Startup completion indicators:
echo   Frontend: "Local: http://localhost:5173"
echo   Backend: "Server running on port 3000"
echo.
echo [INFO] Starting, please wait...

timeout /t 2 /nobreak >nul

call npm run dev
if errorlevel 1 (
    echo.
    echo [ERROR] Application startup failed!
    echo.
    echo Possible reasons:
    echo 1. Port occupied
    echo 2. Incomplete dependencies
    echo 3. Permission issues
    echo.
    pause
    exit /b 1
)

echo.
echo [SUCCESS] Application started successfully!
echo.
echo Access URLs:
echo   Frontend: http://localhost:5173
echo   Backend API: http://localhost:3000
echo.
echo Usage Instructions:
echo   1. Drag and drop Simple backup JSON file
echo   2. Preview data and statistics
echo   3. Configure document title and author
echo   4. Select HTML or PDF format
echo   5. Download generated document
echo.
echo Press Ctrl+C to stop services
echo.
pause 