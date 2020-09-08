# coding: utf-8
# @author octopoulo <polluxyz@gmail.com>
# @version 2020-09-07

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
    parser = ArgumentParser(description='Sync', prog='python __main__.py')
    add = parser.add_argument

    add('--clean', action='store_true', help='delete all .gz files')
    add('--console-debug', nargs='?', default='INFO', help='console debug level',
        choices=['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'])
    add('--debug', nargs='?', default=0, const=1, type=int, help="keep debug code from the javascript")
    add('--download', action='store_true', help='download JSON files')
    add('--host', nargs='?', default='/', help='host, ex: /seriv/')
    add('--inspector', nargs='?', default=0, const=1, type=int, help='run the inspector')
    add('--no-process', nargs='?', default=0, const=1, type=int, help="don't process the images")
    add('--zip', action='store_true', help='create .gz files')

    # configure args
    args = parser.parse_args()
    args_dict = vars(args)

    if args.download:
        download_json()
    elif args.inspector:
        from inspector import Inspect
        inspector = Inspect()
        inspector.go()
    else:
        sync = Sync(**args_dict)
        sync.synchronise()


if __name__ == '__main__':
    start = time()
    main()
    print(f'\nELAPSED: {time() - start:.3f} seconds')
