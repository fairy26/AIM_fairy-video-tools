from logging import getLogger
import os
import re
import subprocess
from subprocess import PIPE
import sys

from exitstatus import ExitStatus

logger = getLogger(__name__)


def _add_permission(cmd):
    cmd.insert(0, "sudo")


def run(hdd_path, yes):
    """Format 1 partition of the specified HDD with ext4."""

    # if os.geteuid():
    #     args = [sys.executable] + sys.argv
    #     os.execlp("sudo", *args)

    if not yes:
        choice = input("Proceed to format disk [y/N]: ")
        if choice not in ["y", "Y", "yes"]:
            sys.exit(ExitStatus.failure)

    DEFAULT_PARTNUM = "1"
    DEFAULT_FSYS = "ext4"

    cmds = [["sgdisk", "--zap-all"], ["sgdisk", "-n"], ["hdparm", "-I"], ["mkfs", "-F", "-L"]]

    if os.geteuid():
        for cmd in cmds:
            _add_permission(cmd)

    if not os.path.exists(hdd_path):
        # TODO: inform error to app
        logger.error("Unable to access the input HDD.")
        sys.exit(ExitStatus.failure)

    cmds[0].extend([hdd_path])
    subprocess.run(cmds[0], check=True)  # e.g. ['sgdisk', '--zap-all', '/dev/sda']
    # TODO: if subprocess.CalledProcessError, run `umount` and `partprobe`

    cmds[1].extend([f"{DEFAULT_PARTNUM}::", hdd_path])
    subprocess.run(cmds[1], check=True)  # e.g. ['sgdisk', '-n', '1::', '/dev/sda']

    cmds[2].append(hdd_path)
    cp2 = subprocess.run(cmds[2], stdout=PIPE, check=True)  # e.g. ['hdparm', '-I', '/dev/sda']
    hdd_serial = get_serial_num(cp2.stdout.decode())

    hdd_path_part = hdd_path + DEFAULT_PARTNUM
    cmds[3][0] = f"{cmds[3][0]}.{DEFAULT_FSYS}"  # 'mkfs.' -> 'mkfs.ext4'
    cmds[3].extend([hdd_serial, hdd_path_part])
    subprocess.run(cmds[3], check=True)  # e.g. ['mkfs.ext4', '-F', '-L', 'S/N', '/dev/sda1']

    return hdd_path_part


def get_serial_num(ctx):
    """Get a serial number"""
    SERIAL_PAT = "Serial Number"
    context = ctx
    pattern = rf"{SERIAL_PAT}.\s+(?P<SER>.*?)\s"
    re_pat = re.compile(pattern)
    match = re_pat.search(context)

    if not match:
        # TODO: inform error to app
        logger.error("Serial number not found.")
        sys.exit(ExitStatus.failure)

    return match["SER"]
