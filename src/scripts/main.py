import argparse
import sys
import json
from importlib import resources
from logging import config, getLogger

from mount import mount
from utils import (
    apply_format,
    apply_mount,
    get_access_list,
    get_disk_list,
    get_located_disks,
    get_mountpoint_list,
    search_instance,
)
from unmount import unmount
from format import run as format
from diskcopy import run as diskcopy


def send(message, file=sys.stdout, prefix=None):
    if prefix:
        message = f"{prefix} {message}"
    print(message, file=file)
    file.flush()


if __name__ == "__main__":

    # if os.geteuid():
    #   argv = sys.argv + ['--uid']
    #   args = [sys.executable] + argv
    #   os.execlp('sudo', *args)

    parser = argparse.ArgumentParser()
    parser.add_argument("--quiet", default=False, action=argparse.BooleanOptionalAction, help="quiet mode")
    parser.add_argument("--path", default=None, action="extend", nargs="+", type=str)
    parser.add_argument("--mount", action="store_true")
    parser.add_argument("--ro", "--read-only", action="store_true")
    parser.add_argument("--unmount", action="store_true")
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--copycheck", action="store_true")
    parser.add_argument("--copy", action="store_true")
    parser.add_argument("--format", action="store_true")
    args = parser.parse_args()

    # with resources.path("data", "log_config.json") as log_config:
    #     with open(log_config, encoding="utf-8") as f:
    #         conf = json.load(f)
    #         if args.quiet:
    #             conf["root"]["level"] = "ERROR"
    #         config.dictConfig(conf)
    # with open("src/scripts/data/log_config.json", encoding="utf-8") as f:
    #     conf = json.load(f)
    #     if args.quiet:
    #         conf["root"]["level"] = "ERROR"
    #     config.dictConfig(conf)

    disks = get_located_disks()

    if args.mount:
        target = search_instance(disks, args.path[0])

        if target.partition is not None and not target.partition.mounted:
            mount(disk=target.partition.path, ro=args.ro)
            apply_mount(disk=target)

        mpath = target.get_avail_path() or "not_mounted"
        send(mpath, prefix="mount")

    if args.unmount:
        status = unmount(args.path[0])
        send(status, prefix="unmount")

    if args.check:
        send(get_disk_list(disks), prefix="disk")
        send(get_mountpoint_list(disks), prefix="mountpoint")
        send(get_access_list(disks), prefix="access")

    if args.copycheck:

        src = search_instance(disks, args.path[0])
        dest = search_instance(disks, args.path[1])

        if dest.partition is None:
            send("コピー先のHDDにパーティションがありません。フォーマットしますか？", file=sys.stderr, prefix="ALERT")
        elif not dest.formatted and dest.partition.isblank:
            send("コピー先のHDDがフォーマットされていません。フォーマットしますか？", file=sys.stderr, prefix="ALERT")
        else:
            send(f"{args.path[0]} {args.path[1]}", file=sys.stderr, prefix="OK")

    if args.copy:
        if len(args.path) != 2:
            # TODO: inform error to app
            sys.exit(-1)

        src = search_instance(disks, args.path[0])
        dest = search_instance(disks, args.path[1])

        if dest.partition is None or (not dest.formatted and dest.partition.isblank):
            format(hdd_path=dest.path, yes=args.format)
            apply_format(disk=dest)

        if dest.partition is not None and not dest.partition.mounted:
            mount(disk=dest.partition.path, ro=False)
            apply_mount(disk=dest)

        diskcopy(
            src=src.get_avail_path(),
            dest=dest.get_avail_path(),
            includes=None,
            excludes=None,
            dry_run=False,
            quiet=True,
            simplebar=True,
        )

        send("copy", file=sys.stderr, prefix="COMPLETED")
