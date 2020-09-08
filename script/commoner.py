# coding: utf-8
# @author octopoulo <polluxyz@gmail.com>
# @version 2020-04-13

"""
Common functions
"""

import errno
import logging
import os


def makedirs_safe(folder: str) -> bool:
    """Create a folder recursively + handle errors
    :return: True if the folder has been created or existed already, False otherwise
    """
    if not folder:
        return True

    try:
        os.makedirs(folder)
        return True
    except Exception as e:
        if isinstance(e, OSError) and e.errno == errno.EEXIST:
            return True
        logging.error({'status': 'makedirs_safe__error', 'error': e, 'folder': folder})
        return False


def read_text_safe(filename: str, locked: bool=False, want_bytes: bool=False) -> str or bytes or None:
    """Read the content of a file and convert it to utf-8
    """
    if not filename or not os.path.isfile(filename):
        return None

    try:
        open_func = open    # locked_open if locked else open
        with open_func(filename, 'rb') as file:
            data = file.read()
            return data if want_bytes else data.decode('utf-8-sig')
    except OSError as e:
        logging.error({'status': 'read_text_safe__error', 'error': e, 'filename': filename})
    return None


def utc_time() -> float:
    """Utility to return the utc timestamp
    """
    return datetime.now(tz=timezone.utc).timestamp()


def write_text_safe(
        filename: str,
        data: str or bytes,
        mode: str='wb',
        locked: bool=False,
        convert_newlines: bool=False,           # convert \n to \r\n on windows
        ) -> bool:
    """Save text or binary to a file
    """
    if not filename or '?' in filename:
        return False

    # windows support
    if convert_newlines and isinstance(data, str) and system() == 'Windows' and '\r\n' not in data:
        data = data.replace('\n', '\r\n')

    # save
    path = os.path.dirname(filename)
    if not makedirs_safe(path):
        return False

    try:
        open_func = open    # locked_open if locked else open
        with open_func(filename, mode) as file:
            if data:
                file.write(data.encode('utf-8') if isinstance(data, str) else data)
            return True
    except OSError as e:
        logging.error({'status': 'write_text_safe__error', 'error': e, 'filename': filename})
    return False
