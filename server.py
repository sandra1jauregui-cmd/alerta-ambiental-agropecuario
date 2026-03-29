#!/usr/bin/env python3
"""Servidor HTTP con compresión gzip para archivos GeoJSON."""
import http.server
import os
import gzip as gzip_module

PORT = 5000

class GzipHandler(http.server.SimpleHTTPRequestHandler):
    """Sirve archivos .gz pre-comprimidos cuando existen."""
    
    def do_GET(self):
        # Para GeoJSON: buscar versión .gz pre-comprimida
        if self.path.endswith('.geojson') and '?' not in self.path:
            import urllib.parse
            clean_path = urllib.parse.unquote(self.path.split('?')[0])
            local_path = os.path.join(os.getcwd(), clean_path.lstrip('/'))
            gz_path = local_path + '.gz'
            
            if os.path.isfile(gz_path):
                self._serve_gz(gz_path)
                return
        
        super().do_GET()
    
    def _serve_gz(self, gz_path):
        try:
            with open(gz_path, 'rb') as f:
                data = f.read()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Encoding', 'gzip')
            self.send_header('Content-Length', str(len(data)))
            self.send_header('Cache-Control', 'public, max-age=3600')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(data)
        except Exception as e:
            self.send_error(500, str(e))
    
    def log_message(self, fmt, *args):
        pass  # silenciar logs

if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    with http.server.HTTPServer(('', PORT), GzipHandler) as httpd:
        print(f'Servidor en puerto {PORT}')
        httpd.serve_forever()
