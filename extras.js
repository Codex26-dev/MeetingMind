/* MeetingMind extras v2: quotation builder + send + follow-up, post-meeting prompt, iOS install hint.
   Needs the one-line hook added to app.js (window.MM = ...). Load AFTER app.js. */
(() => {
  'use strict';
  const M = window.MM;
  if (!M) { console.warn('extras.js: window.MM hook missing in app.js'); return; }
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const db = () => M.db, esc = M.esc;
  const inr = n => '₹' + (Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  const STATUS = ['Draft', 'Sent', 'Follow-up', 'Won', 'Lost'];
  const calc = q => {
    const sub = (q.items || []).reduce((s, i) => s + (+i.qty || 0) * (+i.rate || 0), 0);
    const after = Math.max(0, sub - (+q.discount || 0)), gst = after * (+q.gst || 0) / 100;
    return { sub, gst, grand: after + gst };
  };
  const nextNo = () => 'Q-' + new Date().getFullYear() + '-' + String(db().quotes.filter(q => q.no).length + 1).padStart(3, '0');
  const contactFor = name => db().contacts.find(c => c.company && name && c.company.toLowerCase() === name.toLowerCase()) || {};

  const css = document.createElement('style');
  css.textContent = `.mmx-ov{position:fixed;inset:0;background:#000b;z-index:9999;display:flex;align-items:flex-end;justify-content:center}
  .mmx-card{background:#0b1a16;color:#e8f3ef;width:min(680px,100%);max-height:92vh;overflow:auto;border-radius:16px 16px 0 0;padding:16px;font:14px system-ui}
  .mmx-card h2{margin:0 0 8px;font-size:18px}.mmx-card label{font-size:12px;opacity:.8}
  .mmx-card input,.mmx-card select,.mmx-card textarea{width:100%;box-sizing:border-box;background:#12261f;color:inherit;border:1px solid #2a4a3f;border-radius:8px;padding:8px;margin:3px 0 8px;font:inherit}
  .mmx-row{display:flex;gap:6px;align-items:flex-end;flex-wrap:wrap}.mmx-row>*{flex:1;min-width:90px}.mmx-row .x{flex:0 0 auto;min-width:0}`;
  document.head.appendChild(css);

  function modal(html) {
    const ov = document.createElement('div'); ov.className = 'mmx-ov';
    ov.innerHTML = '<div class="mmx-card">' + html + '</div>';
    ov.addEventListener('mousedown', e => { if (e.target === ov) ov.remove(); });
    document.body.appendChild(ov); return ov;
  }

  // ---- follow-up tasks live in the existing Tasks list so reminders/overdue already work ----
  function setFollowUp(q, date) {
    db().tasks = db().tasks.filter(t => !(t.quoteId === q.id && !t.done));
    q.followUpDate = date;
    if (!date || ['Won', 'Lost'].includes(q.status)) return;
    const t = { id: M.id(), title: `Follow up quotation ${q.no} · ${q.customer}`, due: date, done: false, notes: q.title || 'Quotation follow-up', quoteId: q.id };
    db().tasks.push(t); M.scheduleReminder && M.scheduleReminder(t);
  }

  // ---- quotation builder ----
  function openQuote(q, pre = {}) {
    const isNew = !q;
    q = q || { id: M.id(), no: nextNo(), customer: pre.customer || '', phone: pre.phone || '', email: pre.email || '', title: pre.title || '', amount: '', date: M.today(),
      items: [{ desc: '', qty: 1, rate: 0 }], discount: 0, gst: 18, validTill: M.shiftDay(15), notes: 'Payment: 50% advance, balance on delivery.', status: 'Draft', followUpDate: '', log: [], meetingId: pre.meetingId || '' };
    if (!q.items) q.items = [{ desc: '', qty: 1, rate: +String(q.amount).replace(/[^\d.]/g, '') || 0 }], q.gst = q.gst ?? 18, q.discount = q.discount || 0, q.validTill = q.validTill || M.shiftDay(15), q.log = q.log || [];
    const ov = modal(''), card = ov.firstChild;
    const val = id => card.querySelector('#' + id).value;
    const bind = () => {
      q.customer = val('c'); q.title = val('t'); q.phone = val('ph'); q.email = val('em'); q.discount = +val('d') || 0; q.gst = +val('g') || 0;
      q.validTill = val('v'); q.notes = val('n'); q.status = val('s'); const fu = val('fu');
      if (fu !== (q.followUpDate || '') || ['Won', 'Lost'].includes(q.status)) setFollowUp(q, ['Won', 'Lost'].includes(q.status) ? '' : fu);
    };
    const commit = nb => { if (!nb) bind(); q.amount = inr(calc(q).grand); const i = db().quotes.findIndex(x => x.id === q.id); i < 0 ? db().quotes.push(q) : (db().quotes[i] = q); M.save(); M.renderAll(); };
    const sent = how => { bind(); if (q.status === 'Draft') q.status = 'Sent'; q.log.push({ at: Date.now(), what: 'Sent via ' + how }); setFollowUp(q, M.shiftDay(3)); commit(true); draw(); };
    const draw = () => {
      const t = calc(q);
      card.innerHTML = `<h2>${esc(q.no)}</h2>
      <div class="mmx-row"><div><label>Customer</label><input id="c" value="${esc(q.customer)}"></div><div><label>Quotation for</label><input id="t" value="${esc(q.title)}"></div></div>
      <div class="mmx-row"><div><label>WhatsApp (with country code)</label><input id="ph" inputmode="tel" value="${esc(q.phone)}"></div><div><label>Email</label><input id="em" type="email" value="${esc(q.email)}"></div></div>
      <label>Items</label>${q.items.map((it, i) => `<div class="mmx-row"><input style="flex:3" data-i="${i}" data-f="desc" placeholder="Item" value="${esc(it.desc)}"><input data-i="${i}" data-f="qty" type="number" min="0" value="${it.qty}"><input data-i="${i}" data-f="rate" type="number" min="0" value="${it.rate}"><button class="row-action x" data-del="${i}">✕</button></div>`).join('')}
      <button class="row-action" id="add">+ item</button>
      <div class="mmx-row" style="margin-top:8px"><div><label>Discount ₹</label><input id="d" type="number" value="${q.discount}"></div><div><label>GST %</label><input id="g" type="number" value="${q.gst}"></div><div><label>Valid till</label><input id="v" type="date" value="${esc(q.validTill)}"></div></div>
      <label>Notes / terms</label><textarea id="n" rows="2">${esc(q.notes)}</textarea>
      <p>Subtotal ${inr(t.sub)} · GST ${inr(t.gst)} · <b>Total ${inr(t.grand)}</b></p>
      <div class="mmx-row"><div><label>Status</label><select id="s">${STATUS.map(s => `<option${s === q.status ? ' selected' : ''}>${s}</option>`).join('')}</select></div><div><label>Next follow-up</label><input id="fu" type="date" value="${esc(q.followUpDate || '')}"></div></div>
      <div class="mmx-row"><button class="primary" id="save">Save</button><button class="row-action" id="wa">WhatsApp</button><button class="row-action" id="mail">Email</button><button class="row-action" id="pdf">PDF / Print</button></div>
      <p style="opacity:.7;font-size:12px">Sending opens WhatsApp/Email with the message ready; you tap Send. Status becomes “Sent” and a follow-up task is added for 3 days later.</p>
      <div class="mmx-row"><button class="row-action" id="done">Follow-up done (next in 3 days)</button><button class="row-action" id="close">Close</button></div>
      ${q.log.length ? '<small style="opacity:.7">' + q.log.slice(-4).map(l => new Date(l.at).toLocaleDateString() + ' ' + esc(l.what)).join(' · ') + '</small>' : ''}`;
      $$('[data-f]', card).forEach(inp => inp.onchange = () => { bind(); q.items[inp.dataset.i][inp.dataset.f] = inp.dataset.f === 'desc' ? inp.value : +inp.value; draw(); });
      $$('[data-del]', card).forEach(b => b.onclick = () => { bind(); q.items.splice(+b.dataset.del, 1); if (!q.items.length) q.items.push({ desc: '', qty: 1, rate: 0 }); draw(); });
      $('#add', card).onclick = () => { bind(); q.items.push({ desc: '', qty: 1, rate: 0 }); draw(); };
      $('#save', card).onclick = () => { commit(); ov.remove(); M.notify('Quotation saved'); };
      $('#close', card).onclick = () => ov.remove();
      $('#done', card).onclick = () => { bind(); q.log.push({ at: Date.now(), what: 'Follow-up done' }); if (q.status === 'Sent') q.status = 'Follow-up'; setFollowUp(q, M.shiftDay(3)); commit(true); draw(); };
      $('#wa', card).onclick = () => { bind(); if (!q.phone.replace(/\D/g, '')) return M.notify('Add a WhatsApp number first'); sent('WhatsApp'); window.open('https://wa.me/' + q.phone.replace(/\D/g, '') + '?text=' + encodeURIComponent(textOf(q)), '_blank'); };
      $('#mail', card).onclick = () => { bind(); sent('Email'); location.href = 'mailto:' + encodeURIComponent(q.email) + '?subject=' + encodeURIComponent('Quotation ' + q.no) + '&body=' + encodeURIComponent(textOf(q)); };
      $('#pdf', card).onclick = () => { commit(); printQ(q); };
    };
    draw();
  }
  const textOf = q => { const t = calc(q); return `Dear ${q.customer},\nThank you for your time. Quotation ${q.no}${q.title ? ' – ' + q.title : ''}:\n` + q.items.map(i => `- ${i.desc} x${i.qty} @ ${inr(i.rate)}`).join('\n') + `\nGST ${q.gst}%: ${inr(t.gst)}\nTotal: ${inr(t.grand)}\nValid till ${q.validTill}.\n${q.notes}`; };
  function printQ(q) {
    const t = calc(q), w = window.open('', '_blank'); if (!w) return M.notify('Allow pop-ups to print');
    w.document.write(`<title>${esc(q.no)}</title><body style="font:14px system-ui;max-width:700px;margin:24px auto"><h2>Quotation ${esc(q.no)}</h2><p>To: ${esc(q.customer)}<br>Date: ${esc(q.date)} · Valid till ${esc(q.validTill)}</p>
    <table width="100%" border="1" cellspacing="0" cellpadding="6"><tr><th align="left">Item</th><th>Qty</th><th>Rate</th><th>Amount</th></tr>${q.items.map(i => `<tr><td>${esc(i.desc)}</td><td align="center">${i.qty}</td><td align="right">${inr(i.rate)}</td><td align="right">${inr(i.qty * i.rate)}</td></tr>`).join('')}</table>
    <p align="right">Discount ${inr(q.discount)}<br>GST ${q.gst}% ${inr(t.gst)}<br><b>Total ${inr(t.grand)}</b></p><p>${esc(q.notes)}</p><script>onload=()=>print()<\/script>`); w.document.close();
  }

  // ---- hook into the Quotes & payments screen ----
  document.addEventListener('click', e => {
    const add = e.target.closest('[data-action="add-quote"]');
    if (add) { e.stopPropagation(); e.preventDefault(); openQuote(); return; }
    const open = e.target.closest('[data-mmx="open"]');
    if (open) { e.stopPropagation(); openQuote(db().quotes.find(x => x.id === open.closest('[data-id]').dataset.id)); }
  }, true);
  function decorate() {
    $$('#quote-list .data-row').forEach(r => {
      if ($('[data-mmx]', r)) return;
      const box = $('.row-actions', r), q = db().quotes.find(x => x.id === r.dataset.id); if (!box || !q) return;
      const b = document.createElement('button'); b.className = 'row-action'; b.dataset.mmx = 'open'; b.textContent = 'Open / Send'; box.prepend(b);
      if (q.followUpDate) $('small', r).append(' · follow-up ' + M.fmtDate(q.followUpDate));
    });
  }
  new MutationObserver(decorate).observe($('.content'), { childList: true, subtree: true }); decorate();

  // ---- ask after a meeting is done ----
  function checkMeetings() {
    if ($('.mmx-ov') || $('dialog[open]')) return;
    const now = Date.now();
    const m = db().meetings.find(m => { const end = new Date(`${m.date}T${m.time || '09:00'}`).getTime() + (+m.duration || 30) * 6e4; return end <= now && now - end < 48 * 36e5 && !m.asked; });
    if (!m) return;
    m.asked = true; M.save();
    const internal = (m.customer || '').toLowerCase() === 'internal';
    const opts = (internal ? [] : ['Interested – send quotation', 'Needs time to decide']).concat(['Reschedule / next meeting', internal ? 'Done' : 'Not interested', 'Meeting did not happen']);
    const ov = modal(`<h2>Meeting done?</h2><p><b>${esc(m.title)}</b></p><label>Outcome</label><select id="o">${opts.map(o => `<option>${o}</option>`).join('')}</select>
      <label>Notes / what was agreed</label><textarea id="nt" rows="3"></textarea><div class="mmx-row"><button class="primary" id="go">Save</button><button class="row-action" id="later">Ask later</button></div>`);
    $('#later', ov).onclick = () => { m.asked = false; M.save(); ov.remove(); };
    $('#go', ov).onclick = () => {
      const o = $('#o', ov).value, nt = $('#nt', ov).value.trim();
      m.outcome = o; m.outcomeNotes = nt;
      if (nt) db().memories.push({ id: M.id(), title: m.customer || m.title, body: nt, source: 'Meeting outcome · ' + M.fmtDate(m.date) });
      if (o.startsWith('Needs')) db().tasks.push({ id: M.id(), title: `Follow up with ${m.customer || m.title}`, due: M.shiftDay(2), done: false, notes: nt || m.title });
      M.save(); M.renderAll(); ov.remove();
      if (o.startsWith('Interested')) { const c = contactFor(m.customer); openQuote(null, { customer: m.customer, phone: c.phone, email: c.email, title: m.title, meetingId: m.id }); }
      if (o.startsWith('Reschedule')) { M.setView('schedule'); M.openForm('meeting', { title: m.title, customer: m.customer, attendees: m.attendees, date: M.shiftDay(7), time: m.time, duration: m.duration, notes: nt }); }
    };
  }
  setTimeout(checkMeetings, 1500); setInterval(checkMeetings, 60000);

  // ---- iOS has no install prompt: show the existing Install button with a hint ----
  if (/iphone|ipad|ipod/i.test(navigator.userAgent) && !navigator.standalone) { const b = $('#install-app'); if (b) { b.classList.add('visible'); b.addEventListener('click', () => M.notify('Safari → Share → Add to Home Screen')); } }
})();
