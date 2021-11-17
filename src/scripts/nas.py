import boto3
import json
import os
import re
import sys
from logging import getLogger
from pathlib import Path

from anytree import PreOrderIter, Resolver
from exitstatus import ExitStatus
from tqdm import tqdm

from libs.dirtree import DirNode, FileNode, RootNode, get_dirtree

logger = getLogger(__name__)


def run(src, dest, config, alias, bucket, dry_run=False, quiet=False, simplebar=False):

    if not os.path.exists(src):
        logger.error('directory "%s" does not exist', src)
        sys.exit(ExitStatus.failure)

    if not os.path.exists(config):
        logger.error('file "%s" does not exist', config)
        sys.exit(ExitStatus.failure)

    src_dirtree = get_dirtree(src)

    nas(src_dirtree, dest, config, alias, bucket, dry_run, quiet, simplebar)

    # sys.exit(ExitStatus.success)


def nas(src_dirtree, dest, config, alias, bucket, dry_run=False, quiet=False, simplebar=False):

    with open(config, "r") as f:
        config_json = json.load(f)

    s3 = boto3.client(
        "s3",
        endpoint_url=config_json["aliases"][alias]["url"],
        aws_access_key_id=config_json["aliases"][alias]["accessKey"],
        aws_secret_access_key=config_json["aliases"][alias]["secretKey"],
        aws_session_token=config_json["aliases"][alias]["sessionToken"],
    )

    DIR = Path(dest).resolve()
    PARENT = DIR.parent

    resolver = Resolver("name")

    new_root = RootNode(name=DIR.name, rootpath=PARENT)

    for node in PreOrderIter(src_dirtree):
        if type(node) == FileNode:
            m = re.match(
                r".*/([^.-]+)/([^.-]+)-([^-]+)/([0-9]{4})/([0-9]{4})-([0-9]{2})/([0-9]{4})-([0-9]{2})-([0-9]{2})/([^.-]+)-([^-]+)-([0-9]{8})-([0-9]{6})\.?.*\.zstd\.mp4$",
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

                FileNode(name=node.name, parent=d5, src_path=node.get_path())

    total_size = 0
    for node in PreOrderIter(new_root):
        if type(node) == FileNode:
            dest_path = node.get_relpath()

            object_list = s3.list_objects(Bucket=bucket, Prefix=str(dest_path))
            if "Contents" in object_list:
                continue

            total_size += node.src_path.stat().st_size

    if not dry_run:
        bar_format = "{percentage:.0f}, {remaining_s:.0f}\n" if simplebar else None
        pbar = tqdm(total=total_size, disable=quiet, unit_scale=True, unit="B", bar_format=bar_format)

    for node in PreOrderIter(new_root):
        if type(node) == FileNode:
            src_path = node.src_path
            dest_path = node.get_relpath()
            object_list = s3.list_objects(Bucket=bucket, Prefix=str(dest_path))
            if "Contents" in object_list:
                logger.info("(skipped) %s", dest_path)
                continue

            if dry_run:
                logger.info(f"s3.upload_file({src_path}, {bucket}, {dest_path})")
            else:
                s3.upload_file(str(src_path), bucket, str(dest_path))
                pbar.update(node.src_path.stat().st_size)

    if not dry_run:
        pbar.close()
