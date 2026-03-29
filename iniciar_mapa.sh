#!/bin/bash
echo "Iniciando mapa..."
python3 -m http.server 8080 &
sleep 1
open http://localhost:8080 2>/dev/null || xdg-open http://localhost:8080 2>/dev/null
echo "Mapa abierto en http://localhost:8080"
echo "Presiona Ctrl+C para detener el servidor"
wait
