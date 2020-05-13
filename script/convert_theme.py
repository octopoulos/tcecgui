# encoding: utf-8
# @author octopoulo <polluxyz@gmail.com>
# @version 2020-05-01

"""
Convert theme.css to theme/png files.
Why?
1)  - theme.js  = 387KB
    - saved png = 184KB ... half the size
    - quant png = 114KB
    - combined  = 83KB
2) only the desired theme will be loaded, if it's chess24, then it's only 21KB to load, instead of 387KB
"""

from base64 import decodebytes
import os
import re
from time import time
from typing import Any

from common import read_text_safe, write_text_safe

# folders, might want to edit these
BASE = os.path.dirname(os.path.dirname(__file__))

THEME_FILE = os.path.abspath(BASE + '/dist/js/themes.js')


class Converter:
    """Converter
    """

    def __init__(self):
        pass

    def go(self):
        """Go
        """
        lines = read_text_safe(THEME_FILE).split('\r\n')
        num_theme = 0
        theme = ''

        for line in lines:
            if line.endswith(': {'):
                theme = line[:-3].strip()
                num_theme += 1
                print(f'{num_theme}) {theme}')
                continue

            if 'base64' not in line:
                continue

            items = line.split(': ')
            figure = items[0].strip().lower()
            data = items[1].strip("'")
            pos = data.find('base64,')
            if pos < 0:
                print(f'error at {figure}')
                continue

            data = data[pos + 7:]
            buffer = decodebytes(data.encode('ascii'))
            print(buffer[:50])
            filename = os.path.join(BASE, 'theme', theme, f'{figure}.png')
            write_text_safe(filename, buffer)


if __name__ == '__main__':
    start = time()
    converter = Converter()
    converter.go()
    end = time()
    print(f'\nELAPSED: {end-start:.3f} seconds')
