import os
import re
import signal
import sys
from contextlib import redirect_stderr
from logging import getLogger
from pathlib import Path

from anytree import PreOrderIter, Resolver
from exitstatus import ExitStatus
from tqdm import tqdm
import ffpb

from libs.dirtree import DirNode, FileNode, RootNode, get_dirtree

# from zd.video.preview import create_preview

logger = getLogger(__name__)


def run(src, dest, dry_run=True, quiet=False, simplebar=False):

    if not os.path.exists(src):
        logger.error('directory "%s" does not exist', src)
        sys.exit(ExitStatus.failure)

    src_dirtree = get_dirtree(src)

    preview(src_dirtree, dest, dry_run, quiet, simplebar)

    # sys.exit(ExitStatus.success)


def preview(src_dirtree, dest, dry_run=True, quiet=False, simplebar=False):
    DIR = Path(dest).resolve()
    PARENT = DIR.parent

    resolver = Resolver("name")

    new_root = RootNode(name=DIR.name, rootpath=PARENT)

    for node in PreOrderIter(src_dirtree):
        if type(node) == FileNode:
            m = re.match(
                r".*/([^.-]+)/([^.-]+)-([^-]+)/([0-9]{4})/([0-9]{4})-([0-9]{2})/([0-9]{4})-([0-9]{2})-([0-9]{2})/([^.-]+)-([^-]+)-([0-9]{8})-([0-9]{6})\.?.*\.zstd\.avi$",
                str(node.get_path()),
            )
            if m:
                institute = m.group(10)
                room = m.group(11)
                yyyymmdd = m.group(12)
                yyyy = yyyymmdd[:4]
                mm = yyyymmdd[4:6]
                dd = yyyymmdd[6:8]

                d5 = None
                try:
                    d5 = resolver.get(new_root, f"{institute}/{institute}-{room}/{yyyy}/{yyyy}-{mm}/{yyyy}-{mm}-{dd}")

                except:
                    d1 = DirNode(name=institute, parent=new_root)
                    d2 = DirNode(name=f"{institute}-{room}", parent=d1)
                    d3 = DirNode(name=f"{yyyy}", parent=d2)
                    d4 = DirNode(name=f"{yyyy}-{mm}", parent=d3)
                    d5 = DirNode(name=f"{yyyy}-{mm}-{dd}", parent=d4)

                FileNode(name=node.name.replace(".avi", ".mp4"), parent=d5, src_path=node.get_path())

    total_size = 0
    for node in PreOrderIter(new_root):
        if type(node) == FileNode:
            dest_path = node.get_path()

            if dest_path.exists():
                continue

            total_size += node.src_path.stat().st_size

    if not dry_run:
        bar_format = "{percentage:.0f}, {remaining_s:.0f}\n" if simplebar else None
        pbar = tqdm(total=total_size, disable=not quiet, unit_scale=True, unit="B", bar_format=bar_format)

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
                logger.info("(skipped) %s", dest_path)
                continue

            if dry_run:
                logger.info(f"zd video preview {src_path} {dest_path})")
            else:
                ret = create_preview(src_path, dest_path, quiet)
                if ret == (signal.SIGINT + 128):
                    break
                if ret != 0:
                    logger.error(f"(failed) {src_path}")
                pbar.update(node.src_path.stat().st_size)

    if not dry_run:
        pbar.close()


def create_preview(src, dest, quiet=False):

    cmd = [
        "-y",
        "-i",
        str(src),
        "-vf",
        "yadif",
        "-pix_fmt",
        "yuv420p",
        "-s",
        "1280x720",
        "-vcodec",
        "libx265",
        "-tag:v",
        "hvc1",
        "-crf",
        "32",
        "-preset",
        "fast",
        str(dest),
    ]

    os.makedirs(Path(dest).parent, exist_ok=True)
    f = open(os.devnull, "w", encoding="utf-8") if quiet else sys.stderr  # pylint: disable=consider-using-with
    with redirect_stderr(f):
        ret = ffpb.main(argv=cmd, stream=f)
    if quiet:
        f.close()

    if ret != 0:
        if Path(dest).exists():
            os.remove(dest)
        if ret == (signal.SIGINT + 128):  # exit on keyboard interrupt
            logger.error(f"(cancel) {src}")
            sys.exit(ExitStatus.failure)

    return ret
