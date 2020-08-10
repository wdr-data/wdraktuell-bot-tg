import csv
import json

path_device_csv = "raw/schools.csv"
path_fiber_csv = "raw/fiber.csv"
path_json = "../schools.js"

data = {}


def students_per_device(number):
    if number in ["keine Angabe", "keine Angaben", "0"]:
        return None

    return round(100 / float(number.replace(",", ".")), 1)


def to_float(number):
    if number in ["keine Angabe", "keine Angaben", "keine Antwort", "nicht auswertbar"]:
        return None
    return round(float(number.replace(",", ".")), 1)


def to_int(number):
    if number in ["keine Angabe", "keine Angaben", "keine Antwort"]:
        return None
    return int(round(float(number.replace(",", ".")), 0))


# Load device data
with open(path_device_csv) as file_csv:
    reader_csv = list(csv.DictReader(file_csv))
    for row in reader_csv:
        item = {}
        ags = row["AGS"]
        item["name"] = row["Ort"]

        item["responded"] = row["Bemerkungen"] != "keine Teilnahme an der Abfrage"
        item["answeredDevices"] = row["Tablets je 100 Schüler"] not in [
            "keine Angaben",
            "keine Angabe",
        ]

        item["tabletsPer100"] = to_float(row["Tablets je 100 Schüler"])
        item["desktopsPer100"] = to_float(row["Desktoprechner je 100 Schüler"])
        item["laptopsPer100"] = to_float(row["Laptops je 100 Schüler"])
        item["whiteboardsPer100"] = to_float(row["Whiteboards je 100 Schüler"])

        item["studentsPerTablet"] = students_per_device(row["Tablets je 100 Schüler"])
        item["studentsPerDesktop"] = students_per_device(
            row["Desktoprechner je 100 Schüler"]
        )
        item["studentsPerLaptop"] = students_per_device(row["Laptops je 100 Schüler"])
        item["studentsPerWhitboard"] = students_per_device(
            row["Whiteboards je 100 Schüler"]
        )

        item["notice"] = row["Bemerkungen"]

        data[ags] = item

    row_nrw = reader_csv[0]
    data["NRW"] = {
        "name": "NRW",
        "tabletsPer100": to_float(row_nrw["Mittelwert NRW Tablets"]),
        "desktopsPer100": to_float(row_nrw["Mittelwert NRW Desktop"]),
        "laptopsPer100": to_float(row_nrw["Mittelwert NRW Laptops"]),
        "whiteboardsPer100": to_float(row_nrw["Mittelwert NRW Whiteboards"]),
        "studentsPerTablet": students_per_device(row_nrw["Mittelwert NRW Tablets"]),
        "studentsPerDesktop": students_per_device(row_nrw["Mittelwert NRW Desktop"]),
        "studentsPerLaptop": students_per_device(row_nrw["Mittelwert NRW Laptops"]),
        "studentsPerWhitboard": students_per_device(
            row_nrw["Mittelwert NRW Whiteboards"]
        ),
    }

# Load fiber data
with open(path_fiber_csv) as file_csv:
    reader_csv = list(csv.DictReader(file_csv))
    for row in reader_csv:
        item = data[row["keyCity"]]

        item["answeredFiber"] = row["antwort"] == "ja"
        item["couldEvaluateFiber"] = row["auswertbar"] == "ja"

        item["numSchoolsTotal"] = to_int(row["schulen_anzahl"])
        item["numSchoolsFiber"] = to_int(row["glasfaser"])
        item["numSchoolsBroadband"] = to_int(row["breitband"])
        item["numSchoolsOther"] = to_int(row["andere"])
        item["numSchoolsFiberPercent"] = to_float(row["anteil_glasfaser"])


with open(path_json, "w", encoding="utf8") as file_json:
    file_json.write("/* eslint-disable */\nexport default ")
    json.dump(data, file_json, indent=2, ensure_ascii=False)
