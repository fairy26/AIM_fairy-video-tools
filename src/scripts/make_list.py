import os
import re
import sys
from logging import getLogger

import pandas as pd
from anytree import PreOrderIter
from exitstatus import ExitStatus

from libs.dirtree import FileNode, get_dirtree

logger = getLogger(__name__)


def run(src, dest):

    src_dirtree = get_dirtree(src)

    avi_list = make_avi_list(src_dirtree)

    save_xlsx(dest, avi_list)

    # sys.exit(ExitStatus.success)


def make_avi_list(src_dirtree):
    avi_list = []

    for node in PreOrderIter(src_dirtree):
        if type(node) == FileNode:
            m = re.match(
                r".*/([^.-]+)/([^.-]+)-([^-]+)/([0-9]{4})/([0-9]{4})-([0-9]{2})/([0-9]{4})-([0-9]{2})-([0-9]{2})/([^.-]+)-([^-]+)-([0-9]{8})-([0-9]{6})\.?.*\.zstd\.avi$",
                str(node.get_path()),
            )
            if m:
                yyyymmdd = m.group(12)
                yyyy = yyyymmdd[:4]
                mm = yyyymmdd[4:6]
                dd = yyyymmdd[6:8]

                hhMMss = m.group(13)
                hh = hhMMss[:2]
                MM = hhMMss[2:4]

                avi_list.append(
                    [
                        m.group(10),
                        m.group(11),
                        yyyy,
                        "-".join([mm, dd]),
                        ":".join([hh, MM]),
                        node.name,
                        os.path.getsize(node.get_path()) / (1024 * 1024 * 1024),
                    ]
                )

    return avi_list


def save_xlsx(dest, avi_list):
    df = pd.DataFrame(avi_list, columns=["施設", "部屋番号", "年", "月-日", "時:分", "ファイル名", "ファイルサイズ(GiB)"])
    df.sort_values("ファイル名", inplace=True)
    df.reset_index(inplace=True, drop=True)
    df.to_excel(dest)
