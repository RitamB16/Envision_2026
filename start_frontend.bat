@echo off
echo =========================================
echo    Starting Frontend Server on Windows
echo =========================================
cd /d "%~dp0frontend"

if not exist "node_modules" (
    echo [!] node_modules not found. Installing npm packages...
    call npm install
)

echo [*] Starting Vite React Development Server...
call npm run dev
pause
