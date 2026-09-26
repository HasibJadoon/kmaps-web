# -*- coding: utf-8 -*-
"""Write an episode's reconstructed script into km_arabic.

    python3 scripts/episodes/apply.py ghurab_ep1 [naqa_ep1 …]    (from workers/arabic)

Each <name>.py here holds one episode's script as data and prints the UPDATE
that stores it in ar_text_unit.script_json; this runs it against the remote
database. A <name>.sql is applied as it stands.
"""
import pathlib
import subprocess
import sys
import tempfile

HERE = pathlib.Path(__file__).resolve().parent
WORKER = HERE.parents[1]


def main():
    names = sys.argv[1:]
    if not names:
        sys.exit(__doc__)
    for name in names:
        py, sql = HERE / f'{name}.py', HERE / f'{name}.sql'
        if py.exists():
            out = subprocess.run([sys.executable, str(py)], capture_output=True, text=True, check=True).stdout
            tmp = pathlib.Path(tempfile.gettempdir()) / f'{name}.sql'
            tmp.write_text(out, encoding='utf-8')
            sql = tmp
        elif not sql.exists():
            sys.exit(f'no episode named {name}')
        subprocess.run(['npx', 'wrangler', 'd1', 'execute', 'km_arabic', '--remote', '--file', str(sql)],
                       cwd=WORKER, check=True, stdin=subprocess.DEVNULL)
        print(f'{name}: applied')


if __name__ == '__main__':
    main()
