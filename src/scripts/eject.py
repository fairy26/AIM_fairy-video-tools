import subprocess


def eject(disk_path: str) -> str:

    cmd = ["udisksctl", "power-off", "--block-device", disk_path]
    try:
        subprocess.run(cmd, check=True)
    except subprocess.CalledProcessError as e:
        return f"ERROR The drive in use: Device {disk_path} is mounted."
    else:
        return "done"
