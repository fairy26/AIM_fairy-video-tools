import os
import re


PORT = {
    "right": [
        "3.2.1",
        "3.2.2",
        "3.2.3",
        "3.2.4",
        "3.3",
        "3.4",
        "3.1.1",
        "3.1.2",
        "3.1.3",
        "3.1.4",
    ],
    "left": [
        "4.2.1",
        "4.2.2",
        "4.2.3",
        "4.2.4",
        "4.3",
        "4.4",
        "4.1.1",
        "4.1.2",
        "4.1.3",
        "4.1.4",
    ],
}


def get_hdd_lists():
    disks = ["empty"] * 10
    mountpoints = disks[:]
    accesses = disks[:]

    connected_ports = _get_connected_portlist()

    for portlist in PORT.values():
        for index, port in enumerate(portlist):
            if port in connected_ports:
                sym_path = (
                    f"/dev/disk/by-path/pci-0000:00:14.0-usb-0:{port}:1.0-scsi-0:0:0:0"
                )
                sym_partition_path = sym_path + "-part1"

                if os.path.exists(sym_partition_path):
                    disks[index] = os.path.realpath(sym_partition_path)
                else:
                    disks[index] = os.path.realpath(sym_path)

                mountpoints[index], accesses[index] = _get_mountpoint_access(
                    disks[index]
                )

    return disks, mountpoints, accesses


def _get_connected_portlist():
    connected_ports = []
    with os.scandir("/sys/bus/usb/devices/") as it:
        pattern = re.compile("\d-(?P<PORT>(\d\.*)+):1\.0")
        for entry in it:
            results = pattern.search(entry.name)
            if results:
                connected_ports.append(results["PORT"])
    return connected_ports


def _get_mountpoint_access(target: str = None) -> list:
    mounted = False
    access = "rw"
    with open("/proc/mounts", "r", encoding="utf-8") as f:
        for raw in f.readlines():
            out = raw.split(" ")
            device_name = out[0]
            mountpoint = out[1]
            details = out[3]
            if target == device_name:
                mounted = True
                target = mountpoint
                if details.startswith("ro"):
                    access = "ro"

    if mounted:
        return target, access
    else:
        return "not_mounted", "not_mounted"
