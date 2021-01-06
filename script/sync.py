# coding: utf-8
# @author octopoulo <polluxyz@gmail.com>
# @version 2021-01-05

"""
Sync
"""

from argparse import ArgumentParser
from ftplib import FTP
import gzip
from logging import getLogger
import os
from os.path import join
import re
import shutil
from subprocess import run
from time import time
from typing import Any

from PIL import Image, ImageFile

from commoner import create_group, default_int, makedirs_safe, pinfo, read_text_safe, write_text_safe
from css_minify import css_minify


# folders, might want to edit these
BASE = os.path.dirname(os.path.dirname(__file__))
COMPILER = 'closure-compiler-v20200406.jar'
CSS_FOLDER = join(BASE, 'css')
JAVA = 'java'
JS_FOLDER = join(BASE, 'js')
LOCAL = BASE

# edit these files
CSS_FILES = [
    'light',
]

JS_FILES = {
    '4d': [
        'libs/three',
        'libs/stats',
        'libs/GLTFLoader',
        'libs/DRACOLoader',
        'libs/camera-controls',
    ],
    'all': [
        'libs/socket.io.dev',
        ':common',
        ':chess',
        ':engine',
        ':global',
        ':3d',
        ':xboard',
        ':chart',
        ':graph',
        ':game',
        ':temp',
        ':network',
        ':startup',
        ':config',
        'script',
    ],
    # 'chart': [
    #     'libs/chart-quick',
    # ],
}

NEED_GZIPS = {
    '4d_.js',
    'ammo.wasm.js',
    'ammo.wasm.wasm',
    'bul.json',
    'chart_.js',
    'chart.min.js',
    'chess-wasm.js',
    'chess-wasm.wasm',
    'dark.css',
    'dark-archive.css',
    'draco_decoder.js',
    'draco_decoder.wasm',
    'draco_wasm_wrapper.js',
    'fra.json',
    'index.html',
    'jpn.json',
    'light-archive.css',
    'manifest.json',
    'pieces-draco.glb',
    'pol.json',
    'rus.json',
    'sea.css',
    'sea-archive.css',
    'spa.json',
    'ukr.json',
}

# don't gzip inside those folders
SKIP_GZIPS = {
    'archive',
    'doc',
    'image',
    'model',
    'node_modules',
    'script',
    'sound',
    'test',
    'theme',
}

UPLOAD_SKIPS = {'backup', 'bin', 'css', 'js', 'script'}


