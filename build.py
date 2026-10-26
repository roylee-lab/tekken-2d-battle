# 사용법: python build.py  →  src/*.js + shell.html + vendor/peerjs.min.js 를 합쳐 index.html 생성
import glob, os, sys
root = os.path.dirname(os.path.abspath(__file__))
shell = open(os.path.join(root, 'shell.html'), encoding='utf-8').read()
peer = open(os.path.join(root, 'vendor', 'peerjs.min.js'), encoding='utf-8').read()
parts = []
for f in sorted(glob.glob(os.path.join(root, 'src', '*.js'))):
    parts.append('// ---- ' + os.path.basename(f) + ' ----\n' + open(f, encoding='utf-8').read())
game = '\n'.join(parts)
assert '</script' not in game and '</script' not in peer
out = shell.replace('/*PEERJS*/', peer).replace('/*GAME*/', game)
dst = sys.argv[1] if len(sys.argv) > 1 else os.path.join(root, 'index.html')
open(dst, 'w', encoding='utf-8').write(out)
print('built', dst, len(out), 'bytes')

# ---- 오픈소스 다운로드 파일 (게시판의 '코드 다운로드'·'가이드 다운로드' 버튼) ----
# 배포본(index.html)을 만들 때만 같이 만듦 (다른 경로로 빌드할 때는 건너뜀)
if len(sys.argv) <= 1:
    import zipfile
    dl = os.path.join(root, 'download')
    os.makedirs(dl, exist_ok=True)
    SKIP_DIRS = {'.git', 'node_modules', 'download', '.vercel', '__pycache__'}
    SKIP_FILES = {'last_balance.json', 'ov_final.json', 'ov_tune.json', 'tune_state.json', '.DS_Store'}
    files = []
    for d, dirs, fs in os.walk(root):
        dirs[:] = sorted(x for x in dirs if x not in SKIP_DIRS)
        for f in sorted(fs):
            if f in SKIP_FILES:
                continue
            files.append(os.path.join(d, f))
    zpath = os.path.join(dl, 'tekken-2d-battle-source.zip')
    with zipfile.ZipFile(zpath, 'w', zipfile.ZIP_DEFLATED) as z:
        for p in files:
            rel = os.path.relpath(p, root).replace(os.sep, '/')
            info = zipfile.ZipInfo('tekken-2d-battle/' + rel, date_time=(2026, 1, 1, 0, 0, 0))   # 시각 고정 → 내용이 같으면 같은 파일
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            with open(p, 'rb') as fh:
                z.writestr(info, fh.read())
    with open(os.path.join(root, 'docs', 'GUIDE.md'), 'rb') as fh:
        guide = fh.read()
    with open(os.path.join(dl, 'GUIDE.md'), 'wb') as fh:
        fh.write(guide)
    print('download/', len(files), 'files,', os.path.getsize(zpath), 'bytes zip')
