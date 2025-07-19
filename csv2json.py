import csv
import os
import json

print("CSV to JSON converter for 2025 shiori")
print("Copyright 2025 Shota-Sunada, All rights reserved.")
print("Cooperation: Shudo Physics Club")

path = input("Input the filepath of the file which you want to convert (Relative or Absolute): ")

def parse_value(val):
    val = val.strip()
    if val == "":
        return ""
    try:
        return int(val)
    except ValueError:
        return val

if (os.path.isfile(path)):
    if (path.endswith(".csv")):
        if (os.path.isfile("output.json")):
            print("The output file is already exists. Overwrite the file.")

        with open("output.json", "w", encoding="utf-8") as output:
            with open(path, encoding="utf-8") as f:
                reader = csv.DictReader(f)
                data = []
                for row in reader:
                    parsed_row = {k: parse_value(v) for k, v in row.items()}
                    data.append(parsed_row)
                json.dump(data, output, ensure_ascii=False, indent=2, separators=(',', ': '))
    else:
        print("The file is not a csv file. Exit the program.")
        os.system("pause")
else:
    print("The filepath is invalid. Exit the program.")
    os.system("pause")

print("Completed!")
