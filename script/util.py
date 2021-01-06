# coding: utf-8
# @author octopoulo <polluxyz@gmail.com>
# @version 2021-01-05

"""
Util
"""

from argparse import ArgumentParser
import os
from os.path import join
from time import time

from commoner import create_group


BASE_PATH = os.path.abspath(os.path.dirname(__file__) + '/../')
DATA_PATH = join(BASE_PATH, 'data')


def add_arguments_util(parser: ArgumentParser):
    add = create_group(parser, 'util')
    add('--inspector', nargs='?', default=0, const=1, type=int, help='run the inspector')


def main_util(parser: ArgumentParser=None):
    if not parser:
        parser = ArgumentParser(description='Util', prog='python util.py')
        add_arguments_sync(parser)

    args = parser.parse_args()
    args_dict = vars(args)

    if args.inspector:
        from inspector import Inspect
        inspector = Inspect()
        inspector.go()


if __name__ == '__main__':
    start = time()
    main_util()
    pinfo(f'\nELAPSED: {time() - start:.3f} seconds')
