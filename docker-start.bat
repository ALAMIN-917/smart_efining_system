@echo off
title Smart E-Fining System - Docker Launcher
echo ===================================================
echo     Smart E-Fining System - Starting Docker
echo ===================================================
echo.

:: Add Docker to PATH if it's in the User AppData folder
if exist "%LOCALAPPDATA%\Programs\DockerDesktop\resources\bin\docker.exe" (
    set "PATH=%LOCALAPPDATA%\Programs\DockerDesktop\resources\bin;%PATH%"
)
if exist "C:\Program Files\Docker\Docker\resources\bin\docker.exe" (
    set "PATH=C:\Program Files\Docker\Docker\resources\bin;%PATH%"
)

where docker >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not installed or not in PATH!
    echo Please install Docker Desktop from: https://www.docker.com/products/docker-desktop/
    echo.
    pause
    exit /b 1
)

:: Check if Docker engine is running
docker info >nul 2>nul
if %errorlevel% neq 0 (
    echo [NOTICE] Docker is installed, but Docker Desktop is NOT running!
    echo.
    echo Please open "Docker Desktop" from your Windows Start Menu,
    echo wait until it shows "Engine running" (green icon),
    echo and then run this script again!
    echo.
    pause
    exit /b 1
)

echo [1/3] Building and starting containers (MongoDB, Backend, Frontend)...
docker compose up -d --build

echo.
echo ===================================================
echo   SYSTEM IS READY!
echo ===================================================
echo   - Frontend Web Dashboard: http://localhost:5173
echo   - Live Vehicle Monitoring: http://localhost:5173/live
echo   - Backend API Health:     http://localhost:5000/api/health
echo   - Admin Panel:            http://localhost:5173/admin/login
echo       Username: superadmin
echo       Password: ChangeMe123!
echo ===================================================
echo.
echo Press any key to stop all containers when finished...
pause >nul

echo Stopping containers...
docker compose down
echo Done!
pause
