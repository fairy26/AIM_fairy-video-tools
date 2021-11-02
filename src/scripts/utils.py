from dataclasses import asdict, dataclass
import dataclasses
from enum import Enum
from glob import glob
import json
import os
import re
import subprocess
from subprocess import PIPE
from typing import List, Optional


# NOTE: version 3.10: "Optional[str]" can be written as "str | None"


class FSType(str, Enum):
    EXT4 = "ext4"
    EXFAT = "exfat"
    FUSE = "fuse"


@dataclass
class Partition:
    # partnum: int
    path: Optional[str] = None  # /dev/sda1
    mountpoint: Optional[str] = None  # /mnt/raw_sda1 (only if mounted == True)
    mounted: bool = False  # True
    label: Optional[str] = None  # WSD31X5D | None
    fstype: Optional[FSType] = None  # ext4
    binded: bool = False  # True
    bindedmountpoint: Optional[str] = None  # /mnt/sda1 (only if binded == True and mountpoint.startswith("/mnt/raw_"))
    readonly: bool = False  # True (False means read-write)
    isblank: bool = False  # True (wether contain .avi file)


@dataclass
class Disk:
    path: Optional[str] = None  # /dev/sda (/dev/*)
    position: Optional[int] = None  # 2 (1~10)
    port: Optional[float] = None  # 2.1.2 (listed)
    serial: Optional[str] = None  # WSD31X5D
    formatted: bool = False  # True
    partition: Optional[Partition] = None

    def get_avail_path(self) -> Optional[str]:
        if self.partition is None or not self.partition.mounted:
            return None

        if self.partition.binded:
            return self.partition.bindedmountpoint
        else:
            return self.partition.mountpoint

    def get_partition_path(self) -> Optional[str]:
        if self.partition is None:
            return None
        else:
            return self.partition.path


def check_blank(mountpoint: str) -> bool:
    """return wether the disk has .avi files"""
    avifiles = glob(f"{mountpoint}/**/*.avi", recursive=True)

    return avifiles == []


def lsblk_to_dict() -> Optional[List[dict]]:
    """run `$ lsblk` and return device information"""
    cmd = ["lsblk", "-e", "7,259", "-Jo", "PATH,SERIAL,MOUNTPOINT,LABEL,FSTYPE"]
    cp = subprocess.run(cmd, stdout=PIPE, check=True)
    lsblk_output = cp.stdout.decode()
    if lsblk_output == "":
        return None
    else:
        return json.loads(lsblk_output)["blockdevices"]


def proc_mounts() -> List[str]:
    with open("/proc/mounts", "r", encoding="utf-8") as f:
        return f.readlines()


def check_mounts(disk: Optional[Disk]) -> Optional[Disk]:
    if disk is None:
        return None

    for line in proc_mounts():
        fields = line.split(" ")
        path = fields[0]
        mountpoint = fields[1]
        fstype = fields[2]
        flags = fields[3]
        ro = flags.startswith("ro")

        if disk.path in path:
            if disk.partition is None:
                disk.partition = Partition(path=path, mountpoint=mountpoint, mounted=True, fstype=fstype, readonly=ro)
            else:
                if disk.partition.path != path:
                    continue
                disk.partition.path = path
                disk.partition.mountpoint = mountpoint
                disk.partition.mounted = True
                disk.partition.fstype = fstype
                disk.partition.readonly = ro
        elif (
            disk.partition is not None and disk.partition.mountpoint is not None and disk.partition.mountpoint == path
        ):
            disk.partition.bindedmountpoint = mountpoint
            disk.partition.binded = True

    return disk


def update_partition(disk: Optional[Disk], device: dict) -> bool:
    if disk is None:
        return False

    if device["serial"] is None and disk.path in device["path"]:
        # true: this {device} is a partition of {disk}
        if disk.partition is None:
            disk.partition = Partition(
                path=device["path"],
                mountpoint=device["mountpoint"],
                mounted=device["mountpoint"] != None,
                label=device["label"],
                fstype=device["fstype"],
            )

        else:
            if disk.partition.path != device["path"]:
                return False
            disk.partition.path = device["path"]
            disk.partition.mountpoint = device["mountpoint"]
            disk.partition.mounted = device["mountpoint"] != None
            disk.partition.fstype = device["fstype"]
            disk.partition.label = device["label"]

        disk.formatted = (
            disk.serial is not None and disk.serial == disk.partition.label and disk.partition.fstype == FSType.EXT4
        )

        if disk.partition.mounted:
            disk.partition.isblank = check_blank(disk.partition.mountpoint)

        return True
    else:
        return False


