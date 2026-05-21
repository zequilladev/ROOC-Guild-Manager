import customtkinter as ctk
import calendar
from datetime import date

from constants import ROW_EVEN, ROW_ODD, BG_PANEL, BG_DARK, TITLE_CLR
from data import save_data, get_league_dates, get_months_with_data, date_key_to_date
from widgets import ScrollableDropdown
from fast_list import FastList


class AttendanceTab:
    def __init__(self, parent_frame, app):
        self.app          = app
        self.tab          = parent_frame
        self._att_rows    = []
        self._save_after  = None
        self.att_checks   = {}
        self.sort_key     = "date"
        self.sort_asc     = True
        self._build()

    # ── Build ─────────────────────────────────────────────────────────────────
    def _build(self):
        tab = self.tab

        hdr = ctk.CTkFrame(tab, fg_color="transparent")
        hdr.pack(fill="x", padx=24, pady=(24, 8))
        ctk.CTkLabel(hdr, text="Guild League Attendance",
                     font=self.app.page_title_font(), text_color=TITLE_CLR).pack(side="left")
        ctk.CTkButton(hdr, text="📊  Monthly Summary",
                      command=self._open_monthly_summary,
                      fg_color=("#4a3080", "#5a3a90"), hover_color=("#6a40b0", "#7a50c0"),
                      font=ctk.CTkFont(family="Helvetica", size=13),
                      width=170, height=32).pack(side="right")

        dates = get_league_dates(start_date_str="2026-04-14", weeks_ahead=8)
        df = ctk.CTkFrame(tab, fg_color="transparent")
        df.pack(fill="x", padx=24, pady=(0, 4))
        ctk.CTkLabel(df, text="Session:",
                     font=ctk.CTkFont(family="Helvetica", size=13)).pack(side="left")

        self.att_date_var = ctk.StringVar(value=dates[-1] if dates else "")
        today_str = str(date.today())
        for d in reversed(dates):
            if d.split("  ")[0].strip() <= today_str:
                self.att_date_var.set(d)
                break

        self._att_date_dropdown = ScrollableDropdown(
            df, variable=self.att_date_var, values=dates, width=260,
            command=lambda _: self.load_for_date(),
            max_dropdown_height=280)
        self._att_date_dropdown.pack(side="left", padx=8)

        self.att_stats = ctk.CTkLabel(df, text="",
                                       font=ctk.CTkFont(family="Helvetica", size=12),
                                       text_color="#8aa")
        self.att_stats.pack(side="right", padx=8)

        # Sort toolbar
        sort_bar = ctk.CTkFrame(tab, fg_color=BG_PANEL, corner_radius=10)
        sort_bar.pack(fill="x", padx=24, pady=(0, 4))

        ctk.CTkLabel(sort_bar, text="Sort:",
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

        self.att_list = FastList(tab, bg="#0d1520")
        self.att_list.pack(fill="both", expand=True, padx=24, pady=8)

        self._build_row_pool()
        self.load_for_date()

    # ── Row pool ──────────────────────────────────────────────────────────────
    def _build_row_pool(self):
        for r in self._att_rows:
            r["frame"].destroy()
        self._att_rows = []
        self.att_checks = {}

        for i, m in enumerate(self.app.data["members"]):
            row = ctk.CTkFrame(
                self.att_list.inner,
                fg_color=ROW_EVEN if i % 2 == 0 else ROW_ODD,
                corner_radius=8)

            var = ctk.BooleanVar(value=False)
            self.att_checks[m["name"]] = var

            ctk.CTkCheckBox(row, text="", variable=var,
                             command=self._schedule_save,
                             checkmark_color="#F8F8FF",
                             fg_color=("#2e5e2e", "#1a3a1a"),
                             hover_color=("#3a7a3a", "#2a5a2a"),
                             width=24).pack(side="left", padx=(16, 4), pady=10)

            img = self.app.icons.get(m["class"])
            if img:
                ctk.CTkLabel(row, image=img, text="").pack(side="left", padx=(0, 6), pady=8)

            ctk.CTkLabel(row, text=f"{m['name']}  —  {m['class']}",
                         font=ctk.CTkFont(family="Helvetica", size=13),
                         text_color="#e0d8c8").pack(side="left", padx=4, pady=8)

            row.pack(fill="x", pady=2, padx=4)
            self._att_rows.append({"frame": row, "var": var, "name": m["name"]})

    def sync_member_list(self):
        self._build_row_pool()
        self.load_for_date()

    # ── Load / save ───────────────────────────────────────────────────────────
    def load_for_date(self):
        sel_date = self.att_date_var.get()
        att      = self.app.data["attendance"].get(sel_date, {})
        for rd in self._att_rows:
            rd["var"].set(att.get(rd["name"], False))
        self._apply_view()
        self._update_stats()

    def _schedule_save(self):
        if self._save_after:
            self.app.after_cancel(self._save_after)
        self._save_after = self.app.after(400, self._flush_save)

    def _flush_save(self):
        self._save_after = None
        sel_date = self.att_date_var.get()
        self.app.data["attendance"][sel_date] = {
            rd["name"]: rd["var"].get() for rd in self._att_rows
        }
        save_data(self.app.data)
        self._update_stats()

    def _update_stats(self):
        sel_date = self.att_date_var.get()
        att      = self.app.data["attendance"].get(sel_date, {})
        present  = sum(1 for v in att.values() if v)
        total    = len(self.app.data["members"])
        self.att_stats.configure(text=f"Present: {present} / {total}")

    # ── Sort ──────────────────────────────────────────────────────────────────
    def _set_sort(self, key):
        if self.sort_key == key:
            self.sort_asc = not self.sort_asc
        else:
            self.sort_key = key
            self.sort_asc = True
        self._refresh_sort_ui()
        self._apply_view()

    def _toggle_sort_dir(self):
        self.sort_asc = not self.sort_asc
        self._refresh_sort_ui()
        self._apply_view()

    def _refresh_sort_ui(self):
        for k, b in self._sort_btns.items():
            b.configure(fg_color=("#2a3a6a", "#1a2a5a") if k == self.sort_key else "transparent")
        self._sort_dir_btn.configure(text="↑ Asc" if self.sort_asc else "↓ Desc")

    def _apply_view(self):
        rows = list(self._att_rows)
        key  = self.sort_key
        rev  = not self.sort_asc
        member_map = {m["name"]: m for m in self.app.data["members"]}

        if key == "alpha":
            rows.sort(key=lambda r: r["name"].lower(), reverse=rev)
        elif key == "job":
            rows.sort(key=lambda r: (
                member_map.get(r["name"], {}).get("class", "").lower(),
                r["name"].lower()), reverse=rev)
        elif key == "date":
            if rev:
                rows = list(reversed(rows))

        for rd in self._att_rows:
            rd["frame"].pack_forget()
        for rd in rows:
            rd["frame"].pack(fill="x", pady=2, padx=4)
        self.att_list.scroll_top()

    # ── Monthly Summary popup ─────────────────────────────────────────────────
    def _open_monthly_summary(self):
        popup = ctk.CTkToplevel(self.app)
        popup.title("Monthly Attendance Summary")
        popup.geometry("700x560")
        popup.grab_set()

        ctk.CTkLabel(popup, text="Monthly Attendance Summary",
                     font=ctk.CTkFont(family="Helvetica", size=18, weight="bold"),
                     text_color=TITLE_CLR).pack(pady=(16, 8))

        months = get_months_with_data(self.app.data["attendance"])
        month_labels = [f"{calendar.month_name[m]} {y}" for y, m in months]
        if not month_labels:
            ctk.CTkLabel(popup, text="No attendance data yet.", text_color="#666").pack(pady=40)
            return

        sel_month_var = ctk.StringVar(value=month_labels[-1])
        ctrl = ctk.CTkFrame(popup, fg_color="transparent")
        ctrl.pack(fill="x", padx=20, pady=(0, 8))
        ctk.CTkLabel(ctrl, text="Month:",
                     font=ctk.CTkFont(family="Helvetica", size=13)).pack(side="left")

        month_dropdown = ScrollableDropdown(
            ctrl, variable=sel_month_var, values=month_labels, width=180,
            command=lambda _: render_summary(), max_dropdown_height=200)
        month_dropdown.pack(side="left", padx=8)

        legend = ctk.CTkFrame(ctrl, fg_color="transparent")
        legend.pack(side="right", padx=8)
        for color, label in [("#2d6a2d", "🟢 Perfect"), ("#888", "⬜ Average"),
                              ("#7a6a00", "🟡 2–3"), ("#7a1a1a", "🔴 0–1")]:
            ctk.CTkLabel(legend, text=label,
                         font=ctk.CTkFont(family="Helvetica", size=11),
                         text_color=color).pack(side="left", padx=6)

        scroll = ctk.CTkScrollableFrame(popup, fg_color=("#1a2240", "#0d1520"), corner_radius=10)
        scroll.pack(fill="both", expand=True, padx=16, pady=(0, 16))

        def render_summary():
            for w in scroll.winfo_children():
                w.destroy()
            label = sel_month_var.get()
            parts = label.split()
            month_num = list(calendar.month_name).index(parts[0])
            year_num  = int(parts[1])

            all_dates = get_league_dates(start_date_str="2026-04-14", weeks_ahead=8)
            month_sessions = [dk for dk in all_dates
                               if (lambda d: d.year == year_num and d.month == month_num)(
                                   date_key_to_date(dk))]
            total_sessions = len(month_sessions)
            if not total_sessions:
                ctk.CTkLabel(scroll, text="No sessions this month.", text_color="#555").pack(pady=20)
                return

            hdr = ctk.CTkFrame(scroll, fg_color=BG_PANEL, corner_radius=8)
            hdr.pack(fill="x", padx=4, pady=(4, 2))
            for txt, w in [("Member", 160), ("Job", 130)]:
                ctk.CTkLabel(hdr, text=txt,
                             font=ctk.CTkFont(family="Helvetica", size=12, weight="bold"),
                             text_color="#aaa", width=w, anchor="w"
                             ).pack(side="left", padx=(16 if txt == "Member" else 4), pady=6)
            ctk.CTkLabel(hdr, text=f"Attended / {total_sessions}",
                         font=ctk.CTkFont(family="Helvetica", size=12, weight="bold"),
                         text_color="#aaa").pack(side="left", padx=8)

            for i, m in enumerate(self.app.data["members"]):
                count = sum(1 for dk in month_sessions
                            if self.app.data["attendance"].get(dk, {}).get(m["name"], False))
                if count == total_sessions:
                    rf, tc, bf = ("#1a3a1a", "#0d2a0d"), "#4caf50", ("#2e5e2e", "#1a3a1a")
                elif count <= 1:
                    rf, tc, bf = ("#3a1a1a", "#2a0d0d"), "#ef5350", ("#7a1a1a", "#5a0d0d")
                elif count <= 3:
                    rf, tc, bf = ("#3a3000", "#2a2200"), "#ffca28", ("#5a4a00", "#3a3000")
                else:
                    from constants import ROW_EVEN, ROW_ODD
                    rf = ROW_EVEN if i % 2 == 0 else ROW_ODD
                    tc, bf = "#c0c8d8", ("#2a3a60", "#1a2440")

                row = ctk.CTkFrame(scroll, fg_color=rf, corner_radius=8)
                row.pack(fill="x", pady=2, padx=4)
                img = self.app.icons_sm.get(m["class"])
                if img:
                    ctk.CTkLabel(row, image=img, text="").pack(side="left", padx=(12, 4), pady=6)
                ctk.CTkLabel(row, text=m["name"],
                             font=ctk.CTkFont(family="Helvetica", size=13, weight="bold"),
                             text_color=tc, width=160, anchor="w").pack(side="left", padx=4, pady=6)
                ctk.CTkLabel(row, text=m["class"],
                             font=ctk.CTkFont(family="Helvetica", size=11),
                             text_color="#7a8a9a", width=130, anchor="w").pack(side="left", padx=4)
                badge = ctk.CTkFrame(row, fg_color=bf, corner_radius=6)
                badge.pack(side="left", padx=8)
                ctk.CTkLabel(badge, text=f"  {count} / {total_sessions}  ",
                             font=ctk.CTkFont(family="Helvetica", size=13, weight="bold"),
                             text_color=tc).pack(pady=2)

            footer = ctk.CTkFrame(scroll, fg_color=BG_PANEL, corner_radius=8)
            footer.pack(fill="x", padx=4, pady=(6, 2))
            total_members = len(self.app.data["members"])
            perfect = sum(1 for m in self.app.data["members"]
                          if sum(1 for dk in month_sessions
                                 if self.app.data["attendance"].get(dk, {}).get(m["name"], False)
                                 ) == total_sessions)
            ctk.CTkLabel(footer,
                         text=f"  {calendar.month_name[month_num]} {year_num}  ·  "
                              f"{total_sessions} sessions  ·  "
                              f"{perfect} / {total_members} perfect attendance",
                         font=ctk.CTkFont(family="Helvetica", size=12),
                         text_color="#8aa").pack(side="left", padx=8, pady=8)

        render_summary()
