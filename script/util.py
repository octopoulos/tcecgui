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

from PIL import Image, ImageFile

from commoner import create_group


BASE_PATH = os.path.abspath(os.path.dirname(__file__) + '/../')
DATA_PATH = join(BASE_PATH, 'data')


def combine_pieces(folder: str):
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


def combine_themes(folder: str):
    """Combine all pieces of each theme
    """
    sources = os.listdir(folder)
    for source in sources:
        filename = join(folder, source)
        if os.path.isdir(filename):
            combine_pieces(filename)


def add_arguments_util(parser: ArgumentParser):
    add = create_group(parser, 'util')
    add('--combine', action='store_true', help='combine piece themes')
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
