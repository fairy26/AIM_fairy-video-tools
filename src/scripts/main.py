import argparse
import json
import sys
from importlib import resources
from logging import config

import pyudev
from exitstatus import ExitStatus

from eject import eject
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
from reorder import run as reorder


def send(message, file=sys.stdout, prefix=None):
    if prefix:
        message = f"{prefix} {message}"
    print(message, file=file)
    file.flush()


def reload():
    disks = get_located_disks()
    send(get_disk_list(disks), prefix="disk")
    send(get_mountpoint_list(disks), prefix="mountpoint")
    send(get_access_list(disks), prefix="access")


def monitoring():

    context = pyudev.Context()
    monitor = pyudev.Monitor.from_netlink(context)

    try:
        monitor.start()

        for device in iter(monitor.poll, None):
            if device.device_type in {"disk", "partition"}:
                reload()

    except KeyboardInterrupt:
        sys.exit(ExitStatus.success)


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
    parser.add_argument("--eject", action="store_true")
    parser.add_argument("--monitor", action="store_true")
    parser.add_argument("--reorder", action="store_true")
    parser.add_argument("--inst", default=None, type=str)
    parser.add_argument("--room", default=None, type=str)
    parser.add_argument("--precheck", action="store_true")
    parser.add_argument("--make_list", action="store_true")
    parser.add_argument("--nas", action="store_true")
    args = parser.parse_args()

    with resources.path("data", "log_config.json") as log_config:
        with open(log_config, encoding="utf-8") as f:
            conf = json.load(f)
            if args.quiet:
                conf["root"]["level"] = "ERROR"
            config.dictConfig(conf)

    disks = get_located_disks()

    if args.monitor:
        monitoring()

    if args.eject:
        target = search_instance(disks, args.path[0])
        status = eject(target.path)

        if status.startswith("ERROR"):
            send(status, prefix="eject")
        else:
            reload()

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
        reload()

    if args.copycheck:

        src = search_instance(disks, args.path[0])
        dest = search_instance(disks, args.path[1])

        if dest.partition is None:
            send("コピー先のHDDにパーティションがありません。フォーマットしますか？", file=sys.stderr, prefix="ALERT")
        elif not dest.formatted and dest.partition.isblank:
            send("コピー先のHDDがフォーマットされていません。フォーマットしますか？", file=sys.stderr, prefix="ALERT")
        elif not dest.partition.binded:
            send("コピー先の実行権限がありません。マウントし直してください。", file=sys.stderr, prefix="ERROR")
        elif dest.partition.readonly:
            send("コピー先をRWでマウントし直してください。", file=sys.stderr, prefix="ERROR")
        elif not src.partition.readonly:
            send("コピー元をROでマウントし直してください。", file=sys.stderr, prefix="ERROR")
        else:
            send(f"copy", prefix="next")

    if args.copy:
        if len(args.path) != 2:
            sys.exit(ExitStatus.failure)

        src = search_instance(disks, args.path[0])
        dest = search_instance(disks, args.path[1])

        if dest.partition is None or (not dest.formatted and dest.partition.isblank):
            format(hdd_path=dest.path, yes=args.format)
            apply_format(disk=dest)

        if dest.partition is not None and not dest.partition.mounted:
            mount(disk=dest.partition.path, ro=False)
            apply_mount(disk=dest)
            reload()

        diskcopy(
            src=src.get_avail_path(),
            dest=dest.get_avail_path(),
            includes=None,
            excludes=None,
            dry_run=False,
            quiet=True,
            simplebar=True,
        )

        send(f"reorder", prefix="next")

    if args.reorder:
        target = search_instance(disks, args.path[0]).get_avail_path()

        reorder(
            src=target,
            dest=target,
            operation="move",
            new_institution=args.inst,
            new_room=args.room,
            status=None,
            includes=None,
            excludes=None,
            dry_run=True,
            quiet=False,
            simplebar=True,
        )

        send(f"precheck", prefix="next")

    if args.precheck:
        target = search_instance(disks, args.path[0]).get_avail_path()
        send(f"make_list", prefix="next")

    if args.make_list:
        target = search_instance(disks, args.path[0]).get_avail_path()
        send(f"nas", prefix="next")

    if args.nas:
        target = search_instance(disks, args.path[0]).get_avail_path()
        send(f"finish", prefix="next")
