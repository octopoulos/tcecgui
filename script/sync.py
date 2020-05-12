# coding: utf-8
# @author octopoulo <polluxyz@gmail.com>
# @version 2020-05-01

"""
Sync
"""

import gzip
from logging import getLogger
import os
import re
import shutil
from subprocess import run
from time import time
from typing import Any

from PIL import Image, ImageFile

from common import makedirs_safe, read_text_safe, write_text_safe
from css_minify import css_minify


# folders, might want to edit these
BASE = os.path.dirname(os.path.dirname(__file__))
COMPILER = os.path.join(BASE, 'script/closure-compiler-v20200406.jar')
CSS_FOLDER = os.path.join(BASE, 'css')
JAVA = 'java'
JS_FOLDER = os.path.join(BASE, 'js')
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
        'libs/socket.io',
        'libs/chess-quick',
        ':common',
        ':engine',
        ':global',
        ':3d',
        ':xboard',
        ':graph',
        ':game',
        ':temp',
        ':network',
        ':startup',
        ':config',
        'script',
    ],
    'chart': [
        'libs/chart-quick',
    ],
}

NEED_GZIPS = {
    '4d_.js',
    'ammo.wasm.js',
    'ammo.wasm.wasm',
    'chart_.js',
    'chart.min.js',
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
    'rus.json',
    'sea.css',
    'sea-archive.css',
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


class Sync:
    """Sync
    """

    #
    def __init__(self, **kwargs):
        self.kwargs = kwargs

        self.clean = kwargs.get('clean')                                # type: bool
        self.host = kwargs.get('host')                                  # type: str
        self.no_compress = kwargs.get('no_compress')                    # type: bool
        self.no_debug = kwargs.get('no_debug')                          # type: bool
        self.no_process = kwargs.get('no_process')                      # type: bool
        self.zip = kwargs.get('zip')                                    # type: bool

        self.logger = getLogger(self.__class__.__name__)

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
                image = Image.open(os.path.join(folder, f'{name}.png'))
                offset = (i * width, 0)
                combined.paste(image, offset)
                i += 1

        combined.save(output, format='png')
        print('a', end='')

    def combine_themes(self, folder: str):
        """Combine all pieces of each theme
        """
        sources = os.listdir(folder)
        for source in sources:
            filename = os.path.join(folder, source)
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
            print('g', end='')

    def compress_js(self, filename: str) -> str:
        """Compress javascript
        """
        base, ext = os.path.splitext(filename)
        output = f'{base}_{ext}'

        if self.no_compress:
            shutil.copy(filename, output)
            return output

        args = [
            JAVA,
            '-jar', COMPILER,
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

            filename = os.path.join(folder, source)
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
                    print('d', end='')
            else:
                destin_time = 0

            if not delete and source_time != destin_time:
                self.compress_gzip(filename)
            print(f"{'  ' * depth}{filename}")

        for queue in queues:
            self.gzip_files(queue, depth + 1, delete)

    @staticmethod
    def import_file(match: Any) -> str:
        """@import {common.js}
        """
        source = match.group(1)
        filename = os.path.join(JS_FOLDER, source)
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

    def create_index(self):
        """Create the new index.html
        """
        base = os.path.join(LOCAL, 'index_base.html')
        base_time = os.path.getmtime(base)
        index = os.path.join(LOCAL, 'index.html')
        index_time = os.path.getmtime(index) if os.path.isfile(index) else 0
        change = 0
        if base_time >= index_time:
            change += 1

        # 1) minimise JS
        for js_output, js_files in JS_FILES.items():
            all_js = os.path.join(JS_FOLDER, f'{js_output}.js')
            all_min_js = os.path.join(JS_FOLDER, f'{js_output}_.js')
            # common/engine changed => need to update, even though we're not using those files
            js_dates = [os.path.abspath(f"{JS_FOLDER}{js_file.strip(':')}.js") for js_file in js_files]
            js_names = [os.path.abspath(f'{JS_FOLDER}{js_file}.js') for js_file in js_files if js_file[0] != ':']

            if js_output == 'all':
                # script_js = os.path.join(JS_FOLDER, 'script.js')
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
                print('J', end='')
                continue

            datas = []
            for js_name in js_names:
                print(js_name)
                script_data = read_text_safe(js_name)
                if not script_data:
                    continue

                # process the script.js
                if js_name.endswith('script.js'):
                    script_data = re.sub('@import {(.*?)}', self.import_file, script_data);
                    script_data = re.sub('// BEGIN.*?// END', '', script_data, flags=re.S)

                    if self.no_debug:
                        script_data = re.sub('// <<.*?// >>', '', script_data, flags=re.S)

                    # use HOST
                    print(f'host={self.host}')
                    if self.host != '/':
                        script_data = script_data.replace("HOST = '/',", f"HOST = '{self.host}',")

                datas.append(script_data)

            data = '\n'.join(datas)

            if '4d' in js_output:
                data = self.compress_3d(data)

            write_text_safe(all_js, data)
            self.compress_js(all_js)
            print('j', end='')
            change += 1

        # 2) minimise CSS
        all_css = os.path.join(CSS_FOLDER, 'all.css')
        all_min_css = os.path.join(CSS_FOLDER, 'all_.css')
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

            print('c', end='')
            change += 1
        else:
            css_data = read_text_safe(all_min_css) or ''
            print('C', end='')

        if not change:
            print('X', end='')
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
        if not self.no_process:
            all_min_js = os.path.join(JS_FOLDER, 'all_.js')
            js_data = read_text_safe(all_min_js) or ''
            replaces = {
                '<!-- {SCRIPT} -->': f'<script>{js_data}</script>',
                '<!-- {STYLE} -->': f'<style>{css_data}</style>',
            }
            for key, value in replaces.items():
                html = html.replace(key, value)

            html = re.sub('<!-- .*? -->', '', html, flags=re.S)

        html = re.sub(r'\n\s+', '\n', html)
        filename = os.path.join(LOCAL, 'index.html')
        write_text_safe(filename, html)

    def synchronise(self) -> bool:
        """Synchronise the files
        """
        self.normalise_folders()
        self.create_index()
        if self.clean:
            self.gzip_files(LOCAL, 0, True)
        elif self.zip:
            self.gzip_files(LOCAL, 0, False)
        return True


if __name__ == '__main__':
    start = time()
    sync = Sync()

    if 0:
        sync.combine_themes(os.path.join(BASE, 'theme'))
    else:
        sync.synchronise()

    end = time()
    print(f'\nELAPSED: {end-start:.3f} seconds')
