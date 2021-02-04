# coding: utf-8
# @author octopoulo <polluxyz@gmail.com>
# @version 2021-02-03

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
    'crash.json': 3600,
    'crosstable.json': 1800,
    'data.json': 5 + 1800,
    'data1.json': 4 + 1800,
    'enginerating.json': 3600 * 6,
    'Eventcrosstable.json': 3600,
    'gamelist.json': 3600 * 12,
    # 'live.json': 1,
    'live.pgn': 1,
    'liveeval.json': 2 + 1800,
    'liveeval1.json': 3 + 1800,
    'schedule.json': 1200,
    'tournament.json': 3600 * 6,
    'winners.json': 3600 * 24,
}


def download_json():
    """Download all necessary JSON / PGN files
    """
    this_path = os.path.dirname(os.path.dirname(__file__))

    # download the most critical files at the ned
    alphas = sorted(SOURCE_TIMES.items(), key=lambda x: x[1], reverse=True)

    for source, age in alphas:
        output = os.path.join(this_path, f'{source}')
        # file is recent => don't download
        if os.path.isfile(output):
            modified = os.stat(output).st_mtime
            if time() < modified + age:
                print(f'SKIP : {source}')
                continue

        # try to download the file
        session = requests.session()
        kwargs = {}
        response = session.get(f'{HOST}{source}', **kwargs)
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
