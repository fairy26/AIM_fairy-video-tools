import argparse
import sys
import json
from importlib import resources
from logging import config, getLogger

from check import get_hdd_lists
from mount import mount
from unmount import unmount
from copy import run


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

        run(src=args.path[0], dest=args.path[1], includes=None, excludes=None, dry_run=False, quiet=True, simplebar=True)

        # 以下, 簡単なpbar表示
        # from time import sleep
        # from tqdm import tqdm

        # sec = range(40)
        # bar_format = "{percentage:.0f}, {remaining}\n"
        # with tqdm(total=len(sec), bar_format=bar_format, leave=None) as pbar:
        #     for i in sec:
        #         pbar.update(1)
        #         sleep(0.2)
