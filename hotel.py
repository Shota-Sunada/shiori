import csv

result = {}

with open("hotel.csv", newline='', encoding='utf-8') as csvfile:
    reader = csv.reader(csvfile)
    for row in reader:
        if not row:
            continue
        key = row[0]
        for item in row[1:]:
            result[item] = key

for k, v in result.items():
    print(f"{k}: {v}")
