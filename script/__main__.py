# coding: utf-8
# @author octopoulo <polluxyz@gmail.com>
# @version 2020-04-13

"""
Main
"""

from argparse import ArgumentParser
import os
from time import time

from download_json import download_json
from sync import Sync


def main():
    """Main
    """
    start = time()

    parser = ArgumentParser(description='Sync', prog='python __main__.py')
    add = parser.add_argument

    add('--clean', action='store_true', help='delete all .gz files')
    add('--console-debug', nargs='?', default='INFO', help='console debug level',
        choices=['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'])
    add('--download', action='store_true', help='download JSON files')
    add('--host', nargs='?', default='/', help='host, ex: /seriv/')
    add('--no-debug', nargs='?', default=0, const=1, type=int, help="remove debug code from the javascript")
    add('--no-process', nargs='?', default=0, const=1, type=int, help="don't process the images")
    add('--zip', action='store_true', help='create .gz files')

    args = parser.parse_args()
    args_dict = vars(args)

    if args.download:
        download_json()
    else:
        sync = Sync(**args_dict)
        sync.synchronise()

    end = time()
    print(f'\nELAPSED: {end-start:.3f} seconds')


if __name__ == '__main__':
    main()
