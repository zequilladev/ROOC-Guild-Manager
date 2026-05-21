import os
from PIL import Image
import customtkinter as ctk
from constants import CLASSES

ICONS_DIR = os.path.join(os.path.dirname(__file__), "icons")


def load_icons(size=(32, 32)):
    icons = {}
    for job in CLASSES:
        path = os.path.join(ICONS_DIR, f"{job.replace(' ', '_')}.png")
        if os.path.exists(path):
            img = Image.open(path).convert("RGBA").resize(size, Image.LANCZOS)
            icons[job] = ctk.CTkImage(img, size=size)
    return icons
