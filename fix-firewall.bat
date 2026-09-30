@echo off
:: This script requires Administrator privileges
:: Right-click → "Run as administrator" if double-click doesn't work

net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Requesting administrator privileges...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo ===================================================
echo   Smart E-Fining — Firewall Fix for ESP32
echo ===================================================
echo.

:: Remove old rule if exists (ignore errors)
netsh advfirewall firewall delete rule name="Smart E-Fining Docker Backend" >nul 2>&1

:: Add inbound rule for port 5000
netsh advfirewall firewall add rule name="Smart E-Fining Docker Backend" dir=in action=allow protocol=TCP localport=5000
echo.

if %errorlevel% equ 0 (
    echo [SUCCESS] Port 5000 is now open for ESP32 connections!
) else (
    echo [ERROR] Failed to add firewall rule.
)

echo.
echo Now upload the Arduino code to your ESP32 and it will
echo connect to: http://192.168.0.111:5000/api/telemetry
echo.
pause
