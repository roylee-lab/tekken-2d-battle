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
