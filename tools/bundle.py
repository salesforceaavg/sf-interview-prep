"""Bundle the site into one self-contained HTML file (no sign-in), e.g. for a quick
preview or to share as a single file. Usage: python tools/bundle.py out.html"""
import re, sys, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
html = (root / "index.html").read_text(encoding="utf-8")
out = sys.argv[1] if len(sys.argv) > 1 else str(root / "bundle.html")

head = re.search(r"<head>(.*?)</head>", html, re.S).group(1)
body = re.search(r"<body>(.*?)</body>", html, re.S).group(1)

title = re.search(r"<title>.*?</title>", head, re.S).group(0)
fonts = re.search(r'<link rel="stylesheet" href="https://fonts[^>]+>', head).group(0)
css = (root / "assets/styles.css").read_text(encoding="utf-8")
# the publishing skeleton pads :root for safe areas, so drop our own html padding rule
css = css.replace("html{padding-top:env(safe-area-inset-top,0px)}\n", "")

def inline(m):
    src = m.group(1)
    if src.startswith("http") or src == "assets/config.js":
        return ""
    js = (root / src).read_text(encoding="utf-8").replace("</script", "<\\/script")
    return "<script>\n" + js + "\n</script>"

body = re.sub(r"<!--.*?-->", "", body, flags=re.S)
body = re.sub(r'\s*<a href="admin.html"[^>]*>Admin</a>', "", body)   # no admin page in a single-file bundle
body = re.sub(r'<script src="([^"]+)"></script>', inline, body)
body = body.replace("<script>", "<script>window.SF_CONFIG={};</script>\n<script>", 1)

page = "\n".join([title, '<meta name="claude:viewport-fit-sides" content="cover">', fonts,
                  "<style>\n" + css + "\n</style>", body])
pathlib.Path(out).write_text(page, encoding="utf-8")
print("wrote", out, round(len(page) / 1024), "KB")