def get_details(disks: List[Optional[Disk]]) -> List[Optional[Disk]]:

    # check wether disk is formatted and is blank
    lsblk_dict_list = lsblk_to_dict()
    if lsblk_dict_list is None:
        return disks

    for device in lsblk_dict_list:
        if device["serial"] is not None:
            for disk in disks:
                if disk is None:
                    continue
                if disk.path == device["path"]:
                    disk.serial = device["serial"]
                    break
        else:
            for disk in disks:
                if disk is None:
                    continue

                done = update_partition(disk, device)
                if done:
                    break

    # check wether disk is readonly and disk's bindedmountpoint
    for disk in disks:
        if disk is None:
            continue

        disk = check_mounts(disk)

    return disks


def get_located_disks() -> List[Optional[Disk]]:
    """construct disks"""

    PORT = ["2\.1", "2\.2", "2\.3", "2\.4", "3", "4", "1\.1", "1\.2", "1\.3", "1\.4"]

    disks: List[Optional[Disk]] = [None] * 10

    with os.scandir("/dev/disk/by-path") as it:
        for entry in it:
            entry_path = os.path.realpath(entry.path)
            for i, port in enumerate(PORT):
                m = re.search(f":\d\.{port}:", entry.name)
                if m:
                    if disks[i] is None:
                        disks[i] = Disk(position=i + 1, port=m.group(0))

                    if entry.name.endswith("-part1"):
                        if disks[i].partition is None:
                            disks[i].partition = Partition(path=entry_path)
                        else:
                            disks[i].partition.path = entry_path
                    else:
                        disks[i].path = entry_path

                    break

    disks = get_details(disks)

    return disks


def get_disk_list(disks: List[Optional[Disk]]) -> List[str]:
    disk_list = ["empty"] * len(disks)

    for i, disk in enumerate(disks):
        if disk is not None:
            disk_list[i] = disk.path

    return disk_list


def get_partition_list(disks: List[Optional[Disk]]) -> List[str]:
    partition_list = ["empty"] * len(disks)

    for i, disk in enumerate(disks):
        if disk is not None:
            if disk.partition is not None:
                partition_list[i] = disk.partition.path

    return partition_list


def get_mountpoint_list(disks: List[Optional[Disk]]) -> List[str]:
    mountpoint_list = ["empty"] * len(disks)

    for i, disk in enumerate(disks):
        if disk is not None:
            if disk.partition is not None and disk.partition.mounted:
                if disk.partition.binded:
                    mountpoint_list[i] = disk.partition.bindedmountpoint
                else:
                    mountpoint_list[i] = disk.partition.mountpoint
            else:
                mountpoint_list[i] = "not_mounted"

    return mountpoint_list


def get_access_list(disks: List[Optional[Disk]]) -> List[str]:
    access_list = ["empty"] * len(disks)

    for i, disk in enumerate(disks):
        if disk is not None:
            if disk.partition is not None and disk.partition.mounted:
                if disk.partition.readonly:
                    access_list[i] = "ro"
                else:
                    access_list[i] = "rw"
            else:
                access_list[i] = "not_mounted"

    return access_list


def get_disk_path(
    disks: List[Optional[Disk]],
    partition_path: Optional[str] = None,
    mountpoint: Optional[str] = None,
) -> Optional[str]:
    target = partition_path or mountpoint

    if target is None:
        return None
    elif not os.path.exists(target):
        return None

    for disk in disks:
        if disk is not None and disk.partition is not None:
            if disk.partition.path == target:
                return disk.path
            elif disk.partition.mounted:
                if disk.partition.mountpoint == target:
                    return disk.path
                elif disk.partition.bindedmountpoint == target:
                    return disk.path


def search_instance(disks: List[Optional[Disk]], target: str) -> Disk:
    for disk in disks:
        if disk is None:
            continue
        elif disk.path == target:
            return disk

        if disk.partition is not None:
            if (
                disk.partition.path == target
                or disk.partition.mountpoint == target
                or disk.partition.bindedmountpoint == target
            ):
                return disk


def apply_format(disk: Optional[Disk]):
    if disk is None:
        return

    lsblk_dict_list = lsblk_to_dict()
    if lsblk_dict_list is None:
        return

    for device in lsblk_dict_list:
        done = update_partition(disk, device)
        if done:
            return


def apply_mount(disk: Optional[Disk]):
    if disk is None:
        return

    disk = check_mounts(disk)


if __name__ == "__main__":
    from pprint import pprint

    disks = get_located_disks()
    for disk in disks:
        if dataclasses.is_dataclass(disk):
            pprint(asdict(disk))

    print(get_disk_list(disks))
    print(get_partition_list(disks))
    print(get_mountpoint_list(disks))
    print(get_access_list(disks))
