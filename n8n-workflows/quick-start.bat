@echo off
REM Elaric AI - n8n Quick Start Script (Windows)
REM This script automates the n8n setup process

echo ========================================
echo   Elaric AI - n8n Quick Start Setup
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed
    echo Please install Node.js 18+ from https://nodejs.org
    pause
    exit /b 1
)

echo [OK] Node.js found:
node --version
echo.

REM Check if npm is installed
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm is not installed
    pause
    exit /b 1
)

echo [OK] npm found:
npm --version
echo.

REM Install n8n globally
echo Installing n8n...
where n8n >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    npm install n8n -g
    echo [OK] n8n installed successfully
) else (
    echo [WARNING] n8n already installed
)
echo.

REM Check if .env file exists
if not exist ".env" (
    echo [WARNING] .env file not found. Creating from template...
    (
        echo # n8n Configuration
        echo N8N_WEBHOOK_URL=http://localhost:5678/webhook/generate-mockup
        echo N8N_HOST=localhost
        echo N8N_PORT=5678
        echo.
        echo # Gemini AI ^(Get your key from: https://makersuite.google.com/app/apikey^)
        echo GEMINI_API_KEY=your-gemini-api-key-here
        echo.
        echo # Supabase ^(Get from: Supabase Dashboard ^> Settings ^> API^)
        echo VITE_SUPABASE_URL=https://your-project.supabase.co
        echo VITE_SUPABASE_ANON_KEY=your-anon-key-here
        echo SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
        echo.
        echo # Environment
        echo NODE_ENV=development
    ) > .env
    echo [OK] Created .env file
    echo [WARNING] Please edit .env file with your actual API keys
    echo.
)

REM Check if workflow file exists
if not exist "n8n-workflows\elaric-ai-mockup-generator.json" (
    echo [ERROR] Workflow file not found at: n8n-workflows\elaric-ai-mockup-generator.json
    pause
    exit /b 1
)

echo [OK] Workflow file found
echo.

REM Load environment variables from .env
if exist ".env" (
    for /f "usebackq tokens=1,2 delims==" %%a in (".env") do (
        if not "%%a"=="" if not "%%a:~0,1%"=="#" set %%a=%%b
    )
    echo [OK] Environment variables loaded
)

echo.
echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo Next Steps:
echo.
echo 1. Edit .env file with your API keys:
echo    - GEMINI_API_KEY ^(from https://makersuite.google.com/app/apikey^)
echo    - VITE_SUPABASE_URL ^(from Supabase Dashboard^)
echo    - SUPABASE_SERVICE_ROLE_KEY ^(from Supabase Dashboard^)
echo.
echo 2. Start n8n:
echo    n8n
echo.
echo 3. Open n8n editor:
echo    http://localhost:5678
echo.
echo 4. Import workflow:
echo    - Click 'Workflows' ^> 'Add Workflow' ^> 'Import from File'
echo    - Select: n8n-workflows\elaric-ai-mockup-generator.json
echo.
echo 5. Activate workflow:
echo    - Toggle switch in top right to 'Active'
echo.
echo 6. Test webhook:
echo    curl -X POST http://localhost:5678/webhook/generate-mockup ^
echo         -H "Content-Type: application/json" ^
echo         -d "{\"prompt\": \"Create a food delivery home screen\"}"
echo.
echo 7. Start Remix app ^(in another terminal^):
echo    npm run dev
echo.
echo Full documentation: N8N_SETUP_GUIDE.md
echo.
echo Need help? Check troubleshooting section in the guide.
echo.

REM Ask if user wants to start n8n now
set /p START_N8N="Start n8n now? (y/n): "
if /i "%START_N8N%"=="y" (
    echo.
    echo Starting n8n...
    echo Press Ctrl+C to stop
    echo.
    n8n
)

pause
