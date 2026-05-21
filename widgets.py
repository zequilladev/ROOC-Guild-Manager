import tkinter as tk
import customtkinter as ctk


class ScrollableDropdown:
    """
    A dropdown that:
    - Always opens downward from the button (clamped to screen so it never overflows)
    - Has a fixed max height (scrollable if items overflow)
    - Closes when clicking outside or selecting an item
    - Mimics CTkOptionMenu API: variable, values, width, command, configure()
    """
    _open_instance = None  # track currently open dropdown globally

    def __init__(self, master, variable, values, width=160, height=32,
                 command=None, font=None, fg_color=None, button_color=None,
                 dropdown_fg_color=None, dropdown_hover_color=None,
                 dropdown_text_color=None, max_dropdown_height=220,
                 corner_radius=6, **kw):
        self._master   = master
        self._var      = variable
        self._values   = list(values)
        self._command  = command
        self._width    = width
        self._max_h    = max_dropdown_height
        self._popup    = None

        _font = font or ctk.CTkFont(family="Helvetica", size=13)
        _fg   = fg_color or ("#2b2b43", "#1e1e2e")
        _btn  = button_color or ("#3b3b5e", "#2a2a4a")

        self.button = ctk.CTkButton(
            master,
            textvariable=variable,
            width=width,
            height=height,
            corner_radius=corner_radius,
            font=_font,
            fg_color=_fg,
            hover_color=_btn,
            anchor="w",
            command=self._toggle,
            **{k: v for k, v in kw.items()
               if k in ("text_color", "border_width", "border_color")}
        )

    def pack(self, **kw):   self.button.pack(**kw)
    def grid(self, **kw):   self.button.grid(**kw)
    def place(self, **kw):  self.button.place(**kw)
    def pack_forget(self):  self.button.pack_forget()
    def grid_forget(self):  self.button.grid_forget()

    def configure(self, **kw):
        if "values" in kw:
            self._values = list(kw.pop("values"))
        if "variable" in kw:
            self._var = kw.pop("variable")
            self.button.configure(textvariable=self._var)
        if "command" in kw:
            self._command = kw.pop("command")
        if kw:
            self.button.configure(**kw)

    def set(self, value):
        self._var.set(value)

    def get(self):
        return self._var.get()

    def _toggle(self):
        if self._popup and self._popup.winfo_exists():
            self._close()
        else:
            if ScrollableDropdown._open_instance and \
               ScrollableDropdown._open_instance is not self:
                ScrollableDropdown._open_instance._close()
            self._open()

    def _open(self):
        ScrollableDropdown._open_instance = self

        self.button.update_idletasks()
        bx = self.button.winfo_rootx()
        by = self.button.winfo_rooty()
        bh = self.button.winfo_height()
        bw = self.button.winfo_width()

        screen_w = self.button.winfo_screenwidth()
        screen_h = self.button.winfo_screenheight()
        popup_w  = max(bw, self._width)

        # Clamp horizontally
        if bx + popup_w > screen_w - 10:
            bx = screen_w - popup_w - 10

        item_h    = 34
        n         = len(self._values)
        content_h = n * item_h
        actual_h  = min(content_h, self._max_h)

        # Clamp vertically: if popup would go off bottom, shrink it to fit
        space_below = screen_h - (by + bh) - 10
        actual_h = min(actual_h, space_below)
        actual_h = max(actual_h, item_h)  # always show at least one row

        popup = tk.Toplevel(self._master)
        popup.overrideredirect(True)
        popup.attributes("-topmost", True)
        popup.configure(bg="#1e2a45")
        popup.geometry(f"{popup_w}x{actual_h}+{bx}+{by + bh}")

        canvas = tk.Canvas(popup, bg="#1e2a45", highlightthickness=0,
                           width=popup_w, height=actual_h)
        vsb    = tk.Scrollbar(popup, orient="vertical", command=canvas.yview)
        canvas.configure(yscrollcommand=vsb.set)

        if content_h > actual_h:
            vsb.pack(side="right", fill="y")
        canvas.pack(side="left", fill="both", expand=True)

        inner = tk.Frame(canvas, bg="#1e2a45")
        win   = canvas.create_window((0, 0), window=inner, anchor="nw")

        def _on_inner_configure(_=None):
            canvas.configure(scrollregion=canvas.bbox("all"))
            canvas.itemconfig(win, width=popup_w - (16 if content_h > actual_h else 0))

        inner.bind("<Configure>", _on_inner_configure)

        def _on_mousewheel(e):
            if e.num == 4:   canvas.yview_scroll(-1, "units")
            elif e.num == 5: canvas.yview_scroll(1, "units")
            else:            canvas.yview_scroll(int(-1*(e.delta/120)), "units")

        canvas.bind_all("<MouseWheel>", _on_mousewheel)
        canvas.bind_all("<Button-4>",   _on_mousewheel)
        canvas.bind_all("<Button-5>",   _on_mousewheel)

        current = self._var.get()
        for val in self._values:
            is_sel = val == current
            bg     = "#2a3a6a" if is_sel else "#1e2a45"
            fg     = "#ffffff" if is_sel else "#ccccdd"

            row_f = tk.Frame(inner, bg=bg, cursor="hand2", height=item_h)
            row_f.pack(fill="x")
            row_f.pack_propagate(False)

            lbl = tk.Label(row_f, text=f"  {val}", bg=bg, fg=fg,
                           font=("Helvetica", 12), anchor="w")
            lbl.pack(fill="both", expand=True)

            def _on_enter(e, rf=row_f, lb=lbl, v=val):
                if v != self._var.get():
                    rf.configure(bg="#253060")
                    lb.configure(bg="#253060")

            def _on_leave(e, rf=row_f, lb=lbl, v=val):
                col = "#2a3a6a" if v == self._var.get() else "#1e2a45"
                rf.configure(bg=col)
                lb.configure(bg=col)

            def _select(e=None, v=val):
                self._var.set(v)
                self._close()
                if self._command:
                    self._command(v)

            row_f.bind("<Enter>",    _on_enter)
            row_f.bind("<Leave>",    _on_leave)
            row_f.bind("<Button-1>", _select)
            lbl.bind("<Enter>",      _on_enter)
            lbl.bind("<Leave>",      _on_leave)
            lbl.bind("<Button-1>",   _select)

        self._popup = popup
        popup.bind("<FocusOut>", lambda e: self._close_if_focus_lost())
        popup.after(100, lambda: popup.bind("<Button-1>", lambda e: None))
        self._master.winfo_toplevel().bind("<Button-1>",
                                           self._on_root_click, add="+")

    def _on_root_click(self, event):
        if self._popup and self._popup.winfo_exists():
            px, py = self._popup.winfo_rootx(), self._popup.winfo_rooty()
            pw, ph = self._popup.winfo_width(), self._popup.winfo_height()
            if not (px <= event.x_root <= px+pw and py <= event.y_root <= py+ph):
                self._close()

    def _close_if_focus_lost(self):
        try:
            focused = self._master.winfo_toplevel().focus_get()
            if focused is None:
                self._close()
        except Exception:
            self._close()

    def _close(self):
        if self._popup and self._popup.winfo_exists():
            try:
                self._popup.unbind_all("<MouseWheel>")
                self._popup.unbind_all("<Button-4>")
                self._popup.unbind_all("<Button-5>")
            except Exception:
                pass
            self._popup.destroy()
        self._popup = None
        if ScrollableDropdown._open_instance is self:
            ScrollableDropdown._open_instance = None
        try:
            self._master.winfo_toplevel().unbind("<Button-1>")
        except Exception:
            pass
