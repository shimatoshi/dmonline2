# Termux bionic DNS fallback: socket.getaddrinfo が失敗したら dig @1.1.1.1 で再試行
import socket, subprocess

_orig_getaddrinfo = socket.getaddrinfo
def _patched_getaddrinfo(host, port, *a, **kw):
    try:
        return _orig_getaddrinfo(host, port, *a, **kw)
    except socket.gaierror:
        pass
    try:
        out = subprocess.check_output(
            ["dig", "+short", "+time=3", "+tries=2", "@1.1.1.1", host, "A"],
            timeout=8, text=True
        )
        ips = [l.strip() for l in out.splitlines() if l.strip() and not l.endswith(".")]
        if not ips:
            raise socket.gaierror(f"dig returned no A for {host}")
        return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", (ips[0], int(port or 0)))]
    except Exception as e:
        raise socket.gaierror(f"dig fallback failed for {host}: {e}")

socket.getaddrinfo = _patched_getaddrinfo
