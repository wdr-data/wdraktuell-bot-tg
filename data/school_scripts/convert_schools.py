import csv
import json

path_csv = "schools.csv"
path_json = "../schools.js"

data = {}

with open(path_csv) as file_csv:
    reader_csv = csv.DictReader(file_csv)
    for row in reader_csv:
        ags = row["AGS"]
        row["responded"] = row["Tablets je 100 Schüler"] not in [
            "keine Angabe",
            "keine Angaben",
        ]
        data[ags] = row

with open(path_json, "w", encoding="utf8") as file_json:
    file_json.write("/* eslint-disable */\nexport default ")
    json.dump(data, file_json, indent=2, ensure_ascii=False)
