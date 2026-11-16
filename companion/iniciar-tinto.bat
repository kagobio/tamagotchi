@echo off
rem Abre el programa de Tinto. Doble clic para arrancarlo; cierra la ventana para pararlo.
cd /d "%~dp0.."
node companion\index.mjs
pause
