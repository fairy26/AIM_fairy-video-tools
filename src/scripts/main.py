import argparse
import sys

from check import get_hdd_lists
from mount import mount
from unmount import unmount


def send(message):
  print(message)
  sys.stdout.flush()


if __name__ == '__main__':
  
  # if os.geteuid():
  #   argv = sys.argv + ['--uid']
  #   args = [sys.executable] + argv
  #   os.execlp('sudo', *args)
  
  parser = argparse.ArgumentParser()
  parser.add_argument('--path', default=None, type=str)
  parser.add_argument('--mount', action='store_true')
  parser.add_argument('--ro', '--read-only', action='store_true')
  parser.add_argument('--unmount', action='store_true')
  parser.add_argument('--check', action='store_true')
  args = parser.parse_args()
  
  if args.mount:
    send('mount')

    status = mount(args.path, args.ro)
    send(status)
  
  if args.unmount:
    send('unmount')

    status = unmount(args.path)
    send(status)
  
  if args.check:
    send('check')

    hdd_list, mounted_list = get_hdd_lists()
    send(hdd_list)
    send(mounted_list)
