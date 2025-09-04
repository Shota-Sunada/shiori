import csv

result = {}

with open("hotel.csv", newline='', encoding='utf-8') as csvfile:
    reader = csv.reader(csvfile)
    for row in reader:
        if not row:
            continue
        key = row[0]
        for item in row[1:]:
            item = item.strip()
            if item:
                result[item] = key

with open("hotel.txt", 'w', encoding='utf-8') as f:
        for title, code in result.items():
            f.write(f"{title},{code}\n")