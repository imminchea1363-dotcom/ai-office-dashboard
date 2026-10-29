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
asset_names=['assets/lobby-background.png','assets/gym-background.png','assets/characters-standing.png','assets/characters-working.png','assets/characters-gym.png','assets/characters-cleaner.png','assets/characters-coffee.png']
import json
asset_map={name:'data:image/png;base64,'+base64.b64encode((root/name).read_bytes()).decode('ascii') for name in asset_names}
html=html.replace('<script src="characters.js"></script>', '<script>window.DongbaekAssets='+json.dumps(asset_map)+';\n'+(root/'characters.js').read_text(encoding='utf-8')+'\n</script>')
background = base64.b64encode((root / 'assets/office-background.png').read_bytes()).decode('ascii')
art = base64.b64encode((root / 'assets/office-pixel.png').read_bytes()).decode('ascii')
html = html.replace('<script src="pixel-mode.js"></script>', '<script>window.DongbaekBackground="data:image/png;base64,' + background + '";window.DongbaekArtwork="data:image/png;base64,' + art + '";\n' + (root / 'pixel-mode.js').read_text(encoding='utf-8') + '\n</script>')
for name in ['characters.js','v3.js', 'radio.js','gym-music.js', 'pwa.js','docx-export.js','ai-desk.js', 'gpt-desk.js']:
    html = html.replace('<script src="' + name + '"></script>', '<script>\n' + (root / name).read_text(encoding='utf-8') + '\n</script>')
output.write_text(html, encoding='utf-8')
print(output)
