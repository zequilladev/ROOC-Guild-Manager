import customtkinter as ctk

from constants import SIDEBAR_BG, TITLE_CLR, BG_DARK
from data import load_data
from icons_loader import load_icons
from tab_members import MembersTab
from tab_attendance import AttendanceTab
from tab_parties import PartiesTab


class GuildApp(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.title("RO Guild Manager")
        self.geometry("1150x720")
        self.minsize(960, 620)
        self.data = load_data()

        self.icons    = load_icons(size=(32, 32))
        self.icons_sm = load_icons(size=(20, 20))

        self._active_tab = None
        self._build_layout()

        # Instantiate tabs — each receives its frame + this app as shared context
        self.members_tab    = MembersTab(self.tab_frames["members"],    self)
        self.attendance_tab = AttendanceTab(self.tab_frames["attendance"], self)
        self.parties_tab    = PartiesTab(self.tab_frames["parties"],    self)

        self._show_tab("members")
        self.update_count()

    # ── Shared helpers ────────────────────────────────────────────────────────
    def page_title_font(self):
        return ctk.CTkFont(family="Helvetica", size=26, weight="bold")

    def update_count(self):
        n = len(self.data["members"])
        self.member_count_lbl.configure(text=f"👥 {n} member{'s' if n != 1 else ''}")

    # ── Layout skeleton ───────────────────────────────────────────────────────
    def _build_layout(self):
        self.sidebar = ctk.CTkFrame(self, width=210, corner_radius=0, fg_color=SIDEBAR_BG)
        self.sidebar.pack(side="left", fill="y")
        self.sidebar.pack_propagate(False)

        ctk.CTkLabel(self.sidebar, text="⚔️ Forsaken",
                     font=ctk.CTkFont(family="Helvetica", size=22, weight="bold"),
                     text_color=TITLE_CLR).pack(pady=(30, 40))

        self._nav_btns = {}
        nav_items = [
            ("👥  Members",       "members"),
            ("📋  Attendance",    "attendance"),
            ("🗺️  Party Planner", "parties"),
        ]
        for label, key in nav_items:
            b = ctk.CTkButton(
                self.sidebar, text=label,
                command=lambda k=key: self._show_tab(k),
                fg_color="transparent", hover_color=("#2a2a4e", "#1e1e3a"),
                anchor="w", font=ctk.CTkFont(family="Helvetica", size=14),
                text_color=("#ddd", "#ccc"), height=42, corner_radius=8)
            b.pack(fill="x", padx=12, pady=4)
            self._nav_btns[key] = b

        self.member_count_lbl = ctk.CTkLabel(
            self.sidebar, text="",
            font=ctk.CTkFont(family="Helvetica", size=11),
            text_color=("#888", "#666"))
        self.member_count_lbl.pack(side="bottom", pady=20)

        self.content = ctk.CTkFrame(self, corner_radius=0, fg_color=("#16213e", "#0d1117"))
        self.content.pack(side="left", fill="both", expand=True)

        self.tab_frames = {}
        for key in ("members", "attendance", "parties"):
            f = ctk.CTkFrame(self.content, corner_radius=0, fg_color=("#16213e", "#0d1117"))
            self.tab_frames[key] = f

    def _show_tab(self, key):
        if self._active_tab:
            self.tab_frames[self._active_tab].pack_forget()
        self.tab_frames[key].pack(fill="both", expand=True)
        self._active_tab = key
        for k, b in self._nav_btns.items():
            b.configure(fg_color=("#2a2a4e", "#1e1e3a") if k == key else "transparent")


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    app = GuildApp()
    app.mainloop()
