@echo off
title Smart E-Fining System - Docker Launcher
echo ===================================================
echo     Smart E-Fining System - Starting Docker
echo ===================================================
echo.

where docker >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not installed or not in PATH!
    echo Please install Docker Desktop from: https://www.docker.com/products/docker-desktop/
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
