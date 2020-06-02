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
        self.re_args = re.compile(r'(\w+)(?:=(?:\w+|\[.*?\]|{.*?}|\'.*?\'))?(?:[,}]|$)', re.S)
        self.re_function = re.compile(r'/\*\*(.*?)\*/\r?\nfunction\s*(\w+)\s*\((.*?)\)\s*{(.*?)\r?\n}', re.S)
        self.re_globals = re.compile(r'/\*\s*globals\s*(.*?)\*/', re.S)
        self.re_split = re.compile(r'[,\s]')

    def analyse_file(self, filename: str):
        """Analyse a file
        """
        text = read_text_safe(filename)
        rematch = self.re_globals.search(text)
        if not rematch:
            return
        globs = rematch.group(1).strip()
        if not globs:
            return

        globs = [item for item in self.re_split.split(globs) if item]

        # 1) check globals alphabetical order
        alphas = sorted(globs, key=lambda x: x.split(':')[0].lower())
        if globs != alphas:
            for glob, alpha in zip(globs, alphas):
                if glob != alpha:
                    print(f'{filename}: order: {glob} vs {alpha}')
                    break

        # 2) detect unused globals
        unused = []
        data = text[rematch.end():]
        for glob in globs:
            glob = glob.split(':')[0]
            rematch = re.findall(rf'\b{glob}\b', data)
            if not rematch:
                unused.append(glob)

        if unused:
            print(f"{filename}: unused: {', '.join(unused)}")

        # 3) check function doc
        funcs = self.re_function.findall(data)
        for doc, name, args, content in funcs:
            has_return = bool(re.search(r'\n    return ', content))
            doc_return = '@returns' in doc
            if has_return is not doc_return:
                print(f'{filename}: return: {name}')

            doc_param = len(re.findall('@param', doc))
            num_param = len(self.re_args.findall(args))
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
