import os
import shutil
import signal
import sys
from contextlib import redirect_stderr
from logging import getLogger
from pathlib import Path

import ffpb
from anytree import PreOrderIter
from exitstatus import ExitStatus
from tqdm import tqdm

from libs.dirtree import DirNode, FileNode, filter_dirtree, get_dirtree, stat_dirtree

logger = getLogger(__name__)


def run(src, dest, includes, excludes, dry_run=False, quiet=False, simplebar=False):

    diskcopy(src, dest, includes, excludes, dry_run, quiet, simplebar)
    # sys.exit(ExitStatus.success)


def diskcopy(src, dest, includes=None, excludes=None, dry_run=True, quiet=False, simplebar=False):
    src_dirtree = get_dirtree(src)

    dest_dirtree = filter_dirtree(src_dirtree, includes, excludes)
    stat_dirtree(dest_dirtree)

    for node in PreOrderIter(dest_dirtree):
        if type(node) == FileNode:
            if node.name.endswith(".avi") and node.size != 0:
                node.convert_to_zstd = True
                node.src_path = node.get_path()
                node.src_name = node.name
                node.name = node.name.replace(".zstd.avi", ".avi").replace(".avi", ".zstd.avi")
            else:
                node.convert_to_zstd = False
                node.src_path = node.get_path()
                node.src_name = node.name

    DEST = Path(dest).resolve()
    dest_dirtree.name = DEST.name
    dest_dirtree.rootpath = DEST.parent

    total_size = 0
    for node in PreOrderIter(dest_dirtree):
        if type(node) == FileNode:
            dest_path = node.get_path()
            if dest_path.exists():
                continue
            total_size += node.size

    if not dry_run:
        bar_format = "{percentage:.0f}, {remaining_s:.0f}\n" if simplebar else None
        pbar = tqdm(total=total_size, disable=not quiet, unit_scale=True, unit="B", bar_format=bar_format)

    for node in PreOrderIter(dest_dirtree):
        if type(node) == DirNode:
            dir_path = node.get_path()

            if dir_path.exists():
                # skip
                continue

            if dry_run:
                logger.info(f"os.makedirs({dir_path}, exist_ok=True)")
            else:
                os.makedirs(dir_path, exist_ok=True)
                # TODO: ERROR: Permission denied: '/media/fairy26/WSD31X5D/2021-04-27'
                logger.info(f"(mkdir) {dir_path}")

        if type(node) == FileNode:
            src_path = node.src_path
            dest_path = node.get_path()

            if dest_path.exists():
                # skip
                continue

            if node.convert_to_zstd:
                if dry_run:
                    logger.info(f"ffmpeg -i {src_path} -c:v zstd {dest_path}")
                else:
                    command = ["-i", src_path, "-c:v", "zstd", dest_path]
                    f = (
                        open(os.devnull, "w", encoding="utf-8") if quiet else sys.stderr
                    )  # pylint: disable=consider-using-with
                    with redirect_stderr(f):
                        ret = ffpb.main(argv=command, stream=f)
                    if quiet:
                        f.close()

                    if ret == (signal.SIGINT + 128):  # exit on keyboard interrupt
                        if dest_path.exists():
                            os.remove(dest_path)
                        logger.error(f"(cancel) {src_path}")
                        break
                    if ret == 0:
                        pbar.update(node.size)
                        logger.info(f"(copy) {src_path}")
                    else:
                        if dest_path.exists():
                            os.remove(dest_path)
                        pbar.update(node.size)
                        logger.error(f"(failed) {src_path}")
                    # pbar.update(node.size)  # test
            else:
                if dry_run:
                    logger.info(f"shutil.copy({src_path}, {dest_path})")
                else:
                    shutil.copy2(src_path, dest_path)
                    pbar.update(node.size)
                    logger.info(f"(copy) {src_path}")

    if not dry_run:
        pbar.close()
