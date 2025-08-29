import hashlib
import os

if os.path.isfile("sha256list.txt"):
    with open("sha256list.txt", "r", encoding="utf-8") as file:
        line = file.readline()
        while line:
            text = line.rstrip("\n")
            print(text)
            print(hashlib.sha256(text.encode()).hexdigest())
            line = file.readline()

else:
    print("The filepath is invalid. Exit the program.")
    os.system("pause")