class Sync:
    """Sync
    """

    #
    def __init__(self, **kwargs):
        self.kwargs = kwargs

        self.clean = kwargs.get('clean')                                # type: bool
        self.debug = kwargs.get('debug')                                # type: bool
        self.ftp_debug = default_int(self.kwargs.get('ftp_debug'), 0)   # type: int
        self.host = kwargs.get('host')                                  # type: str
        self.no_compress = kwargs.get('no_compress')                    # type: bool
        self.target = kwargs.get('target', 'index')                     # type: str
        self.upload = kwargs.get('upload')                              # type: int
        self.zip = kwargs.get('zip')                                    # type: bool

        self.logger = getLogger(self.__class__.__name__)

    # FILES
    #######

    def combine_pieces(self, folder: str):
        """Combine chess pieces png files into 1 file
        """
        if 'metro' in folder:
            height = 160
            width = 160
        else:
            height = 80
            width = 80
        combined = Image.new('RGBA', (width * 12, height), (0, 255, 0, 0))
        output = f'{folder}.png'

        i = 0
        pieces = 'bknpqr'
        for color in 'bw':
            for piece in pieces:
                name = f'{color}{piece}'
                image = Image.open(join(folder, f'{name}.png'))
                offset = (i * width, 0)
                combined.paste(image, offset)
                i += 1

        combined.save(output, format='png')
        pinfo('a', end='')

    def combine_themes(self, folder: str):
        """Combine all pieces of each theme
        """
        sources = os.listdir(folder)
        for source in sources:
            filename = join(folder, source)
            if os.path.isdir(filename):
                self.combine_pieces(filename)

    def compress_3d(self, data: str) -> str:
        """Compress THREE javascript
        """
        data = re.sub(r'\bTHREE\b', 'T', data)
        data = re.sub(r'console\.(error|warn)\(.+?\);', '', data, flags=re.S)
        return data

    def compress_gzip(self, filename: str):
        """Gzip compress a file
        """
        output = f'{filename}.gz'
        with open(filename, 'rb') as f_in:
            with gzip.open(output, 'wb') as f_out:
                shutil.copyfileobj(f_in, f_out)

        # synchronise the date/time
        if os.path.isfile(output):
            info = os.stat(output)
            os.utime(filename, (info.st_atime, info.st_mtime))
            pinfo('g', end='')

    def compress_js(self, filename: str) -> str:
        """Compress javascript
        """
        # 1) skip?
        base, ext = os.path.splitext(filename)
        output = f'{base}_{ext}'

        if self.no_compress:
            shutil.copy(filename, output)
            return output

        # 2) locate the compiler
        for base in ('script', 'bin', '../bin'):
            compiler = os.path.abspath(f'{BASE}/{base}/{COMPILER}')
            if os.path.isfile(compiler):
                break
        else:
            self.logger.error({'status': 'compress_js__error', 'compiler': COMPILER})
            return output

        # 3) compress
        args = [
            JAVA,
            '-jar', compiler,
            '--js', filename,
            '--js_output_file', output,
            '--language_in', 'ECMASCRIPT_2018',
            '--language_out', 'ECMASCRIPT_2018',
        ]
        if self.kwargs.get('advanced'):
            args.extend(['--compilation_level', 'ADVANCED'])
        run(args)
        return output

    def gzip_files(self, folder: str, depth: int, delete: bool):
        """Gzip all wanted files, recursively
        """
        queues = []
        sources = os.listdir(folder)

        for source in sources:
            if source.startswith(('.', '_')):
                continue

            filename = join(folder, source)
            if os.path.isdir(filename):
                if source not in SKIP_GZIPS:
                    queues.append(filename)
                continue

            # file
            if not os.path.isfile(filename):
                continue
            if source not in NEED_GZIPS:
                continue

            output = f'{filename}.gz'
            source_time = os.path.getmtime(filename)
            if os.path.isfile(output):
                destin_time = os.path.getmtime(output)
                if delete:
                    os.unlink(output)
                    pinfo(f"d{'  ' * depth}{output}")
            else:
                destin_time = 0

            if not delete and source_time != destin_time:
                self.compress_gzip(filename)
                pinfo(f"{'  ' * depth}{filename}")

        for queue in queues:
            self.gzip_files(queue, depth + 1, delete)

    @staticmethod
    def import_file(match: Any) -> str:
        """@import {common.js}
        """
        source = match.group(1)
        filename = join(JS_FOLDER, source)
        data = read_text_safe(filename) or ''
        if source.endswith('.js'):
            data = re.sub(r'["\']use strict["\'];?', '', data)
        return data

    def normalise_folders(self):
        """Add the missing / (slash) at the end of the folder
        """
        global CSS_FOLDER, JS_FOLDER, LOCAL
        if CSS_FOLDER[-1] != '/':
            CSS_FOLDER += '/'
        if JS_FOLDER[-1] != '/':
            JS_FOLDER += '/'
        if LOCAL[-1] != '/':
            LOCAL += '/'

    # INDEX
    #######

    def create_index(self):
        """Create the new index.html
        """
        target = f'{self.target}.html'
        base = join(LOCAL, 'index_base.html')
        base_time = os.path.getmtime(base)
        index = join(LOCAL, target)
        index_time = os.path.getmtime(index) if os.path.isfile(index) else 0
        change = 0
        if base_time >= index_time:
            change += 1

        # 1) minimise JS
        for js_output, js_files in JS_FILES.items():
            all_js = join(JS_FOLDER, f'{js_output}.js')
            all_min_js = join(JS_FOLDER, f'{js_output}_.js')
            # common/engine changed => need to update, even though we're not using those files
            js_dates = [os.path.abspath(f"{JS_FOLDER}{js_file.strip(':')}.js") for js_file in js_files]
            js_names = [os.path.abspath(f'{JS_FOLDER}{js_file}.js') for js_file in js_files if js_file[0] != ':']

            if js_output == 'all':
                # script_js = join(JS_FOLDER, 'script.js')
                extras = []
            else:
                extras = []

            # skip?
            update = True
            if os.path.isfile(all_min_js) and os.path.isfile(all_js):
                all_time = os.path.getmtime(all_min_js)
                update = False
                for js_date in js_dates + extras:
                    update |= os.path.isfile(js_date) and os.path.getmtime(js_date) >= all_time

            if not update:
                pinfo('J', end='')
                continue

            datas = [
                "'use strict';",
            ]
            for js_name in js_names:
                pinfo(js_name)
                if not (script_data := read_text_safe(js_name)):
                    continue

                # process the script.js
                if js_name.endswith('script.js'):
                    script_data = re.sub(r'["\']use strict["\'];?', '', script_data)
                    script_data = re.sub('@import {(.*?)}', self.import_file, script_data)
                    script_data = re.sub('// BEGIN.*?// END', '', script_data, flags=re.S)

                    if not self.debug:
                        script_data = re.sub('// <<.*?// >>', '', script_data, flags=re.S)

                    # use HOST
                    pinfo(f'host={self.host}')
                    if self.host != '/':
                        script_data = script_data.replace("HOST = '/',", f"HOST = '{self.host}',")

                datas.append(script_data)

            data = '\n'.join(datas)

            if '4d' in js_output:
                data = self.compress_3d(data)

            write_text_safe(all_js, data)
            self.compress_js(all_js)
            pinfo('j', end='')
            change += 1

        # 2) minimise CSS
        all_css = join(CSS_FOLDER, 'all.css')
        all_min_css = join(CSS_FOLDER, 'all_.css')
        css_names = [os.path.abspath(f'{CSS_FOLDER}{css_file}.css') for css_file in CSS_FILES]

        update = True
        if os.path.isfile(all_min_css) and os.path.isfile(all_css):
            all_time = os.path.getmtime(all_min_css)
            update = False
            for css_name in css_names:
                update |= os.path.isfile(css_name) and os.path.getmtime(css_name) >= all_time

        if update:
            datas = []
            for css_name in css_names:
                datas.append(read_text_safe(css_name) or '')

            data = '\n'.join(datas)
            write_text_safe(all_css, data)
            css_data = css_minify(data)
            write_text_safe(all_min_css, css_data)

            pinfo('c', end='')
            change += 1
        else:
            css_data = read_text_safe(all_min_css) or ''
            pinfo('C', end='')

        if not change:
            pinfo('X', end='')
            return

        # 3) remove BEGIN ... END
        html = read_text_safe(base)
        html = re.sub('<!-- BEGIN -->.*?<!-- END -->', '', html, flags=re.S)
        html = re.sub('// BEGIN.*?// END', '', html, flags=re.S)

        # use the HOST
        if self.host != '/':
            replaces = {
                'href="/': f'href="{self.host}',
                'src="/': f'src="{self.host}',
            }
            for key, value in replaces.items():
                html = html.replace(key, value)

        # 4) create the new index.html
        if True:
            all_min_js = join(JS_FOLDER, 'all_.js')
            js_data = read_text_safe(all_min_js) or ''
            replaces = {
                '<!-- {SCRIPT} -->': f'<script>{js_data}</script>',
                '<!-- {STYLE} -->': f'<style>{css_data}</style>',
            }
            for key, value in replaces.items():
                html = html.replace(key, value)

            html = re.sub('<!-- .*? -->', '', html, flags=re.S)

        html = re.sub(r'\n\s+', '\n', html)
        write_text_safe(index, html)

    def upload_dir(self, ftp: FTP, local: str, remote: str, depth: int):
        """Recursively upload files in a directory
        """
        local = local.rstrip('/\\')
        remote = remote.rstrip('/')
        if not os.path.isdir(local):
            return

        base_local = os.path.basename(local)
        splits = remote.split('/')
        parent = splits[-1]

        # remote files
        destins = {}
        infos = ftp.mlsd(remote)
        for name, info in infos:
            if name in {'.', '..'}:
                continue
            size = info.get('size')
            time = parse_date_time(info.get('modify'), mode='ts')
            destins[name] = [time, size, info.get('type')]

        # local files + action
        sources = set()
        for source in os.listdir(local):
            if source.startswith(('.', '_')):
                continue
            if source in UPLOAD_SKIPS:
                continue

            filename = join(local, source)
            sources.add(source)
            destin = destins.get(source)
            target = f'{remote}/{source}'
            if source not in 'index.html':
                continue
            pinfo(f'{filename} => {target}')

            # folder => recurse
            if os.path.isdir(filename):
                pass
            # file
            else:
                if destin:
                    ok = 0
                    stat = os.stat(filename)

                    # different size => replace it
                    if int(destin[1]) != stat.st_size:
                        ok = 1
                    # more recent file => replace it
                    elif source.endswith(REPLACE_EXTENSIONS):
                        time = parse_date_time(stat.st_mtime, mode='ts')

                        # assumption: FTP time is UTC! if not, must change the difference
                        delta = destin[0] - time
                        if delta < 0 or int(destin[1]) != stat.st_size:
                            ok = 1

                    if ok:
                        pinfo(f'\nUPDATE {target} ' if DEV.url & 1 else ':', end='')
                else:
                    ok = 1
                    pinfo(f'\nADD {target} ' if DEV.url & 1 else '.', end='')

                if ok:
                    try:
                        with open(filename, 'rb') as file:
                            ftp.storbinary(f'STOR {target}', file)
                    except Exception as e:
                        self.logger.error({'status': 'upload_dir__error', 'error': e})

    # MAIN
    ######

    def synchronise(self) -> bool:
        """Synchronise the files
        """
        if self.clean:
            self.gzip_files(LOCAL, 0, True)
            return

        # 1) create index
        self.normalise_folders()
        self.create_index()
        if self.zip:
            self.gzip_files(LOCAL, 0, False)

        # 2) upload the files
        if not self.upload:
            return True
        if is_missing_any({'host', 'password', 'remote', 'user'}, INFO, origin='synchronise'):
            return False

        ftp = FTP()
        ftp.set_debuglevel(self.ftp_debug)
        ftp.connect(INFO['host'], INFO.get('port', 21))
        ftp.login(INFO['user'], INFO['password'])

        pinfo('')
        self.upload_dir(ftp, LOCAL, INFO['remote'], 0)
        ftp.quit()
        return True


def add_arguments_sync(parser: ArgumentParser):
    add = create_group(parser, 'sync')
    add('--advanced', action='store_true', help='advanced javascript compilation')
    add('--clean', action='store_true', help='delete all .gz files')
    add('--ftp-debug', nargs='?', default=0, const=1, type=int, help='ftp debug level')
    add('--host', nargs='?', default='/', help='host, ex: /seriv/')
    add('--no-compress', nargs='?', default=0, const=1, type=int, help="don't compress JS")
    add('--sync', action='store_true', help='create the index.html')
    add('--target', nargs='?', default='index', help='set the output file, ex: index')
    add('--upload', nargs='?', default=0, const=1, type=int, help='upload via FTP')
    add('--zip', action='store_true', help='create .gz files')


def main_sync(parser: ArgumentParser=None):
    if not parser:
        parser = ArgumentParser(description='Sync', prog='python sync.py')
        add_arguments_sync(parser)

    args = parser.parse_args()
    args_dict = vars(args)

    sync = Sync(**args_dict)
    if 0:
        sync.combine_themes(join(BASE, 'theme'))
    sync.synchronise()


if __name__ == '__main__':
    start = time()
    main_sync()
    print(f'\nELAPSED: {time() - start:.3f} seconds')
