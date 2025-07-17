import csv
import os
import pprint
import json

print("CSV to JSON converter for 2025 shiori")
print("Copyright 2025 Shota-Sunada, All rights reserved.")
print("Cooperation: Shudo Physics Club")

path = input("Input the filepath of the file which you want to convert (Relative or Absolute): ")

if (os.path.isfile(path)):
    if (path.endswith(".csv")):
        if (os.path.isfile("output.json")):
            print("The output file is already exists. Overwrite the file.")

        output = open("output.json", "w", encoding="utf-8")
        with open(path, encoding="utf-8") as f:
            reader = csv.DictReader(f)
            data = [row for row in reader]

            pstr = pprint.pformat(data).replace("'", "\"")
            json_data = json.loads(pstr)
            json.dump(json_data, output, ensure_ascii=False, indent=2, separators=(',', ': '))
    else:
        print("The file is not a csv file. Exit the program.")
        os.system("pause")
else:
    print("The filepath is invalid. Exit the program.")
    os.system("pause")

print("Completed!")
