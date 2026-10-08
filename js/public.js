try {
  mine = JSON.parse(localStorage.getItem("gole_rsvp"));
} catch (e) {}
setTimeout(() => {
  if (!ov.classList.contains("on") && !mine) openInv();
}, 1500);
function openInv() {
  show(
    `<div style="text-align:center"><h4 style="font-size:15px">YOU'RE INVITED</h4><h2 id="mt" style="margin:0">GOLE CLOUD<br>GO-LIVE LAUNCH</h2><p style="font-size:22px;color:var(--t);font-style:italic">“Africa, we are live.”</p><p style="margin:18px 0 4px;font-weight:700;letter-spacing:.12em">29 OCTOBER 2026 · 10:00</p><p style="color:var(--m);margin:0 0 26px">Unit 10, Wild Fig Business Park<br>Honeydew, Roodepoort</p><p style="margin:0 0 22px">Join us for the official launch of an enterprise-grade cloud built for Africa. We'd love to see you there.</p><button class="btn p" style="width:100%;font-size:18px;padding:18px" onclick="openForm()">RSVP now!</button><p style="margin:14px 0 0"><button class="btn sb" style="border:0;color:var(--m);text-transform:none;width:auto" onclick="closeM()">Maybe later</button></p></div>`,
  );
}
const F = [
  ["first", "First Name", 1],
  ["last", "Last Name", 1],
  ["email", "Email Address", 1, "email"],
  ["phone", "Phone Number", 1, "tel"],
  ["company", "Company / Organisation", 1],
  ["job", "Job Title", 1],
];
function openForm() {
  const m = mine || {};
  att = m.attendance || "confirmed";
  const f = F.map(
    ([k, l, r, t]) =>
      `<div><label for="f_${k}">${l} <span>*</span></label><input id="f_${k}" type="${t || "text"}" value="${esc(m[k])}" autocomplete="on" required aria-describedby="e_${k}"><div class="er" id="e_${k}" role="alert"></div></div>`,
  );
  show(`<h4>RSVP</h4><h2 id="mt">${mine ? "Update your RSVP" : "Confirm your attendance"}</h2>${mine ? '<div class="nt">You\'ve already registered for this event. You can update your details below.</div>' : ""}<form id="fm" novalidate><div class="r2">${f.slice(0, 2).join("")}</div>${f.slice(2).join("")}
<label>Will you be attending? <span>*</span></label><div class="opt" role="group">${[
    ["confirmed", "YES, I'LL BE THERE"],
    ["maybe", "MAYBE"],
    ["declined", "UNABLE TO ATTEND"],
  ]
    .map(
      ([v, l]) =>
        `<button type="button" data-v="${v}" class="${att == v ? "on" : ""}" aria-pressed="${att == v}">${l}</button>`,
    )
    .join("")}</div>
<label for="f_ref">How did you hear about the event?</label><select id="f_ref">${["GOLE", "LinkedIn", "Email", "Colleague", "Invitation", "Other"].map((o) => `<option ${m.ref == o ? "selected" : ""}>${o}</option>`).join("")}</select>
<label for="f_diet">Dietary requirements</label><input id="f_diet" value="${esc(m.diet)}"><label for="f_note">Additional notes</label><textarea id="f_note" rows="2">${esc(m.note)}</textarea>
<div class="ck"><input type="checkbox" id="f_cons" ${m.consent ? "checked" : ""}><label for="f_cons" style="margin:0;color:#fff">I agree that GOLE may use the information provided to manage my event attendance. <span>*</span></label></div><div class="er" id="e_cons" role="alert"></div><div class="er" id="e_form" role="alert" style="font-size:14px"></div>
<button class="btn p" id="sub" style="width:100%">Confirm RSVP</button></form>`);
  document.querySelectorAll(".opt button").forEach(
    (b) =>
      (b.onclick = () => {
        att = b.dataset.v;
        document.querySelectorAll(".opt button").forEach((x) => {
          x.classList.toggle("on", x == b);
          x.setAttribute("aria-pressed", x == b);
        });
      }),
  );
  $("#fm").onsubmit = submit;
}
async function submit(e) {
  e.preventDefault();
  let ok = 1;
  const v = {};
  F.forEach(([k, l, r, t]) => {
    const el = $("#f_" + k),
      val = el.value.trim();
    v[k] = val;
    let m = "";
    if (!val) m = l + " is required.";
    else if (k == "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val))
      m = "Enter a valid email address.";
    else if (k == "phone" && val.replace(/\D/g, "").length < 9)
      m = "Enter a valid phone number.";
    $("#e_" + k).textContent = m;
    el.classList.toggle("bad", !!m);
    if (m) ok = 0;
  });
  if (!$("#f_cons").checked) {
    $("#e_cons").textContent = "Please accept to continue.";
    ok = 0;
  } else $("#e_cons").textContent = "";
  if (!ok) {
    document.querySelector(".bad")?.focus();
    return;
  }
  const key = v.email.toLowerCase().replace(/[^a-z0-9]/g, "_"),
    now = new Date().toISOString();
  Object.assign(v, {
    attendance: att,
    ref: $("#f_ref").value,
    diet: $("#f_diet").value.trim(),
    note: $("#f_note").value.trim(),
    consent: true,
    updated: now,
  });
  const b = $("#sub");
  b.disabled = true;
  b.textContent = "Saving…";
  try {
    const ex = await sb.rpc("rsvp_exists", { p_email: v.email });
    if (ex.error) throw ex.error;
    if (
      ex.data &&
      !window._upd &&
      !(mine && mine.email.toLowerCase() === v.email.toLowerCase())
    ) {
      b.disabled = false;
      b.textContent = "Confirm RSVP";
      $("#e_form").innerHTML =
        'You\'ve already registered for this event. <button type="button" class="btn s sb" id="upd">Update my RSVP</button>';
      $("#upd").onclick = () => {
        window._upd = 1;
        $("#fm").requestSubmit();
      };
      return;
    }
    const r = await sb.rpc("submit_rsvp", {
      p_first: v.first,
      p_last: v.last,
      p_email: v.email,
      p_phone: v.phone,
      p_company: v.company,
      p_job: v.job,
      p_diet: v.diet,
      p_note: v.note,
      p_status: att,
      p_ref: v.ref,
      p_consent: true,
    });
    if (r.error) throw r.error;
    window._upd = 0;
    try {
      localStorage.setItem("gole_rsvp", JSON.stringify(v));
    } catch (_) {}
    mine = v;
    sb.functions
      .invoke("send-confirmation", { body: { email: v.email } })
      .catch(() => {});
    done(v);
  } catch (x) {
    console.error(x);
    b.disabled = false;
    b.textContent = "Confirm RSVP";
    $("#e_form").textContent = CFG_OK
      ? "Something went wrong saving your RSVP. Please try again."
      : "Supabase is not configured yet. Add your project URL and anon key to js/config.js (see README).";
  }
}
function done(v) {
  const g = v.attendance == "declined";
  const msg = g
    ? "Your RSVP update has been saved. We are sorry you cannot attend."
    : v.attendance == "maybe"
      ? "Your RSVP has been saved as “maybe”. You can update it anytime."
      : "Your RSVP has been confirmed successfully. We look forward to welcoming you.";
  notify(msg, "success");
  show(`<div style="text-align:center"><div class="tk"><svg viewBox="0 0 24 24"><path d="m5 12 5 5 9-10"/></svg></div><h2 id="mt">${g ? "THANK YOU FOR LETTING US KNOW." : v.attendance == "maybe" ? "WE'VE NOTED YOUR RSVP." : "YOU'RE ON THE LIST."}</h2><p>Thank you, ${esc(v.first)}.</p><p style="color:var(--m)">${g ? "We're sorry you can't make it." : "Your attendance at the GOLE Cloud Go-Live Launch has been " + (v.attendance == "maybe" ? "recorded as “maybe”." : "confirmed.")}</p><p style="font-weight:700;color:var(--t)">29 October 2026 · 10:00<br><span style="color:#fff;font-weight:400">Unit 10, Wild Fig Business Park<br>Honeydew, Roodepoort</span></p>
${g ? "" : '<div class="btns" style="justify-content:center"><a class="btn p" target="_blank" rel="noopener" href="https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(EV.t) + "&dates=20261029T080000Z/20261029T100000Z&details=" + encodeURIComponent(EV.d) + "&location=" + encodeURIComponent(EV.loc) + '">Add to Google Calendar</a>' + '<a class="btn s" target="_blank" rel="noopener" href="' + OL() + '">Add to Outlook</a><button class="btn s" onclick="ics()">Calendar file (.ics)</button><a class="btn s" target="_blank" rel="noopener" href="' + EM(v) + '">Email me details (Outlook)</a></div>'}
<p style="margin-top:18px"><button class="btn s" onclick="closeM();location.hash=\'details\'">View event details</button></p></div>`);
}
async function ics() {
  const t = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//GOLE//Launch//EN",
    "BEGIN:VEVENT",
    "UID:gole-launch-2026@gole.africa",
    "DTSTAMP:20261001T000000Z",
    "DTSTART;TZID=Africa/Johannesburg:20261029T100000",
    "DTEND;TZID=Africa/Johannesburg:20261029T120000",
    "SUMMARY:" + EV.t,
    "LOCATION:" + EV.loc.replace(/,/g, "\\,"),
    "DESCRIPTION:" + EV.d,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  if (dl)
    try {
      await dl.save({ filename: "GOLE-Launch.ics", data: t });
    } catch (e) {}
  else {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([t], { type: "text/calendar" }));
    a.download = "GOLE-Launch.ics";
    a.click();
  }
}
function openSign() {
  show(
    `<h2 id="mt">Sign in</h2><div class="pn"><h3>ATTENDEE / CLIENT</h3><p style="margin:0 0 10px;color:var(--m);font-size:14px">${mine ? 'Your RSVP on this device: <b style="color:var(--t)">' + esc(mine.attendance) + "</b> (" + esc(mine.email) + ")" : "You haven't RSVP'd yet."}</p><button class="btn p sb" onclick="${mine ? "openForm()" : "openInv()"}">${mine ? "View / update my RSVP" : "RSVP now"}</button></div><div class="pn"><h3>ADMIN</h3><p style="margin:0 0 10px;color:var(--m);font-size:14px">GOLE event team sign in.</p><a class="btn p sb" href="admin.html">Admin sign in</a></div>`,
  );
}
