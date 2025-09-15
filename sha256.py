import hashlib
import os

input_file = "sha256input.txt"
output_file = "sha256output.txt"

if os.path.isfile(input_file):
    if os.path.isfile(output_file):
        with open(input_file, "r", encoding="utf-8") as file:
            with open(output_file, "w", encoding="utf-8") as output:
                line = file.readline()
                while line:
                    text = line.rstrip("\n")
                    hashed_text = hashlib.sha256(text.encode()).hexdigest()
                    print(text)
                    print(hashed_text)
                    line = file.readline()
                    output.write(hashed_text + "\n")

    else:
        print("The output file does not exist. Exit the program.")
        os.system("pause")
else:
    print("The filepath is invalid. Exit the program.")
    os.system("pause")