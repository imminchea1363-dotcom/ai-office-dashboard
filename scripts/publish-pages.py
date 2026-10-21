"""Build and push the static GitHub Pages branch. Run only when publication is authorized."""
from pathlib import Path
import os
import subprocess
import tempfile

root = Path(__file__).resolve().parents[1]
def git(*args, **kwargs):
    return subprocess.check_output(['git', '-C', str(root), *args], text=True, **kwargs).strip()

subprocess.run(['python3', str(root / 'scripts/build-pwa.py')], check=True)
site = root / 'dist/dongbaek-pwa'
(site / '.nojekyll').write_text('', encoding='utf-8')
remote = git('ls-remote', '--refs', 'origin', 'refs/heads/gh-pages')
parent = remote.split()[0] if remote else None
if parent:
    subprocess.run(['git', '-C', str(root), 'fetch', 'origin', 'gh-pages'], check=True)
# Use a temporary Git index rather than replacing the working tree or changing branches.
with tempfile.TemporaryDirectory(prefix='dongbaek-pages-') as temporary:
    environment = dict(os.environ)
    environment['GIT_INDEX_FILE'] = str(Path(temporary) / 'index')
    subprocess.run(['git', '-C', str(root), 'read-tree', '--empty'], env=environment, check=True)
    for file in sorted(p for p in site.rglob('*') if p.is_file()):
        relative = file.relative_to(site).as_posix()
        blob = git('hash-object', '-w', str(file))
        subprocess.run(['git', '-C', str(root), 'update-index', '--add', '--cacheinfo', '100644', blob, relative], env=environment, check=True)
    tree = git('write-tree', env=environment)
    args = ['commit-tree', tree]
    if parent:
        args.extend(['-p', parent])
    deployment = git(*args, input='Publish installable Dongbaek pixel office\n')
# Fast-forward only. Existing remote history is never overwritten.
subprocess.run(['git', '-C', str(root), 'push', '--atomic', 'origin', 'HEAD:refs/heads/main', deployment + ':refs/heads/gh-pages'], check=True)
print('Source pushed to main; static application pushed to gh-pages.')
print('Enable GitHub Pages: Settings > Pages > Deploy from a branch > gh-pages > /(root).')
print('Publication is complete only after GitHub Pages reports success and the HTTPS site is checked.')
