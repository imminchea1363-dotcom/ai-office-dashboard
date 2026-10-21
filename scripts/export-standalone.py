from pathlib import Path
import base64
import re
import sys
root = Path(__file__).resolve().parents[1]
output = Path(sys.argv[1]) if len(sys.argv) > 1 else root / 'dist' / '주식회사동백-v3.html'
output.parent.mkdir(parents=True, exist_ok=True)
html = (root / 'index.html').read_text(encoding='utf-8')
# Local HTML runs the app but cannot be installed as a PWA.
html = re.sub(r'<link[^>]+(?:manifest|icon)[^>]*>\n?', '', html)
art = base64.b64encode((root / 'assets/office-pixel.png').read_bytes()).decode('ascii')
html = html.replace('<script src="pixel-mode.js"></script>', '<script>window.DongbaekArtwork="data:image/png;base64,' + art + '";\n' + (root / 'pixel-mode.js').read_text(encoding='utf-8') + '\n</script>')
for name in ['v3.js', 'pwa.js']:
    html = html.replace('<script src="' + name + '"></script>', '<script>\n' + (root / name).read_text(encoding='utf-8') + '\n</script>')
output.write_text(html, encoding='utf-8')
print(output)
