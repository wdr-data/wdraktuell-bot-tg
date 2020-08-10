import json
import re

from PIL import Image, ImageDraw, ImageFont

path_school_data = "raw/schools.json"

# Image dimensions
WIDTH = 1350
HEIGHT = 1350
PADDING = 40
DIMENSIONS = (WIDTH, HEIGHT)
CONTENT_WIDTH = WIDTH - 2 * PADDING

STAT_OFFSET_Y = 500

# Colors
COLOR_PRIMARY = (255, 255, 255)
COLOR_SECONDARY = (249, 178, 51)

# Font sizes
SIZE_TITLE = 55
SIZE_SUBTITLE = 120
SIZE_NUMBER = 150
SIZE_DESCRIPTION = 50
SIZE_CA = 50


# Load device data
with open(path_school_data) as file_school_data:
    data = json.load(file_school_data)


# Load layers
def resize(img):
    return img.resize(DIMENSIONS, resample=Image.CUBIC)


layer_bg = resize(Image.open("layers/background.png").convert("RGBA"))
icon_tablet = {
    "normal": Image.open("layers/tablet.png").convert("RGBA"),
    "missing": Image.open("layers/tablet_30.png").convert("RGBA"),
}
icon_laptop = {
    "normal": Image.open("layers/laptop.png").convert("RGBA"),
    "missing": Image.open("layers/laptop_30.png").convert("RGBA"),
}
icon_fiber = {
    "normal": Image.open("layers/fiber.png").convert("RGBA"),
    "missing": Image.open("layers/fiber_30.png").convert("RGBA"),
}


# Load fonts
FONT_SLAB_BOLD = "fonts/WDRSlab-BoldVZ-v101.ttf"
FONT_SANS_MEDIUM = "fonts/WDRSansVZ-Medium.ttf"
FONT_SANS_BOLD = "fonts/WDRSansVZ-Bold.ttf"

font_title = ImageFont.truetype(FONT_SANS_MEDIUM, SIZE_TITLE)
font_subtitle = ImageFont.truetype(FONT_SLAB_BOLD, SIZE_SUBTITLE)
font_number = ImageFont.truetype(FONT_SANS_BOLD, SIZE_NUMBER)
font_description = ImageFont.truetype(FONT_SANS_MEDIUM, SIZE_DESCRIPTION)
font_ca = ImageFont.truetype(FONT_SANS_MEDIUM, SIZE_CA)

spacing_title = int(SIZE_TITLE / 5)


def format_number(number, decimal_places=0):
    number = round(number, decimal_places)
    if decimal_places == 0:
        number = int(number)

    return str(number).replace(".", ",")


def draw_stat(
    img,
    draw,
    icon,
    number,
    description,
    column,
    column_count=3,
    *,
    ca=True,
    missing=False,
):
    spacing = 10

    center = int(WIDTH * column / column_count - (WIDTH / column_count / 2))
    center = (
        int(CONTENT_WIDTH * column / column_count - (CONTENT_WIDTH / column_count / 2))
        + PADDING
    )

    offset = STAT_OFFSET_Y

    icon_height = icon_fiber["normal"].size[1]

    overlay = Image.new("RGBA", DIMENSIONS, color=(0, 0, 0, 0))
    overlay.paste(
        icon,
        (
            center - int(icon.size[0] / 2),
            offset + int((icon_height - icon.size[1]) / 2),
        ),
    )
    img.alpha_composite(overlay)
    offset += icon_height + spacing

    size_ca = draw.textsize("ca.", font=font_ca)

    if ca:
        position_ca = (center - int(size_ca[0] / 2), offset)
        draw.text(position_ca, "ca.", fill=COLOR_SECONDARY, font=font_ca)

    offset += size_ca[1] + spacing

    size_number = draw.textsize(number, font=font_number)
    position_number = (center - int(size_number[0] / 2), offset)
    draw.text(position_number, number, fill=COLOR_SECONDARY, font=font_number)

    size_number_max = draw.textsize("X,X", font=font_number)
    offset += size_number_max[1] + spacing
    size_description = draw.textsize(description, font=font_description)
    position_description = (
        center - int(size_description[0] / 2),
        offset,
    )
    draw.multiline_text(
        position_description,
        description,
        fill=COLOR_SECONDARY,
        font=font_description,
        align="center",
    )


