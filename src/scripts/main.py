import argparse
import glob
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
from unmount import unmount
from format import run as format
from copy import run as diskcopy


def send(message, file=sys.stdout):
    print(message, file=file)
    file.flush()


def is_formatted(disk):
    """check partition anf S/N labeling"""
    is_formatted = False

    cmd = ["lsblk", "-nro", "PATH,FSTYPE,LABEL"]  # $ lsblk --noheadings --raw --output PATH,FSTYPE,LABEL
    cp = subprocess.run(cmd, stdout=PIPE, check=True)
    details = cp.stdout.decode()

    SERIAL_PTN = re.compile("_(?P<SER>(\w)+)-part1")
    serial = None

    with os.scandir("/dev/disk/by-id") as it:
        for entry in it:
            if entry.is_symlink():
                entry_realpath = os.path.realpath(entry.path)
            else:
                continue

            if disk in entry_realpath:
                results = SERIAL_PTN.search(entry.name)
                if results:  # if True: partition is already created
                    serial = results["SER"]
                    is_formatted = f"{entry_realpath} ext4 {serial}" in details  # if True: disk is labeled with S/N

    return is_formatted


def is_blank(disk):
    """check .avi files in disk"""
    has_avifile = glob(f"{disk}/**/*.avi", recursive=True)

    return not has_avifile


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

        src = args.path[0]
        dest = args.path[1]

        if is_formatted(dest) and is_blank(dest):
            pass
        else:
            # TODO: ask to format and get stdin from GUI
            partition_name = format(hdd_path=dest, yes=True)
            mountpoint = mount(disk=partition_name, ro=False)
            dest = mountpoint

        diskcopy(
            src=src,
            dest=dest,
            includes=None,
            excludes=None,
            dry_run=False,
            quiet=True,
            simplebar=True,
        )
