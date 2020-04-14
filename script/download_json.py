# coding: utf-8

"""
Download JSON
- pip3 install requests
"""

import os
from time import time

import requests


HOST = 'https://tcec-chess.com/'

# files to get + how old can they be (in seconds) before a refresh
SOURCE_TIMES = {
    'crash': 1800,
    'crosstable': 180,
    'data': 120,
    'data1': 120,
    'enginerating': 3600,
    'gamelist': 3600,
    'live': 1,
    'liveeval': 1,
    'liveeval1': 1,
    'schedule': 360,
    'tournament': 360,
    'winners': 360,
}


def main():
    """Download all necessary JSON files
    """
    start = time()
    this_path = os.path.dirname(os.path.dirname(__file__))

    for source, age in SOURCE_TIMES.items():
        output = os.path.join(this_path, f'{source}.json')
        # file is recent => don't download
        if os.path.isfile(output):
            modified = os.stat(output).st_mtime
            if time() < modified + age:
                print(f'SKIP : {source}')
                continue

        # try to download the file
        session = requests.session()
        kwargs = {}
        response = session.get(f'{HOST}{source}.json', **kwargs)
        session.close()

        status = response.status_code
        text = response.text
        print(f'{status:4} : {source:12} : {len(text)}')
        if status == 200:
            with open(output, 'w+') as file:
                file.write(text)

    print(f'Done, {time() - start:.04} seconds elapsed.')


if __name__ == '__main__':
    main()
