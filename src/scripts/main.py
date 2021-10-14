import argparse
import sys

from check import get_hdd_lists
from mount import mount
from unmount import unmount
# from copy import copy


def send(message, file=sys.stdout):
    print(message, file=file)
    file.flush()


if __name__ == '__main__':

  # if os.geteuid():
  #   argv = sys.argv + ['--uid']
  #   args = [sys.executable] + argv
  #   os.execlp('sudo', *args)

  parser = argparse.ArgumentParser()
  parser.add_argument('--path', default=None, action="extend", nargs="+", type=str)
  parser.add_argument('--mount', action='store_true')
  parser.add_argument('--ro', '--read-only', action='store_true')
  parser.add_argument('--unmount', action='store_true')
  parser.add_argument('--check', action='store_true')
  parser.add_argument('--copy', action='store_true')
  args = parser.parse_args()

  if args.mount:
    send('mount')

    status = mount(args.path[0], args.ro)
    send(status)

  if args.unmount:
    send('unmount')

    status = unmount(args.path[0])
    send(status)

  if args.check:
    send('check')

    hdd_list, mounted_list, access_list = get_hdd_lists()
    send(hdd_list)
    send(mounted_list)
    send(access_list)

  if args.copy:
    send("copy")

    # copy() を実行

    # 以下, 簡単なpbar表示
    from time import sleep
    from tqdm import tqdm

    sec = range(40)
    bar_format = '{percentage:.0f}, {remaining}\n'
    with tqdm(total=len(sec), bar_format=bar_format, leave=None) as pbar:
      for i in sec:
        pbar.update(1)
        sleep(0.2)
