@echo off
rem Dwuklik = wgraj firmware lampki (led_matrix_ble). Argumenty jak w flash.ps1, np. flash.cmd led_test_256
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0flash.ps1" %*
if errorlevel 1 pause
