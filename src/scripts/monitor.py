import sys

import pyudev
from exitstatus import ExitStatus

from utils import reload


def monitoring():

    context = pyudev.Context()
    monitor = pyudev.Monitor.from_netlink(context)

    try:
        monitor.start()

        for device in iter(monitor.poll, None):
            if device.device_type in {"disk", "partition"}:
                reload()

    except KeyboardInterrupt:
        sys.exit(ExitStatus.success)
