#!/usr/bin/env python3
"""Run a command in a PTY and forward bytes from stdin and a control FIFO."""

import fcntl
import os
import pty
import select
import signal
import struct
import sys
import termios
import tty


def copy_window_size(source: int, target: int) -> None:
    try:
        size = fcntl.ioctl(source, termios.TIOCGWINSZ, b"\0" * 8)
        fcntl.ioctl(target, termios.TIOCSWINSZ, size)
    except OSError:
        fcntl.ioctl(target, termios.TIOCSWINSZ, struct.pack("HHHH", 40, 120, 0, 0))


def main() -> int:
    if len(sys.argv) < 2:
        print(f"usage: {sys.argv[0]} COMMAND [ARG ...]", file=sys.stderr)
        return 2
    fifo_path = os.environ["QNI_PTY_CONTROL_FIFO"]
    os.mkfifo(fifo_path, 0o600)

    child_pid, master = pty.fork()
    if child_pid == 0:
        os.execvp(sys.argv[1], sys.argv[1:])

    control = os.open(fifo_path, os.O_RDWR | os.O_NONBLOCK)
    previous = termios.tcgetattr(sys.stdin.fileno())
    tty.setraw(sys.stdin.fileno())
    copy_window_size(sys.stdin.fileno(), master)
    signal.signal(signal.SIGWINCH, lambda _signum, _frame: copy_window_size(sys.stdin.fileno(), master))

    try:
        while True:
            readable, _, _ = select.select([sys.stdin.fileno(), master, control], [], [])
            if master in readable:
                try:
                    data = os.read(master, 65536)
                except OSError:
                    break
                if not data:
                    break
                os.write(sys.stdout.fileno(), data)
            if sys.stdin.fileno() in readable:
                data = os.read(sys.stdin.fileno(), 65536)
                if not data:
                    break
                os.write(master, data)
            if control in readable:
                data = os.read(control, 65536)
                if data:
                    os.write(master, data)
    finally:
        termios.tcsetattr(sys.stdin.fileno(), termios.TCSADRAIN, previous)
        os.close(control)
        os.close(master)
        try:
            os.kill(child_pid, signal.SIGTERM)
        except ProcessLookupError:
            pass
        try:
            os.unlink(fifo_path)
        except FileNotFoundError:
            pass
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