for ags, item in data.items():
    name = item["name"]

    if name == "NRW" or not item["responded"]:
        print("Skipping", name)
        continue
    else:
        print("Processing", name)

    img = layer_bg.copy()  # Image.new("RGBA", DIMENSIONS)
    draw = ImageDraw.Draw(img)
    title = "WDR-Umfrage: Digitale Ausstattung\nder Schulen in NRW"
    subtitle = name

    draw.text(
        (PADDING, PADDING),
        title.upper(),
        font=font_title,
        spacing=spacing_title,
        fill=COLOR_SECONDARY,
    )
    size_title = draw.textsize(title, font=font_title, spacing=spacing_title)

    # Scale down subtitle font until it fits the screen for this location
    font_subtitle = ImageFont.truetype(FONT_SLAB_BOLD, SIZE_SUBTITLE)
    for i in range(1, 10):
        size_subtitle = draw.textsize(subtitle, font=font_subtitle)
        if size_subtitle[0] > WIDTH - 2 * PADDING:
            font_subtitle = ImageFont.truetype(FONT_SLAB_BOLD, SIZE_SUBTITLE - 5 * i)
        else:
            break

    draw.text(
        (PADDING, PADDING * 2 + size_title[1]),
        subtitle,
        font=font_subtitle,
        fill=COLOR_PRIMARY,
    )

    notice = None

    icon_variant_tablet = "missing"
    icon_variant_laptop = "missing"
    icon_variant_fiber = "missing"

    if item["answeredDevices"] and item["studentsPerLaptop"] is not None:
        students_per_laptop = format_number(item["studentsPerLaptop"])
        students_per_laptop_description = "Schüler teilen\nsich ein Laptop"
        icon_variant_laptop = "normal"
    elif item["answeredDevices"]:
        students_per_laptop = "-"
        students_per_laptop_description = "Keine Laptops\nvorhanden"
    else:
        students_per_laptop = "k.A.*"
        students_per_laptop_description = "Schüler teilen\nsich ein Laptop"
        notice = f"* Hierzu wurden keine Angaben gemacht"

    if item["answeredDevices"] and item["studentsPerTablet"] is not None:
        students_per_tablet = format_number(item["studentsPerTablet"])
        students_per_tablet_description = "Schüler teilen\nsich ein Tablet"
        icon_variant_tablet = "normal"
    elif item["answeredDevices"]:
        students_per_tablet = "-"
        students_per_tablet_description = "Keine Tablets\nvorhanden"
    else:
        students_per_tablet = "k.A.*"
        students_per_tablet_description = "Schüler teilen\nsich ein Tablet"
        notice = f"* Hierzu wurden keine Angaben gemacht"

    fiber_ca = False
    if item["couldEvaluateFiber"]:
        if item["numSchoolsTotal"] > 50:
            fiber_ca = True
            fiber_percentage = f"{format_number(item['numSchoolsFiberPercent'])}%"
            fiber_percentage_description = "Schulen haben\nGlasfaseranschluss"
        else:
            fiber_percentage = f"{format_number(item['numSchoolsFiber'])}/{format_number(item['numSchoolsTotal'])}"
            fiber_percentage_description = "der Schulen haben\nGlasfaseranschluss"
        icon_variant_fiber = "normal"
    elif item["answeredFiber"]:
        fiber_percentage = "k.A.*"
        fiber_percentage_description = "Schulen haben\nGlasfaseranschluss"
        notice = f"* Die Angaben konnten nicht ausgewertet werden"
    else:
        fiber_percentage = "k.A.*"
        fiber_percentage_description = "Schulen haben\nGlasfaseranschluss"
        notice = f"* Hierzu wurden keine Angaben gemacht"

    draw_stat(
        img,
        draw,
        icon_laptop[icon_variant_laptop],
        students_per_laptop,
        students_per_laptop_description,
        1,
        ca=icon_variant_laptop == "normal",
    )
    draw_stat(
        img,
        draw,
        icon_tablet[icon_variant_tablet],
        students_per_tablet,
        students_per_tablet_description,
        2,
        ca=icon_variant_tablet == "normal",
    )
    draw_stat(
        img,
        draw,
        icon_fiber[icon_variant_fiber],
        fiber_percentage,
        fiber_percentage_description,
        3,
        ca=fiber_ca,
    )

    # Add notice
    if notice:
        size_notice = draw.textsize(notice, font=font_description)
        position_notice = (
            WIDTH - size_notice[0] - int(PADDING / 2),
            HEIGHT - size_notice[1] - int(PADDING / 2),
        )
        draw.text(position_notice, notice, fill=COLOR_PRIMARY, font=font_description)

    img.save(f"../images/schools/{ags}.png", "PNG")

    # break
