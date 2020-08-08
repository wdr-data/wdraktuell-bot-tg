import csv
import re

from PIL import Image, ImageDraw, ImageFont

path_csv = "schools.csv"

# Image dimensions
WIDTH = 1080
HEIGHT = 1080
PADDING = 40
DIMENSIONS = (WIDTH, HEIGHT)
CONTENT_WIDTH = WIDTH - 2 * PADDING

STAT_OFFSET_Y = 500

# Colors
COLOR_PRIMARY = (255, 255, 255)
COLOR_SECONDARY = (3, 193, 201)

# Font sizes
SIZE_TITLE = 75
SIZE_SUBTITLE = 50
SIZE_NUMBER = 100
SIZE_DESCRIPTION = 30

# Load CSV
with open(path_csv) as file_csv:
    data = list(csv.DictReader(file_csv))

# Load layers
def resize(img):
    return img.resize(DIMENSIONS, resample=Image.CUBIC)


layer_bg = resize(Image.open("layers/background.png").convert("RGBA"))

# Load fonts
font_title = ImageFont.truetype("fonts/WDRSlab-BoldVZ-v101.ttf", SIZE_TITLE)
font_subtitle = ImageFont.truetype("fonts/WDRSlab-MediumVZ-v100.ttf", SIZE_SUBTITLE)
font_number = ImageFont.truetype("fonts/WDRSlab-BoldVZ-v101.ttf", SIZE_NUMBER)
font_description = ImageFont.truetype(
    "fonts/WDRSlab-MediumVZ-v100.ttf", SIZE_DESCRIPTION
)

spacing_title = int(SIZE_TITLE / 5)


def to_per_student(number):
    if number == "0":
        return "Ø"

    return str(round(100 / float(number.replace(",", ".")), 1)).replace(".", ",")


def draw_stat(draw, number, description, column, column_count=3):
    center = int(WIDTH * column / column_count - (WIDTH / column_count / 2))
    center = (
        int(CONTENT_WIDTH * column / column_count - (CONTENT_WIDTH / column_count / 2))
        + PADDING
    )

    size_number = draw.textsize(number, font=font_number)
    position_number = (center - int(size_number[0] / 2), STAT_OFFSET_Y)
    draw.text(position_number, number, fill=COLOR_SECONDARY, font=font_number)

    size_number_max = draw.textsize("X,X", font=font_number)
    size_description = draw.textsize(description, font=font_description)
    position_description = (
        center - int(size_description[0] / 2),
        STAT_OFFSET_Y + size_number_max[1],
    )
    draw.multiline_text(
        position_description,
        description,
        fill=COLOR_SECONDARY,
        font=font_description,
        align="center",
    )


for item in data:
    if item["Tablets je 100 Schüler"] in ["keine Angabe", "keine Angaben"]:
        print("Skipping", item["Ort"])
        continue
    else:
        print("Processing", item["Ort"])

    img = layer_bg.copy()  # Image.new("RGBA", DIMENSIONS)
    draw = ImageDraw.Draw(img)
    title = "WDR-Umfrage zur\nDigitalisierung an Schulen"
    subtitle = item["Ort"]

    draw.text(
        (PADDING, PADDING),
        title,
        font=font_title,
        spacing=spacing_title,
        fill=COLOR_PRIMARY,
    )

    size_title = draw.textsize(title, font=font_title, spacing=spacing_title)
    draw.text(
        (PADDING, PADDING * 2 + size_title[1]),
        subtitle,
        font=font_subtitle,
        fill=COLOR_PRIMARY,
    )

    students_per_laptop = to_per_student(item["Laptops je 100 Schüler"])
    students_per_laptop_description = (
        "Schüler pro Laptop"
        if item["Laptops je 100 Schüler"] != "0"
        else "Keine Laptops\nvorhanden"
    )
    students_per_tablet = to_per_student(item["Tablets je 100 Schüler"])
    students_per_tablet_description = (
        "Schüler pro Tablet"
        if item["Tablets je 100 Schüler"] != "0"
        else "Keine Tablets\nvorhanden"
    )

    draw_stat(draw, students_per_laptop, students_per_laptop_description, 1)
    draw_stat(draw, students_per_tablet, students_per_tablet_description, 2)
    draw_stat(draw, "X%", "Schulen mit\nGlasfaseranschluss", 3)

    ags = item["AGS"]
    img.save(f"../images/schools/{ags}.png", "PNG")

    # break
