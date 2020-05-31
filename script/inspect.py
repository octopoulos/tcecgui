# coding: utf-8
# @author octopoulo <polluxyz@gmail.com>
# @version 2020-05-31

"""
Inspect JS files
"""

import os
import re
from time import time

from common import read_text_safe


BASE = os.path.dirname(os.path.dirname(__file__))
JS_FOLDER = os.path.join(BASE, 'js')

SKIP_SOURCES = {'all.js', 'tcec.js'}


class Inspect:
    """Inspect
    """
    def __init__(self):
        pass

    def analyse_file(self, filename: str):
        """Analyse a file
        """
        text = read_text_safe(filename)
        rematch = re.search(r'/\*\s*globals\s*(.*?)\*/', text, re.S)
        if not rematch:
            return
        globs = rematch.group(1).strip()
        if not globs:
            return

        globs = [item for item in re.split(r'[,\s]', globs) if item]

        # check alphabetical order
        alphas = sorted(globs, key=lambda x: x.lower())
        if globs != alphas:
            print(f'{filename}\n{globs}\n{alphas}')

        # detect unused globals
        data = text[rematch.end():]
        for glob in globs:
            glob = glob.split(':')[0]
            rematch = re.findall(rf'\b{glob}\b', data)
            if not rematch:
                print(filename, glob)

    def analyse_folder(self, folder: str):
        """Analyse a folder
        """
        sources = os.listdir(folder)
        for source in sources:
            if source in SKIP_SOURCES:
                continue

            filename = os.path.join(folder, source)
            if os.path.isdir(filename):
                pass
            elif os.path.isfile(filename):
                self.analyse_file(filename)


if __name__ == '__main__':
    start = time()
    inspect = Inspect()
    inspect.analyse_folder(JS_FOLDER)
    end = time()
    print(f'\nELAPSED: {end-start:.3f} seconds')
