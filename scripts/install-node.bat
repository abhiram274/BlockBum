@echo off
title BlockBum Full Node Setup & Launcher
echo ==========================================================
echo   BlockBum Full Node Automated Setup Script (Windows)
echo ==========================================================

set "ROOT_DIR=%~dp0.."
cd /d "%ROOT_DIR%"

if not exist "data\devnet" (
    echo [1/3] Creating data directories...
    mkdir data\devnet 2>nul
)

if not exist "build\src\node\Release\blockbum_node.exe" (
    if not exist "build\src\node\blockbum_node.exe" (
        echo [2/3] Compiling BlockBum Core Daemon...
        cmake -B build -DCMAKE_BUILD_TYPE=Release -DBLOCKBUM_BUILD_NODE=ON -DBLOCKBUM_BUILD_TESTS=OFF
        cmake --build build --config Release --parallel
    )
)

set "NODE_EXE="
if exist "build\src\node\Release\blockbum_node.exe" set "NODE_EXE=build\src\node\Release\blockbum_node.exe"
if exist "build\src\node\blockbum_node.exe" set "NODE_EXE=build\src\node\blockbum_node.exe"

if "%NODE_EXE%"=="" (
    echo [ERROR] blockbum_node.exe not found! Please build the solution first.
    pause
    exit /b 1
)

echo [3/3] Initializing Genesis block...
"%NODE_EXE%" init

echo.
echo ==========================================================
echo Starting BlockBum Full Node on Dual-Stack Port 9000...
echo ==========================================================
"%NODE_EXE%" run-node --port 9000
