import customtkinter as ctk
from datetime import date

from constants import CLASSES, ROW_EVEN, ROW_ODD, BG_PANEL, TITLE_CLR
from data import save_data
from widgets import ScrollableDropdown
from fast_list import FastList


class MembersTab:
    def __init__(self, parent_frame, app):
        self.app  = app       # reference to GuildApp for shared state
        self.tab  = parent_frame
        self._member_rows  = []
        self._search_after = None
        self.sort_key   = "date"
        self.sort_asc   = True
        self.filter_job = "All Jobs"
        self._build()

    # ── Build ─────────────────────────────────────────────────────────────────
    def _build(self):
        tab = self.tab

        hdr = ctk.CTkFrame(tab, fg_color="transparent")
        hdr.pack(fill="x", padx=24, pady=(24, 8))
        ctk.CTkLabel(hdr, text="Guild Members",
                     font=self.app.page_title_font(), text_color=TITLE_CLR).pack(side="left")

        # Add-member form
        form = ctk.CTkFrame(tab, fg_color=BG_PANEL, corner_radius=12)
        form.pack(fill="x", padx=24, pady=8)
        ctk.CTkLabel(form, text="Add Member",
                     font=ctk.CTkFont(family="Helvetica", size=13, weight="bold"),
                     text_color="#aaa").grid(row=0, column=0, columnspan=6,
                                             sticky="w", padx=16, pady=(12, 4))
        self.name_var  = ctk.StringVar()
        self.class_var = ctk.StringVar(value=CLASSES[0])

        ctk.CTkLabel(form, text="Name",
                     font=ctk.CTkFont(family="Helvetica", size=12)
                     ).grid(row=1, column=0, padx=(16, 4), pady=10)
        ctk.CTkEntry(form, textvariable=self.name_var, width=180,
                     placeholder_text="Character name").grid(row=1, column=1, padx=4)
        ctk.CTkLabel(form, text="Job",
                     font=ctk.CTkFont(family="Helvetica", size=12)
                     ).grid(row=1, column=2, padx=(12, 4))

        self.job_preview_lbl = ctk.CTkLabel(form, text="",
                                             image=self.app.icons.get(CLASSES[0]),
                                             compound="left")
        self.job_preview_lbl.grid(row=1, column=3, padx=(4, 0))

        self.class_dropdown = ScrollableDropdown(
            form, variable=self.class_var, values=CLASSES, width=160,
            command=lambda c: self.job_preview_lbl.configure(image=self.app.icons.get(c)))
        self.class_dropdown.grid(row=1, column=4, padx=4)

        ctk.CTkButton(form, text="＋ Add", command=self._add_member,
                      fg_color=("#2e7d32", "#388e3c"), hover_color=("#1b5e20", "#2e7d32"),
                      width=90).grid(row=1, column=5, padx=(12, 16))
        form.grid_columnconfigure(5, weight=1)

        # Toolbar
        toolbar = ctk.CTkFrame(tab, fg_color=BG_PANEL, corner_radius=10)
        toolbar.pack(fill="x", padx=24, pady=(4, 0))

        self.search_var = ctk.StringVar()
        self.search_var.trace_add("write", self._on_search_change)
        ctk.CTkEntry(toolbar, textvariable=self.search_var,
                     placeholder_text="🔍  Search members…", width=220
                     ).pack(side="left", padx=(12, 8), pady=8)

        ctk.CTkLabel(toolbar, text="|", text_color="#444").pack(side="left", padx=4)
        ctk.CTkLabel(toolbar, text="Sort:",
                     font=ctk.CTkFont(family="Helvetica", size=12),
                     text_color="#aaa").pack(side="left", padx=(8, 4))

        self._sort_btns = {}
        for lbl, key in [("A–Z", "alpha"), ("Job", "job"), ("Date Added", "date")]:
            b = ctk.CTkButton(
                toolbar, text=lbl, width=90, height=28, corner_radius=6,
                font=ctk.CTkFont(family="Helvetica", size=12),
                fg_color=("#2a3a6a", "#1a2a5a") if self.sort_key == key else "transparent",
                hover_color=("#2a3a6a", "#1a2a5a"),
                command=lambda k=key: self._set_sort(k))
            b.pack(side="left", padx=3, pady=8)
            self._sort_btns[key] = b

        self._sort_dir_btn = ctk.CTkButton(
            toolbar, text="↑ Asc", width=72, height=28, corner_radius=6,
            font=ctk.CTkFont(family="Helvetica", size=12),
            fg_color=("#4a3080", "#5a3a90"), hover_color=("#6a40b0", "#7a50c0"),
            command=self._toggle_sort_dir)
        self._sort_dir_btn.pack(side="left", padx=(4, 8), pady=8)

        ctk.CTkLabel(toolbar, text="|", text_color="#444").pack(side="left", padx=4)
        ctk.CTkLabel(toolbar, text="Filter:",
                     font=ctk.CTkFont(family="Helvetica", size=12),
                     text_color="#aaa").pack(side="left", padx=(8, 4))

        self.filter_job_var = ctk.StringVar(value="All Jobs")
        self._filter_dropdown = ScrollableDropdown(
            toolbar, variable=self.filter_job_var,
            values=["All Jobs"] + CLASSES, width=160,
            command=self._set_filter)
        self._filter_dropdown.pack(side="left", padx=(4, 12), pady=8)

        self.member_list = FastList(tab, bg="#0d1520")
        self.member_list.pack(fill="both", expand=True, padx=24, pady=12)

        self._empty_lbl = ctk.CTkLabel(self.member_list.inner,
                                        text="No members found.", text_color="#555")

        self._rebuild_row_pool()
        self.apply_view()

    # ── Row pool ──────────────────────────────────────────────────────────────
    def _rebuild_row_pool(self):
        for r in self._member_rows:
            r["frame"].destroy()
        self._member_rows = []
        for orig_idx, m in enumerate(self.app.data["members"]):
            self._member_rows.append(self._make_row(orig_idx, m))

    def _make_row(self, orig_idx, m):
        inner = self.member_list.inner
        even  = orig_idx % 2 == 0
        row   = ctk.CTkFrame(inner,
                              fg_color=ROW_EVEN if even else ROW_ODD,
                              corner_radius=8)

        icon_btn = ctk.CTkButton(
            row, image=self.app.icons.get(m["class"]), text="",
            width=36, height=36, fg_color="transparent",
            hover_color=("#2a3a60", "#1a2440"), corner_radius=6,
            command=lambda mem=m: self._open_job_picker(mem))
        icon_btn.pack(side="left", padx=(12, 4), pady=8)

        name_lbl = ctk.CTkLabel(row, text=m["name"],
                                 font=ctk.CTkFont(family="Helvetica", size=14, weight="bold"),
                                 text_color="#e8e0d0")
        name_lbl.pack(side="left", padx=(4, 8), pady=8)

        class_lbl = ctk.CTkLabel(row, text=m["class"],
                                  font=ctk.CTkFont(family="Helvetica", size=12),
                                  text_color="#a0b4c8")
        class_lbl.pack(side="left", padx=4)

        added = m.get("added", "")
        if added:
            ctk.CTkLabel(row, text=added,
                         font=ctk.CTkFont(family="Helvetica", size=10),
                         text_color="#4a5a70").pack(side="left", padx=8)

        ctk.CTkButton(
            row, text="✕", width=28, height=28, corner_radius=6,
            fg_color=("#7b1717", "#8b1a1a"), hover_color=("#c62828", "#b71c1c"),
            command=lambda idx=orig_idx: self._remove_member(idx)
        ).pack(side="right", padx=12, pady=8)

        return {"frame": row, "icon_btn": icon_btn,
                "name_lbl": name_lbl, "class_lbl": class_lbl,
                "member": m, "orig_idx": orig_idx}

    # ── View / sort / filter ──────────────────────────────────────────────────
    def apply_view(self):
        query      = self.search_var.get().lower() if hasattr(self, "search_var") else ""
        job_filter = self.filter_job
        rows       = list(enumerate(self._member_rows))

        def passes(rd):
            m = rd["member"]
            if query and query not in m["name"].lower() and query not in m["class"].lower():
                return False
            if job_filter != "All Jobs" and m["class"] != job_filter:
                return False
            return True

        visible = [(pi, rd) for pi, rd in rows if passes(rd)]

        key = self.sort_key
        rev = not self.sort_asc
        if key == "alpha":
            visible.sort(key=lambda x: x[1]["member"]["name"].lower(), reverse=rev)
        elif key == "job":
            visible.sort(key=lambda x: (x[1]["member"]["class"].lower(),
                                         x[1]["member"]["name"].lower()), reverse=rev)
        elif key == "date":
            if rev:
                visible = list(reversed(visible))

        self._empty_lbl.pack_forget()
        for _, rd in rows:
            rd["frame"].pack_forget()

        if not visible:
            self._empty_lbl.pack(pady=40)
            return

        for _, rd in visible:
            rd["frame"].pack(fill="x", pady=2, padx=4)
        self.member_list.scroll_top()

    def _set_sort(self, key):
        if self.sort_key == key:
            self.sort_asc = not self.sort_asc
        else:
            self.sort_key = key
            self.sort_asc = True
        self._refresh_sort_ui()
        self.apply_view()

    def _toggle_sort_dir(self):
        self.sort_asc = not self.sort_asc
        self._refresh_sort_ui()
        self.apply_view()

    def _set_filter(self, choice):
        self.filter_job = choice
        self.apply_view()

    def _refresh_sort_ui(self):
        for k, b in self._sort_btns.items():
            b.configure(fg_color=("#2a3a6a", "#1a2a5a") if k == self.sort_key else "transparent")
        self._sort_dir_btn.configure(text="↑ Asc" if self.sort_asc else "↓ Desc")

    def _on_search_change(self, *_):
        if self._search_after:
            self.app.after_cancel(self._search_after)
        self._search_after = self.app.after(180, self.apply_view)

    # ── Add / Remove ──────────────────────────────────────────────────────────
    def _add_member(self):
        name = self.name_var.get().strip()
        if not name:
            return
        m = {"name": name, "class": self.class_var.get(), "added": str(date.today())}
        self.app.data["members"].append(m)
        save_data(self.app.data)
        self.name_var.set("")
        orig_idx = len(self.app.data["members"]) - 1
        self._member_rows.append(self._make_row(orig_idx, m))
        self.apply_view()
        self.app.update_count()
        self.app.attendance_tab.sync_member_list()
        self.app.parties_tab.sync_member_list()

    def _remove_member(self, idx):
        self.app.data["members"].pop(idx)
        save_data(self.app.data)
        self._rebuild_row_pool()
        self.apply_view()
        self.app.update_count()
        self.app.attendance_tab.sync_member_list()
        self.app.parties_tab.sync_member_list()

    # ── Job picker popup ──────────────────────────────────────────────────────
    def _open_job_picker(self, member):
        popup = ctk.CTkToplevel(self.app)
        popup.title(f"Change job — {member['name']}")
        popup.geometry("340x420")
        popup.resizable(False, False)
        popup.grab_set()

        ctk.CTkLabel(popup, text=f"Select job for  {member['name']}",
                     font=ctk.CTkFont(family="Helvetica", size=14, weight="bold"),
                     text_color=TITLE_CLR).pack(pady=(16, 8))

        scroll = ctk.CTkScrollableFrame(popup, fg_color="transparent")
        scroll.pack(fill="both", expand=True, padx=12, pady=4)

        def pick(job):
            member["class"] = job
            save_data(self.app.data)
            popup.destroy()
            for rd in self._member_rows:
                if rd["member"] is member:
                    rd["icon_btn"].configure(image=self.app.icons.get(job))
                    rd["class_lbl"].configure(text=job)
                    break

        for job in CLASSES:
            active = member["class"] == job
            ctk.CTkButton(
                scroll, text=f"  {job}", image=self.app.icons.get(job), compound="left",
                anchor="w", height=38, corner_radius=8,
                fg_color=("#2a4a2a", "#1a3a1a") if active else "transparent",
                hover_color=("#2a3a60", "#1a2440"),
                font=ctk.CTkFont(family="Helvetica", size=13,
                                  weight="bold" if active else "normal"),
                command=lambda j=job: pick(j)
            ).pack(fill="x", pady=2)
