@echo off
echo ===================================================
echo    Launching Envision'26 TechFest Platform (Full)
echo ===================================================

start "Envision Backend (FastAPI)" cmd /k "%~dp0start_backend.bat"
start "Envision Frontend (Vite/React)" cmd /k "%~dp0start_frontend.bat"

echo.
echo [✓] Backend launched on: http://127.0.0.1:8000
echo [✓] Frontend launched on: http://localhost:5173
echo.
