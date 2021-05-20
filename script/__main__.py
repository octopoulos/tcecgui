# coding: utf-8
# @author octopoulo <polluxyz@gmail.com>
# @version 2021-05-19

"""
Main
"""

from argparse import ArgumentParser
import os
from time import time

from commoner import create_group
from download_json import download_json
from sync import add_arguments_sync, main_sync
from util import add_arguments_util, main_util


def main():
    """Main
    """
    parser = ArgumentParser(description='TCEC', prog='python __main__.py')

    add = create_group(parser, 'tcec')
    add('--download', action='store_true', help='download JSON files')

    add_arguments_util(parser)
    add_arguments_sync(parser)

    # configure args
    args = parser.parse_args()
    args_dict = vars(args)
    args_set = set(item for item, value in args_dict.items() if value)

    if args.download:
        download_json()
    # utils
    if args_set & {'inspector'}:
        main_util(parser)
    # sync
    elif args.sync:
        main_sync(parser)


if __name__ == '__main__':
    start = time()
    main()
    print(f'\nELAPSED: {time() - start:.3f} seconds')
