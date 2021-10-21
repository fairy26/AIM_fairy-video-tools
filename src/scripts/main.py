import argparse
from glob import glob
import os
import re
import subprocess
from subprocess import PIPE
import sys
import json
from importlib import resources
from logging import config, getLogger

from check import get_hdd_lists
from mount import mount
from utils import apply_format, apply_mount, get_avail_mountpoint, get_located_disks, search_instance, update_partition
from unmount import unmount
from format import run as format
from diskcopy import run as diskcopy


def send(message, file=sys.stdout):
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
    parser.add_argument("--copy", action="store_true")
    args = parser.parse_args()

    # with resources.path("data", "log_config.json") as log_config:
    with open("src/scripts/log_config.json", encoding="utf-8") as f:
        conf = json.load(f)
        if args.quiet:
            conf["root"]["level"] = "ERROR"
        config.dictConfig(conf)

    if args.mount:
        send("mount")

        status = mount(args.path[0], args.ro)
        send(status)

    if args.unmount:
        send("unmount")

        status = unmount(args.path[0])
        send(status)

    if args.check:
        send("check")

        hdd_list, mounted_list, access_list = get_hdd_lists()
        send(hdd_list)
        send(mounted_list)
        send(access_list)

    if args.copy:
        send("copy")

        if len(args.path) != 2:
            # TODO: inform error to app
            sys.exit(-1)

        disks = get_located_disks()
        src = search_instance(disks, args.path[0])
        dest = search_instance(disks, args.path[1])

        if dest.partition is None or (not dest.formatted and dest.partition.isblank):
            # TODO: ask to format and get stdin from GUI
            format(hdd_path=dest.path, yes=True)
            apply_format(disk=dest)

        if not dest.partition.mounted:
            mount(disk=dest.partition.path, ro=False)
            apply_mount(disk=dest)

        diskcopy(
            src=get_avail_mountpoint(disk=src),
            dest=get_avail_mountpoint(disk=dest),
            includes=None,
            excludes=None,
            dry_run=False,
            quiet=True,
            simplebar=True,
        )
