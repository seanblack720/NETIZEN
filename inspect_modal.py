import pathlib
p = pathlib.Path(r"c:\Users\LENOVO\Desktop\two\soundz\ALL STARS\neeteezzz\march-people-s-app-main\components\netizen\post-detail-modal.tsx")
t = p.read_text(encoding="utf-8")
idx = t.find("Reshare indicator")
print(repr(t[idx-200:idx+2500]))
