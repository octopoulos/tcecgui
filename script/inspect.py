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


BASE = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
JS_FOLDER = os.path.join(BASE, 'js')

SKIP_SOURCES = {'all', 'chart', 'tcec'}


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

        # 1) check globals alphabetical order
        alphas = sorted(globs, key=lambda x: x.lower())
        if globs != alphas:
            print(f'{filename}\n{globs}\n{alphas}')

        # 2) detect unused globals
        data = text[rematch.end():]
        for glob in globs:
            glob = glob.split(':')[0]
            rematch = re.findall(rf'\b{glob}\b', data)
            if not rematch:
                print(filename, glob)

        # 3) check function doc
        funcs = re.findall(r'/\*\*(.*?)\*/\r?\nfunction\s*(\w+)\s*\((.*?)\)\s*{(.*?)\r?\n}', data, re.S)
        for [doc, name, args, content] in funcs:
            has_return = bool(re.search(r'\n    return ', content))
            # if not has_return:
            #     has_return = bool(re.search(r'\n        return ', content))

            doc_return = '@returns' in doc
            if has_return is not doc_return:
                print(f'{filename}: return: {name}')

            doc_param = len(re.findall('@param', doc))
            num_param = len([item for item in re.split(r', ', args) if item])
            if doc_param != num_param:
                print(f'{filename}: args: {name}: {doc_param} vs {num_param}')

    def analyse_folder(self, folder: str):
        """Analyse a folder
        """
        sources = os.listdir(folder)
        for source in sources:
            base, ext = os.path.splitext(source)
            if ext != '.js' or base.endswith('_') or base.startswith('_'):
                continue
            if base in SKIP_SOURCES:
                continue
            filename = os.path.join(folder, source)

            if os.path.isdir(filename):
                self.analyse_folder(filename)
            elif os.path.isfile(filename):
                self.analyse_file(filename)


if __name__ == '__main__':
    start = time()
    inspect = Inspect()
    inspect.analyse_folder(JS_FOLDER)
    end = time()
    print(f'\nELAPSED: {end-start:.3f} seconds')
