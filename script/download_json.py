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
    'crash': 3600,
    'crosstable': 1800,
    'data': 5,
    'data1': 4,
    'enginerating': 3600 * 6,
    'gamelist': 3600 * 12,
    'live': 1,
    'liveeval': 2,
    'liveeval1': 3,
    'schedule': 1200,
    'tournament': 3600 * 12,
    'winners': 3600 * 24 * 7,
}


def download_json():
    """Download all necessary JSON files
    """
    this_path = os.path.dirname(os.path.dirname(__file__))

    # download the most critical files at the ned
    alphas = sorted(SOURCE_TIMES.items(), key=lambda x: x[1], reverse=True)

    for source, age in alphas:
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


if __name__ == '__main__':
    start = time()
    download_json()
    end = time()
    print(f'\nELAPSED: {end-start:.3f} seconds')
