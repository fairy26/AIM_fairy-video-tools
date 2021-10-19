import os
import re
import subprocess
import sys

from exitstatus import ExitStatus


def _add_permission(cmd):
    cmd.insert(0, "sudo")


def mount(disk, ro=False):
    MAPPING_UID = 1000
    MAPPING_GID = 1000
    uid = gid = str(os.geteuid())

    # TODO: command not found に対処する
    # -> 仮想環境を作成してもできなかった

    authorized = True  # False: add 'sudo' to command
    if os.geteuid():
        # args = [sys.executable] + sys.argv
        # os.execlp('sudo', *args)
        authorized = False

    if not os.path.exists(disk):
        return "not_mounted"

    realpath = os.path.realpath(disk)

    m = re.match(r"/dev/(sd.+)", realpath)
    if not m:
        return "not_mounted"

    device_name = m.group(1)
    raw_disk_mount_path = os.path.join("/mnt", f"raw_{device_name}")
    disk_mount_path = os.path.join("/mnt", f"{device_name}")

    raw_disk_is_mounted = False
    disk_is_mounted = False
    with open("/proc/mounts", "r", encoding="utf-8") as f:
        for raw in f.readlines():
            device_name = raw.split(" ")[0]
            if realpath == device_name:
                raw_disk_is_mounted = True
            if raw_disk_mount_path == device_name:
                disk_is_mounted = True

    if not raw_disk_is_mounted:
        # os.makedirs(raw_disk_mount_path, exist_ok=True)
        cmd_mkdir = ["mkdir", "-p", raw_disk_mount_path]
        if not authorized:
            _add_permission(cmd_mkdir)
        subprocess.run(cmd_mkdir)

        cmd = ["mount"]
        if not authorized:
            _add_permission(cmd)
        if ro:
            cmd.extend(["-o", "ro"])
        cmd.extend([realpath, raw_disk_mount_path])
        try:
            subprocess.run(cmd, check=True)
        except subprocess.CalledProcessError as e:
            if os.path.exists(raw_disk_mount_path):
                cmd_rmdir = ["rmdir", raw_disk_mount_path]
                if not authorized:
                    _add_permission(cmd_rmdir)
                subprocess.run(cmd_rmdir)
            sys.exit(ExitStatus.failure)

    if not disk_is_mounted:
        # os.makedirs(disk_mount_path, exist_ok=True)
        cmd_mkdir = ["mkdir", "-p", disk_mount_path]
        if not authorized:
            _add_permission(cmd_mkdir)
        subprocess.run(cmd_mkdir)

        cmd = [
            "bindfs",
            "-u",
            str(uid),
            "-g",
            str(gid),
            f"--map={MAPPING_UID}/{uid}:@{MAPPING_GID}/@{gid}",
            raw_disk_mount_path,
            disk_mount_path,
        ]
        if not authorized:
            _add_permission(cmd)
        try:
            subprocess.run(cmd, check=True)
        except subprocess.CalledProcessError as e:
            if os.path.exists(disk_mount_path):
                cmd_rmdir = ["rmdir", disk_mount_path]
                if not authorized:
                    _add_permission(cmd_rmdir)
                subprocess.run(cmd_rmdir)
            sys.exit(ExitStatus.failure)

    return disk_mount_path
