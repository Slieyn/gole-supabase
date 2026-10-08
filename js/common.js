const $ = (s) => document.querySelector(s),
  ov = $("#ov"),
  md = $("#md");
let mine = null,
  att = "confirmed",
  rows = [],
  sortD = -1,
  filt = "all";
const EV = {
  t: "GOLE Cloud Go-Live Launch",
  loc: "Unit 10, Wild Fig Business Park, 1494 Cranberry Street, Honeydew, Roodepoort, 2170",
  d: "Join us for the official GOLE Cloud Go-Live Launch.",
};
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
function show(h, w) {
  md.className = "md" + (w ? " wide" : "");
  md.innerHTML =
    '<button class="x" aria-label="Close" onclick="closeM()">×</button>' + h;
  ov.classList.add("on");
  md.scrollTop = 0;
}
function closeM() {
  ov.classList.remove("on");
}
addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeM();
});
ov.addEventListener("click", (e) => {
  if (e.target === ov) closeM();
});
function notify(message, type = "success") {
  const tn = document.getElementById("gole-toast");
  if (!tn) {
    const t = document.createElement("div");
    t.id = "gole-toast";
    t.setAttribute("role", "status");
    document.body.appendChild(t);
  }
  const node = document.getElementById("gole-toast");
  node.className = "toast " + (type === "error" ? "error" : "success");
  node.textContent = message;
  node.classList.add("show");
  clearTimeout(node._to);
  node._to = setTimeout(() => node.classList.remove("show"), 3000);
}
const sb = window.supabase.createClient(
    window.GOLE.SUPABASE_URL,
    window.GOLE.SUPABASE_ANON_KEY,
  ),
  CFG_OK = !/YOUR-PROJECT/.test(window.GOLE.SUPABASE_URL);
const dl = {
  save: async ({ filename, data }) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([data]));
    a.download = filename;
    a.click();
  },
};
const OB = "https://outlook.office.com/";
function OL() {
  return (
    OB +
    "calendar/0/deeplink/compose?path=%2Fcalendar%2Faction%2Fcompose&rru=addevent&subject=" +
    encodeURIComponent(EV.t) +
    "&startdt=" +
    encodeURIComponent("2026-10-29T10:00:00+02:00") +
    "&enddt=" +
    encodeURIComponent("2026-10-29T12:00:00+02:00") +
    "&location=" +
    encodeURIComponent(EV.loc) +
    "&body=" +
    encodeURIComponent(EV.d)
  );
}
const BODY = (n) =>
  `Hello ${n},\n\nThank you for confirming your attendance at the GOLE Cloud Go-Live Launch.\n\n29 October 2026, 10:00\n${EV.loc}\n\nAfrica, we are live.\nwww.gole.africa`;
function EM(v) {
  return (
    OB +
    "mail/deeplink/compose?to=" +
    encodeURIComponent(v.email) +
    "&subject=" +
    encodeURIComponent("You're Invited — GOLE Cloud Go-Live Launch") +
    "&body=" +
    encodeURIComponent(BODY(v.first))
  );
}
