closeM = function () {};
const mp = (d) => ({
  id: d.id,
  first: d.first_name,
  last: d.last_name,
  email: d.email,
  phone: d.phone,
  company: d.company,
  job: d.job_title,
  diet: d.dietary_requirements,
  note: d.additional_notes,
  attendance: d.attendance_status,
  ref: d.referral_source,
  created: d.created_at,
});
(async () => {
  const s = await sb.auth.getSession();
  s.data.session ? gate() : login();
})();
function login(msg) {
  show(
    `<h4>ADMIN</h4><h2 id="mt">GOLE Launch RSVP Dashboard</h2><form id="lf"><label for="le">Email</label><input id="le" type="email" autocomplete="username" required><label for="lp">Password</label><input id="lp" type="password" autocomplete="current-password" required><div class="er" id="lerr" role="alert" style="font-size:14px">${msg || ""}</div><button class="btn p" style="width:100%;margin-top:12px">Sign in</button></form><p><a href="index.html" style="color:var(--m)">← Back to event page</a></p>`,
  );
  $("#lf").onsubmit = async (e) => {
    e.preventDefault();
    const r = await sb.auth.signInWithPassword({
      email: $("#le").value.trim(),
      password: $("#lp").value,
    });
    if (r.error) {
      $("#lerr").textContent = "Invalid email or password.";
      return;
    }
    notify("Welcome back. The RSVP dashboard is ready.", "success");
    gate();
  };
}
async function gate() {
  const a = await sb.rpc("is_admin");
  if (!a.data) {
    show(
      '<h2 id="mt">Access denied</h2><p>This account is not an admin.</p><button class="btn s" onclick="logout()">Log out</button>',
    );
    return;
  }
  await load();
  sb.channel("rsvps-live")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "rsvps" },
      () => load(),
    )
    .subscribe();
}
async function load() {
  const r = await sb
    .from("rsvps")
    .select("*")
    .order("created_at", { ascending: false });
  if (r.error) {
    show(
      '<h2 id="mt">Could not load RSVPs</h2><p>' +
        esc(r.error.message) +
        "</p>",
      1,
    );
    return;
  }
  rows = r.data.map(mp);
  adm();
}
async function logout() {
  await sb.removeAllChannels();
  await sb.auth.signOut();
  notify("You have been signed out.", "success");
  login();
}
function mailAll() {
  const b = rows
    .filter((r) => r.attendance != "declined")
    .map((r) => r.email)
    .join(";");
  open(
    OB +
      "mail/deeplink/compose?bcc=" +
      encodeURIComponent(b) +
      "&subject=" +
      encodeURIComponent("GOLE Cloud Go-Live Launch — 29 October 2026, 10:00") +
      "&body=" +
      encodeURIComponent(
        "Hello,\n\nA reminder of the GOLE Cloud Go-Live Launch.\n\n29 October 2026, 10:00\n" +
          EV.loc +
          "\n\nwww.gole.africa",
      ),
    "_blank",
    "noopener",
  );
}
function adm() {
  const q = ($("#q")?.value || "").toLowerCase(),
    co = $("#co")?.value || "";
  const c = (s) => rows.filter((r) => r.attendance == s).length,
    today = rows.filter(
      (r) =>
        (r.created || "").slice(0, 10) == new Date().toISOString().slice(0, 10),
    ).length;
  let L = rows
    .filter(
      (r) =>
        (filt == "all" || r.attendance == filt) &&
        (!co || r.company == co) &&
        `${r.first} ${r.last} ${r.email} ${r.company}`
          .toLowerCase()
          .includes(q),
    )
    .sort((a, b) => sortD * ((a.created || "") < (b.created || "") ? 1 : -1));
  const days = {};
  rows.forEach((r) => {
    const d = (r.created || "").slice(0, 10);
    days[d] = (days[d] || 0) + 1;
  });
  const dk = Object.keys(days).sort().slice(-14),
    mx = Math.max(1, ...dk.map((k) => days[k])),
    T = rows.length || 1;
  const cos = [...new Set(rows.map((r) => r.company))].sort();
  const qv = $("#q")?.value || "";
  show(
    `<h4>ADMIN</h4><button class="btn s sb" style="float:right" onclick="logout()">Log out</button><h2 id="mt">GOLE Launch RSVP Dashboard</h2><div class="sm"><div><small>TOTAL RSVPs</small><b>${rows.length}</b></div><div><small>CONFIRMED</small><b>${c("confirmed")}</b></div><div><small>MAYBE</small><b>${c("maybe")}</b></div><div><small>DECLINED</small><b>${c("declined")}</b></div><div><small>TODAY'S RSVPs</small><b>${today}</b></div></div>
<div class="r2"><div class="g" style="padding:14px"><small style="color:var(--t)">CONFIRMED RATE: ${Math.round((c("confirmed") / T) * 100)}%</small><div class="bars" role="img" aria-label="RSVPs per day" title="RSVPs per day">${dk.map((k) => `<i style="height:${(days[k] / mx) * 100}%" title="${k}: ${days[k]}"></i>`).join("")}</div><small style="color:var(--m)">RSVP trend (last 14 days)</small></div>
<div class="g" style="padding:14px">${["confirmed", "maybe", "declined"].map((s) => `<div style="font-size:12px;margin:6px 0">${s} (${c(s)})<div style="height:8px;border-radius:4px;background:var(--ln)"><div class="${s}" style="height:8px;border-radius:4px;width:${(c(s) / T) * 100}%;background:currentColor"></div></div></div>`).join("")}</div></div>
<div style="display:flex;gap:8px;flex-wrap:wrap;margin:16px 0"><input id="q" placeholder="Search name, email, company" value="${esc(qv)}" aria-label="Search" style="flex:1;min-width:160px" oninput="adm();$('#q').focus()"><select id="co" aria-label="Company" style="width:auto" onchange="adm()"><option value="">All companies</option>${cos.map((x) => `<option ${x == co ? "selected" : ""}>${esc(x)}</option>`).join("")}</select>
<button class="btn p sb" onclick="csv()">EXPORT RSVPs</button><button class="btn s sb" onclick="mailAll()">Email attendees (Outlook)</button></div><div>${["all", "confirmed", "maybe", "declined"].map((s) => `<button class="btn sb ${filt == s ? "p" : "s"}" onclick="filt='${s}';adm()">${s}</button>`).join("")}</div>
<div class="tb" style="margin-top:12px"><table><tr><th>Name</th><th>Email</th><th>Company</th><th>Job Title</th><th>Phone</th><th>Attendance</th><th onclick="sortD*=-1;adm()">Registered ⇅</th><th>Actions</th></tr>${L.map((r, i) => `<tr><td>${esc(r.first)} ${esc(r.last)}</td><td>${esc(r.email)}</td><td>${esc(r.company)}</td><td>${esc(r.job)}</td><td>${esc(r.phone)}</td><td><span class="bg ${r.attendance}">${r.attendance}</span></td><td>${(r.created || "").slice(0, 10)}</td><td><button class="btn s sb" onclick="vw('${r.id}')">View/Edit</button><button class="btn sb" style="border-color:#ff6b6b" onclick="rm('${r.id}')">Delete</button></td></tr>`).join("") || '<tr><td colspan="8">No RSVPs yet.</td></tr>'}</table></div>`,
    1,
  );
}
function vw(id) {
  const r = rows.find((x) => x.id == id);
  show(
    `<h4>RSVP</h4><h2 id="mt">${esc(r.first)} ${esc(r.last)}</h2><p style="color:var(--m)">${esc(r.email)} · ${esc(r.phone)}<br>${esc(r.job)}, ${esc(r.company)}<br>Heard via: ${esc(r.ref)} · Diet: ${esc(r.diet) || "—"}<br>Notes: ${esc(r.note) || "—"}</p><label for="st">Attendance status</label><select id="st">${["confirmed", "maybe", "declined"].map((s) => `<option ${r.attendance == s ? "selected" : ""}>${s}</option>`).join("")}</select><p><button class="btn p" onclick="sv('${id}')">Save</button> <button class="btn s" onclick="adm()">Back</button></p>`,
  );
}
async function sv(id) {
  const r = rows.find((x) => x.id == id);
  r.attendance = $("#st").value;
  const u = await sb
    .from("rsvps")
    .update({ attendance_status: r.attendance })
    .eq("id", id);
  if (u.error) {
    notify("The RSVP status could not be updated. Please try again.", "error");
    return;
  }
  notify("RSVP status was updated successfully.", "success");
  adm();
}
function rm(id) {
  show(
    `<h2 id="mt">Remove RSVP?</h2><p>Are you sure you want to remove this RSVP?</p><button class="btn p" style="background:#ff6b6b;border-color:#ff6b6b" onclick="rd('${id}')">Yes, remove</button> <button class="btn s" onclick="adm()">Cancel</button>`,
  );
}
async function rd(id) {
  const d = await sb.from("rsvps").delete().eq("id", id);
  if (d.error) {
    notify("The RSVP could not be deleted. Please try again.", "error");
    return;
  }
  rows = rows.filter((x) => x.id != id);
  notify("RSVP removed successfully.", "success");
  adm();
}
async function csv() {
  const H = [
      "First Name",
      "Last Name",
      "Email",
      "Phone",
      "Company",
      "Job Title",
      "Attendance",
      "Dietary Requirements",
      "Referral Source",
      "Registration Date",
    ],
    k = [
      "first",
      "last",
      "email",
      "phone",
      "company",
      "job",
      "attendance",
      "diet",
      "ref",
      "created",
    ];
  const q = (v) => '"' + String(v ?? "").replace(/"/g, '""') + '"';
  const t = [
    H.join(","),
    ...rows.map((r) => k.map((x) => q(r[x])).join(",")),
  ].join("\n");
  if (dl)
    try {
      await dl.save({ filename: "GOLE-RSVPs.csv", data: t });
    } catch (e) {}
  else {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([t], { type: "text/csv" }));
    a.download = "GOLE-RSVPs.csv";
    a.click();
  }
}
