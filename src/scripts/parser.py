import argparse


def parse() -> argparse.Namespace:
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
    parser.add_argument("--xlsx", default=None, type=str)
    parser.add_argument("--nas", action="store_true")
    parser.add_argument("--dest", default=None, type=str)

    return parser.parse_args()
