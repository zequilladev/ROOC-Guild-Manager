import customtkinter as ctk

from constants import BG_PANEL, BG_DARK, TITLE_CLR
from data import save_data
from widgets import ScrollableDropdown


class PartiesTab:
    def __init__(self, parent_frame, app):
        self.app            = app
        self.tab            = parent_frame
        self.sort_key       = "date"
        self.sort_asc       = True
        self._build()

    # ── Build ─────────────────────────────────────────────────────────────────
    def _build(self):
        tab = self.tab

        hdr = ctk.CTkFrame(tab, fg_color="transparent")
        hdr.pack(fill="x", padx=24, pady=(24, 8))
        ctk.CTkLabel(hdr, text="Party Planner",
                     font=self.app.page_title_font(), text_color=TITLE_CLR).pack(side="left")

        ctrl = ctk.CTkFrame(tab, fg_color="transparent")
        ctrl.pack(fill="x", padx=24, pady=(0, 4))
        self.field_var = ctk.StringVar(value="main")
        ctk.CTkSegmentedButton(ctrl, values=["main", "sub"],
                               variable=self.field_var,
                               command=self.render).pack(side="left")
        ctk.CTkButton(ctrl, text="⚡ Auto-assign", command=self._auto_assign,
                      fg_color=("#5a2e8a", "#6a35a0"), hover_color=("#7b3fc4", "#8b4fd4"),
                      font=ctk.CTkFont(family="Helvetica", size=13),
                      width=130).pack(side="left", padx=12)
        ctk.CTkButton(ctrl, text="🗑 Clear", command=self._clear_parties,
                      fg_color=("#5a2a1a", "#6a2a1a"), hover_color=("#8b3a1a", "#9b3a1a"),
                      font=ctk.CTkFont(family="Helvetica", size=13),
                      width=90).pack(side="left")

        # Sort toolbar
        sort_bar = ctk.CTkFrame(tab, fg_color=BG_PANEL, corner_radius=10)
        sort_bar.pack(fill="x", padx=24, pady=(0, 4))

        ctk.CTkLabel(sort_bar, text="Pool sort:",
                     font=ctk.CTkFont(family="Helvetica", size=12),
                     text_color="#aaa").pack(side="left", padx=(12, 4), pady=8)

        self._sort_btns = {}
        for lbl, key in [("A–Z", "alpha"), ("Job", "job"), ("Date Added", "date")]:
            b = ctk.CTkButton(
                sort_bar, text=lbl, width=90, height=28, corner_radius=6,
                font=ctk.CTkFont(family="Helvetica", size=12),
                fg_color=("#2a3a6a", "#1a2a5a") if self.sort_key == key else "transparent",
                hover_color=("#2a3a6a", "#1a2a5a"),
                command=lambda k=key: self._set_sort(k))
            b.pack(side="left", padx=3, pady=8)
            self._sort_btns[key] = b

        self._sort_dir_btn = ctk.CTkButton(
            sort_bar, text="↑ Asc", width=72, height=28, corner_radius=6,
            font=ctk.CTkFont(family="Helvetica", size=12),
            fg_color=("#4a3080", "#5a3a90"), hover_color=("#6a40b0", "#7a50c0"),
            command=self._toggle_sort_dir)
        self._sort_dir_btn.pack(side="left", padx=(4, 8), pady=8)

        pool_row = ctk.CTkFrame(tab, fg_color="transparent")
        pool_row.pack(fill="x", padx=24, pady=(0, 0))
        ctk.CTkLabel(pool_row, text="Unassigned:",
                     font=ctk.CTkFont(family="Helvetica", size=12, weight="bold"),
                     text_color="#7a9ab0").pack(side="left")
        self.pool_display = ctk.CTkLabel(pool_row, text="",
                                          font=ctk.CTkFont(family="Helvetica", size=12),
                                          text_color="#7a9ab0")
        self.pool_display.pack(side="left", padx=8)

        # Assignment controls
        sel = ctk.CTkFrame(tab, fg_color=BG_PANEL, corner_radius=10)
        sel.pack(fill="x", padx=24, pady=4)
        ctk.CTkLabel(sel, text="Assign:",
                     font=ctk.CTkFont(family="Helvetica", size=12)
                     ).grid(row=0, column=0, padx=12, pady=8)

        members = [m["name"] for m in self.app.data["members"]]
        self.sel_member    = ctk.StringVar(value=members[0] if members else "")
        self.sel_party_num = ctk.StringVar(value="1")
        self.sel_slot      = ctk.StringVar(value="1")

        self._party_member_menu = ScrollableDropdown(
            sel, variable=self.sel_member,
            values=members if members else ["—"], width=160,
            max_dropdown_height=220)
        self._party_member_menu.grid(row=0, column=1, padx=4)

        ctk.CTkLabel(sel, text="→ Party",
                     font=ctk.CTkFont(family="Helvetica", size=12)
                     ).grid(row=0, column=2, padx=(8, 4))

        self._party_num_menu = ScrollableDropdown(
            sel, variable=self.sel_party_num,
            values=[str(i) for i in range(1, 9)], width=70,
            max_dropdown_height=220)
        self._party_num_menu.grid(row=0, column=3, padx=4)

        ctk.CTkLabel(sel, text="Slot",
                     font=ctk.CTkFont(family="Helvetica", size=12)
                     ).grid(row=0, column=4, padx=(8, 4))

        self._party_slot_menu = ScrollableDropdown(
            sel, variable=self.sel_slot,
            values=[str(i) for i in range(1, 6)], width=70,
            max_dropdown_height=220)
        self._party_slot_menu.grid(row=0, column=5, padx=4)

        ctk.CTkButton(sel, text="Assign", command=self._assign_member,
                      width=90, fg_color=("#1a4a7a", "#1a3a6a"),
                      font=ctk.CTkFont(family="Helvetica", size=12)
                      ).grid(row=0, column=6, padx=12, pady=8)

        self.party_scroll = ctk.CTkScrollableFrame(
            tab, fg_color=BG_DARK, corner_radius=12)
        self.party_scroll.pack(fill="both", expand=True, padx=24, pady=8)

        self._ensure_parties()
        self.render()

    # ── Sort ──────────────────────────────────────────────────────────────────
    def _set_sort(self, key):
        if self.sort_key == key:
            self.sort_asc = not self.sort_asc
        else:
            self.sort_key = key
            self.sort_asc = True
        self._refresh_sort_ui()
        self.render()

    def _toggle_sort_dir(self):
        self.sort_asc = not self.sort_asc
        self._refresh_sort_ui()
        self.render()

    def _refresh_sort_ui(self):
        for k, b in self._sort_btns.items():
            b.configure(fg_color=("#2a3a6a", "#1a2a5a") if k == self.sort_key else "transparent")
        self._sort_dir_btn.configure(text="↑ Asc" if self.sort_asc else "↓ Desc")

    def _sorted_members(self):
        members = list(self.app.data["members"])
        key = self.sort_key
        rev = not self.sort_asc
        if key == "alpha":
            members.sort(key=lambda m: m["name"].lower(), reverse=rev)
        elif key == "job":
            members.sort(key=lambda m: (m["class"].lower(), m["name"].lower()), reverse=rev)
        elif key == "date":
            if rev:
                members = list(reversed(members))
        return members

    def sync_member_list(self):
        sorted_members = self._sorted_members()
        names = [m["name"] for m in sorted_members]
        self._party_member_menu.configure(values=names if names else ["—"])
        if names:
            self.sel_member.set(names[0])
        self.render()

    # ── Parties ───────────────────────────────────────────────────────────────
    def _ensure_parties(self):
        for field in ("main", "sub"):
            parties = self.app.data["parties"].setdefault(field, [])
            while len(parties) < 8:
                parties.append([None] * 5)
            for p in parties:
                while len(p) < 5:
                    p.append(None)

    def render(self, *_):
        for w in self.party_scroll.winfo_children():
            w.destroy()
        field   = self.field_var.get()
        parties = self.app.data["parties"][field]
        members = {m["name"]: m for m in self.app.data["members"]}

        sorted_names = [m["name"] for m in self._sorted_members()]
        self._party_member_menu.configure(values=sorted_names if sorted_names else ["—"])

        grid = ctk.CTkFrame(self.party_scroll, fg_color="transparent")
        grid.pack(fill="both", expand=True)

        for pi, party in enumerate(parties):
            col, row_n = pi % 4, pi // 4
            pf = ctk.CTkFrame(grid, fg_color=("#1e2d50", "#111c2e"), corner_radius=10)
            pf.grid(row=row_n, column=col, padx=6, pady=6, sticky="nsew")
            grid.grid_columnconfigure(col, weight=1)
            filled = sum(1 for s in party if s)
            ctk.CTkLabel(pf, text=f"Party {pi+1}  [{filled}/5]",
                         font=ctk.CTkFont(family="Helvetica", size=13, weight="bold"),
                         text_color=TITLE_CLR if filled == 5 else "#aaa"
                         ).pack(pady=(10, 4), padx=12, anchor="w")
            for si, slot in enumerate(party):
                sf = ctk.CTkFrame(pf,
                                   fg_color=("#2a3a60", "#1a2440") if slot else ("#222", "#181818"),
                                   corner_radius=6)
                sf.pack(fill="x", padx=8, pady=2)
                if slot and slot in members:
                    m = members[slot]
                    img = self.app.icons_sm.get(m["class"])
                    inner = ctk.CTkFrame(sf, fg_color="transparent")
                    inner.pack(side="left", padx=8, pady=4)
                    if img:
                        ctk.CTkLabel(inner, image=img, text="").pack(side="left", padx=(0, 5))
                    ctk.CTkLabel(inner, text=slot,
                                  font=ctk.CTkFont(family="Helvetica", size=12),
                                  text_color="#e0d8c8").pack(side="left")
                    ctk.CTkButton(sf, text="✕", width=22, height=22, corner_radius=4,
                                   fg_color=("#5a1a1a", "#6a1a1a"),
                                   hover_color=("#8b2a2a", "#9b2a2a"),
                                   command=lambda f=field, p=pi, s=si: self._remove_slot(f, p, s)
                                   ).pack(side="right", padx=4)
                else:
                    ctk.CTkLabel(sf, text=f"  Slot {si+1} — empty",
                                  font=ctk.CTkFont(family="Helvetica", size=11),
                                  text_color="#444").pack(side="left", padx=8, pady=4)

        assigned       = {s for p in parties for s in p if s}
        sorted_members = self._sorted_members()
        unassigned     = [m["name"] for m in sorted_members if m["name"] not in assigned]
        self.pool_display.configure(
            text=", ".join(unassigned) if unassigned else "All assigned ✓")

    def _assign_member(self):
        field, name = self.field_var.get(), self.sel_member.get()
        pi, si = int(self.sel_party_num.get()) - 1, int(self.sel_slot.get()) - 1
        if name and name != "—":
            self.app.data["parties"][field][pi][si] = name
            save_data(self.app.data)
            self.render()

    def _remove_slot(self, field, pi, si):
        self.app.data["parties"][field][pi][si] = None
        save_data(self.app.data)
        self.render()

    def _auto_assign(self):
        field          = self.field_var.get()
        sorted_members = self._sorted_members()
        parties        = [[None] * 5 for _ in range(8)]
        for i, m in enumerate(sorted_members[:40]):
            parties[i // 5][i % 5] = m["name"]
        self.app.data["parties"][field] = parties
        save_data(self.app.data)
        self.render()

    def _clear_parties(self):
        field = self.field_var.get()
        self.app.data["parties"][field] = [[None] * 5 for _ in range(8)]
        save_data(self.app.data)
        self.render()
