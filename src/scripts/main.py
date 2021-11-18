import json
import sys
from importlib import resources
from pathlib import PurePosixPath
from logging import config

from exitstatus import ExitStatus

from parser import parse
from monitor import monitoring
from eject import eject
from mount import mount
from utils import (
    apply_format,
    apply_mount,
    apply_unmount,
    get_located_disks,
    reload,
    search_instance,
    send,
)
from unmount import unmount
from format import run as format
from diskcopy import run as diskcopy
from reorder import run as reorder
from precheck import run as precheck
from make_list import run as make_list
from nas import run as nas


if __name__ == "__main__":

    # if os.geteuid():
    #   argv = sys.argv + ['--uid']
    #   args = [sys.executable] + argv
    #   os.execlp('sudo', *args)

    args = parse()

    with resources.path("data", "log_config.json") as log_config:
        with open(log_config, encoding="utf-8") as f:
            conf = json.load(f)
            if args.quiet:
                conf["root"]["level"] = "ERROR"
            config.dictConfig(conf)

    disks = get_located_disks()

    if args.monitor:
        monitoring()

    if args.check:
        reload()

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
        target_disk = search_instance(disks, args.path[0])
        target = target_disk.get_avail_path()

        if target is not None:
            unmount(mountpoint=target)
            apply_unmount(disk=target_disk)

        mpath = target_disk.get_avail_path() or "not_mounted"
        send(mpath, prefix="unmount")

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

        if target is not None:
            reorder(
                src=target,
                dest=target,
                operation="move",
                new_institution=args.inst,
                new_room=args.room,
                status=None,
                includes=None,
                excludes=None,
                dry_run=False,
                quiet=True,
                simplebar=True,
            )

        send(f"precheck", prefix="next")

    if args.precheck:
        target = search_instance(disks, args.path[0]).get_avail_path()

        if target is not None:
            precheck(src=target, dest=target, dry_run=False, quiet=True, simplebar=True)

        send(f"make_list", prefix="next")

    if args.make_list:
        target = search_instance(disks, args.path[0]).get_avail_path()

        if target is not None:
            dest = str(PurePosixPath(target).joinpath(args.xlsx))

            make_list(src=target, dest=dest)

        send(f"nas", prefix="next")

    if args.nas:
        target = search_instance(disks, args.path[0]).get_avail_path()

        if target is not None:
            nas(
                src=target,
                dest=".",  # need to change
                config=resources.path("data", "nas_config.json"),  # need to change
                alias="catalog",  # need to change
                bucket="preview",  # need to change
                dry_run=True,
                quiet=False,
                simplebar=True,
            )

        send(f"finish", prefix="next")
