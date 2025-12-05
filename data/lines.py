import json

with open("data/system.txt", "r") as f:
    system = f.read()

lines = system.split("\n")

with open("data/user-study-system-prompt.json", "w") as f:
  json.dump({"lines": lines}, f, indent=2)