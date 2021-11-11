import os
import subprocess
import sys

from exitstatus import ExitStatus


def _add_permission(cmd):
    cmd.insert(0, "sudo")


def unmount(disk):

    authorized = True  # False: add 'sudo' to command
    if os.geteuid():
        # args = [sys.executable] + sys.argv
        # os.execlp('sudo', *args)
        authorized = False

    if not os.path.exists(disk):
        sys.exit(-1)

    realpath = os.path.realpath(disk)

    target = realpath
    with open("/proc/mounts", "r", encoding="utf-8") as f:
        for raw in reversed(f.readlines()):
            out = raw.split(" ")
            device_name = out[0]
            mountpoint = out[1]
            if target == mountpoint:
                cmd = ["umount", target]
                if not authorized:
                    _add_permission(cmd)
                try:
                    subprocess.run(cmd, check=True)
                except subprocess.CalledProcessError as e:
                    if e.returncode == 32:
                        return "ERROR target is busy."
                    sys.exit(ExitStatus.failure)
                if os.path.exists(target):
                    # os.rmdir(target)
                    cmd_rmdir = ["rmdir", target]
                    if not authorized:
                        _add_permission(cmd_rmdir)
                    subprocess.run(cmd_rmdir)
                target = device_name

    return "not_mounted"
