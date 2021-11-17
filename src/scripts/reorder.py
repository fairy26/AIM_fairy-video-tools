import os
import re
import shutil
import sys
from logging import getLogger
from pathlib import Path

from anytree import PreOrderIter, Resolver
from exitstatus import ExitStatus
from tqdm import tqdm

from libs.dirtree import DirNode, FileNode, RootNode, filter_dirtree, get_dirtree

logger = getLogger(__name__)


def run(
    src,
    dest,
    operation,
    new_institution,
    new_room,
    status=None,
    includes=None,
    excludes=None,
    dry_run=True,
    quiet=False,
    simplebar=False,
):

    src_dirtree = get_dirtree(src)
    src_dirtree = filter_dirtree(src_dirtree, includes=includes, excludes=excludes)
    unable_files = reorder(src_dirtree, dest, operation, new_institution, new_room, status, dry_run, quiet, simplebar)

    return unable_files
    # sys.exit(ExitStatus.success)


def reorder(src_dirtree, dest, operation, institute, room, status=None, dry_run=True, quiet=False, simplebar=False):

    DIR = Path(dest).resolve()
    PARENT = DIR.parent

    resolver = Resolver("name")

    new_root = RootNode(name=DIR.name, rootpath=PARENT)
    d1 = DirNode(name=institute, parent=new_root)
    d2 = DirNode(name=f"{institute}-{room}", parent=d1)

    dup_check = set()
    unable_files = set()

    for node in PreOrderIter(src_dirtree):
        if type(node) == FileNode:

            if ".Trash" in str(node.get_path()):
                continue

            m = re.match(r"^([^.-]*?)-?([^-]*?)-?([0-9]{8})-?([0-9]{6})\.?.*\.zstd\.avi$", node.name)
            if m:
                yyyymmdd = m.group(3)
                yyyy = yyyymmdd[:4]
                mm = yyyymmdd[4:6]
                dd = yyyymmdd[6:8]

                d5 = None
                try:
                    d5 = resolver.get(new_root, f"{institute}/{institute}-{room}/{yyyy}/{yyyy}-{mm}/{yyyy}-{mm}-{dd}")

                except:
                    d3 = DirNode(name=f"{yyyy}", parent=d2)
                    d4 = DirNode(name=f"{yyyy}-{mm}", parent=d3)
                    d5 = DirNode(name=f"{yyyy}-{mm}-{dd}", parent=d4)

                name = f"{institute}-{room}-{m.group(3)}-{m.group(4)}"
                if status:
                    name += f".{status}"
                name += ".zstd.avi"

                if name in dup_check:
                    logger.error('duplication error: "%s"', name)
                else:
                    dup_check.add(name)

                FileNode(name=name, parent=d5, src_path=node.get_path())

            elif re.match(r"^.*\.avi$", node.name):
                logger.error('reorder error: "%s"', node.name)
                unable_files.add(node.name)

    total_size = 0
    for node in PreOrderIter(new_root):
        if type(node) == FileNode:
            dest_path = node.get_path()

            if dest_path.exists():
                continue

            total_size += node.src_path.stat().st_size

    if not dry_run:
        bar_format = "{percentage:.0f}, {remaining_s:.0f}\n" if simplebar else None
        pbar = tqdm(total=total_size, unit_scale=True, unit="B", bar_format=bar_format)

    for node in PreOrderIter(new_root):
        if type(node) == DirNode:
            dir_path = node.get_path()

            if dir_path.exists():
                # skip
                continue

            if dry_run:
                logger.info(f"os.makedirs({dir_path}, exist_ok=True)")
            else:
                os.makedirs(dir_path, exist_ok=True)

        if type(node) == FileNode:
            src_path = node.src_path
            dest_path = node.get_path()

            if dest_path.exists():
                # skip
                continue

            if operation == "copy":
                if dry_run:
                    logger.info(f"shutil.copy({src_path}, {dest_path})")
                else:
                    size = node.src_path.stat().st_size
                    shutil.copy(src_path, dest_path)
                    pbar.update(size)
            elif operation == "move":
                if dry_run:
                    logger.info(f"shutil.move({src_path}, {dest_path})")
                else:
                    size = node.src_path.stat().st_size
                    shutil.move(src_path, dest_path)
                    pbar.update(size)

    if not dry_run:
        pbar.close()

    return unable_files
