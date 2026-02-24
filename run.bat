@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo [1/4] Checking venv...
if not exist "venv\Scripts\activate.bat" (
    echo Creating venv...
    python -m venv venv
    if errorlevel 1 (
        echo ERROR: Could not create venv. Is Python installed?
        pause
        exit /b 1
    )
)

echo [2/4] Activating venv...
call venv\Scripts\activate.bat

echo [3/4] Checking packages...
if not exist "venv\Lib\site-packages\flask" (
    echo Installing packages...
    "venv\Scripts\python.exe" -m pip install -r requirements.txt
    if errorlevel 1 (
        echo ERROR: pip install failed.
        pause
        exit /b 1
    )
)
echo Updating Gemini package...
"venv\Scripts\python.exe" -m pip install --upgrade google-genai >nul 2>&1

echo [4/4] Starting server...
echo.
echo  => Open browser: http://127.0.0.1:5000
echo  => To stop: close this window or press Ctrl+C
echo.
"venv\Scripts\python.exe" app.py

if errorlevel 1 (
    echo.
    echo Server exited with an error. See message above.
)
echo.
pause
