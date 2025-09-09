import csv

input_file = 'shinkansen_seat_1.csv'
output_file = 'shinkansen_seat_1_output.csv'
# input_file = 'shinkansen_seat_2.csv'
# output_file = 'shinkansen_seat_2_output.csv'

with open(input_file, newline='', encoding='utf-8') as csvfile, \
     open(output_file, 'w', newline='', encoding='utf-8') as outfile:

    reader = csv.DictReader(csvfile)
    writer = csv.writer(outfile)

    writer.writerow(['shinkansen_day1_car_number', 'shinkansen_day1_seat', 'class', 'number'])

    for row in reader:
        num = row['NUM']
        car = int(num[:2])
        row_num = int(num[2:])
        for seat_label in ['A', 'B', 'C', 'D', 'E']:
            if row[seat_label] != "":
                seat_number = row[seat_label]
                seat_class = int(seat_number[0])
                seat_number_only = int(seat_number[1:])
                seat = f"{row_num}{seat_label}"
                writer.writerow([car, seat, seat_class, seat_number_only])
