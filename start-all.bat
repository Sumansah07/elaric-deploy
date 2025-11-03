@echo off
REM Startup Script for Elaric AI Context-Aware System
REM Starts both n8n and Remix dev server

echo ========================================
echo   Elaric AI - Context-Aware System
echo ========================================
echo.
echo Starting both services...
echo.

REM Check if n8n is installed
where n8n >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] n8n is not installed
    echo Please run: npm install n8n -g
    pause
    exit /b 1
)

echo [INFO] n8n is installed
echo.

REM Start n8n in a new window
echo [1/2] Starting n8n workflow engine...
start "n8n - Workflow Engine" cmd /k "echo Starting n8n... && n8n"
timeout /t 3 /nobreak >nul

echo [OK] n8n started in new window
echo      URL: http://localhost:5678
echo.

REM Wait for n8n to be ready
echo [INFO] Waiting for n8n to be ready (15 seconds)...
timeout /t 15 /nobreak >nul

echo [2/2] Starting Remix development server...
start "Remix Dev Server" cmd /k "echo Starting Remix... && npm run dev"
timeout /t 3 /nobreak >nul

echo [OK] Remix started in new window
echo      URL: http://localhost:3000
echo.

echo ========================================
echo   Both Services Started!
echo ========================================
echo.
echo n8n Workflow Engine: http://localhost:5678
echo Elaric AI App:        http://localhost:3000
echo.
echo IMPORTANT:
echo - Keep both windows open
echo - Do NOT close them
echo - n8n workflow must be ACTIVE (green toggle)
echo - Check .env file has correct settings
echo.
echo To test the system:
echo   1. Open http://localhost:3000
echo   2. Enter a design prompt
echo   3. Wait 20-30 seconds
echo   4. See context-aware generation!
echo.
echo To stop:
echo   - Close both terminal windows
echo   - Or press Ctrl+C in each window
echo.
echo Logs will appear in the respective windows.
echo.
pause
