@echo off
echo =========================================
echo    Starting Backend Server on Windows
echo =========================================
cd /d "%~dp0backend"

if not exist "venv\Scripts\activate.bat" (
    echo [!] Virtual environment not found. Creating python venv...
    python -m venv venv
    call venv\Scripts\activate.bat
    echo [*] Installing requirements...
    pip install -r requirements.txt
) else (
    call venv\Scripts\activate.bat
)

echo [*] Launching Uvicorn FastAPI server on http://127.0.0.1:8000
uvicorn main:app --reload --host 127.0.0.1 --port 8000
pause
