"""Build and verify an assessor archive from an explicit project allowlist.

Run: python3 scripts/build_submission.py
Works from a checkout or extracted archive. No environment files, databases,
virtual environments, caches, previous archives or Git metadata are included.
"""
from hashlib import sha256
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[1]
FOLDERS = ('cafe', 'craving_house', 'templates', 'static', 'images', 'docs', 'scripts', '.github', '.githooks')
ROOT_FILES = ('.dockerignore', '.editorconfig', '.gitignore', 'Dockerfile', 'Procfile',
              'README.md', 'manage.py', 'render-build.sh', 'render-start.sh', 'render.yaml', 'requirements.txt')
SKIP_PARTS = {'.git', '.venv', 'venv', '__pycache__', 'node_modules', '.DS_Store', 'staticfiles', 'dist'}


def permitted(path):
    relative = path.relative_to(ROOT)
    return (path.is_file() and not path.is_symlink()
            and not any(part in SKIP_PARTS or part.startswith('.env') for part in relative.parts)
            and path.suffix.lower() not in {'.pyc', '.pyo', '.sqlite', '.sqlite3', '.db', '.log', '.pem', '.key', '.zip'})


def build():
    files = [ROOT / name for name in ROOT_FILES]
    for folder in FOLDERS:
        files.extend((ROOT / folder).rglob('*'))
    files = sorted({path for path in files if permitted(path)})
    manifest = ''.join(f'{sha256(path.read_bytes()).hexdigest()}  {path.relative_to(ROOT).as_posix()}\n' for path in files)
    output = ROOT / 'dist' / 'craving-house-django-submission.zip'
    output.parent.mkdir(exist_ok=True)
    temporary = output.with_suffix('.tmp')
    with ZipFile(temporary, 'w', ZIP_DEFLATED) as archive:
        for path in files:
            archive.write(path, path.relative_to(ROOT).as_posix())
        archive.writestr('MANIFEST.sha256', manifest)
    with ZipFile(temporary) as archive:
        assert archive.testzip() is None, 'ZIP CRC verification failed'
        for line in manifest.splitlines():
            digest, name = line.split('  ', 1)
            assert sha256(archive.read(name)).hexdigest() == digest, name
        assert len(archive.namelist()) == len(files) + 1
    temporary.replace(output)
    print(f'{output.relative_to(ROOT)}: {len(files)} project files plus MANIFEST.sha256')
    print(f'CRC and SHA-256 manifest verification passed; {output.stat().st_size} bytes')
    print(f'Archive SHA-256: {sha256(output.read_bytes()).hexdigest()}')


if __name__ == '__main__':
    build()
