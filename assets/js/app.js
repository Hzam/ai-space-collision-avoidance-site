/* Bilingual static research website + interactive demo (precomputed results only).
 * Text lives in assets/i18n/<lang>.json; every number comes from assets/data/results.json (verified
 * project results) or assets/data/demo_events.json via {{path|format}} placeholders.
 * The page never retrains or re-runs models: it only displays precomputed, verified outputs. */
(function () {
  const lang = document.documentElement.lang || "en";
  const base = "../";
  let T = {}, R = {}, D = {};

  const get = (obj, path) => path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
  const nf = (v, d) => (v == null || isNaN(v) ? "–" : Number(v).toLocaleString(lang === "ar" ? "ar-u-nu-latn" : "en-US",
    { minimumFractionDigits: d, maximumFractionDigits: d }));
  function fmt(v, f) {
    if (v == null) return "–";
    if (!f) return typeof v === "number" ? nf(v, Number.isInteger(v) ? 0 : 3) : String(v);
    if (f === "pct") return nf(v * 100, 1) + "%";
    if (f === "pct0") return nf(v * 100, 0) + "%";
    if (f === "cms") return nf(v * 100, 2);
    if (f === "sci") return Number(v).toExponential(1);
    if (/^\d$/.test(f)) return nf(v, Number(f));
    return String(v);
  }
  const fill = (s) => String(s).replace(/\{\{([^}|]+)\|?([^}]*)\}\}/g, (_, p, f) => fmt(get(R, p.trim()), f.trim()));
  const t = (k) => fill(get(T, k) ?? k);
  const el = (tag, attrs = {}, html = "") => { const e = document.createElement(tag); Object.assign(e, attrs); if (html) e.innerHTML = html; return e; };

  async function load() {
    [T, R, D] = await Promise.all([
      fetch(base + "assets/i18n/" + lang + ".json").then((r) => r.json()),
      fetch(base + "assets/data/results.json").then((r) => r.json()),
      fetch(base + "assets/data/demo_events.json").then((r) => r.json()),
    ]);
    render();
  }

  function render() {
    document.title = t("meta.title");
    document.querySelectorAll("[data-i18n]").forEach((n) => { n.innerHTML = t(n.dataset.i18n); });
    document.querySelectorAll("[data-list]").forEach((n) => {
      n.innerHTML = (get(T, n.dataset.list) || []).map((x) => "<li>" + fill(x) + "</li>").join("");
    });
    document.querySelectorAll("[data-stat]").forEach((n) => {
      const [path, f] = n.dataset.stat.split("|");
      n.textContent = fmt(get(R, path), f);
    });
    tables();
    refs();
    const ack = document.getElementById("acknowledgements");
    if (ack && get(T, "ack.title")) ack.hidden = false;  // optional section, shown only when its text exists
    demo();
  }

  const tbl = (head, rows, best) => `<table><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>` +
    rows.map((r, i) => `<tr${best === i ? ' class="best"' : ""}>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("") + "</tbody></table>";
  const put = (id, html) => { const e = document.getElementById(id); if (e) e.innerHTML = html; };
  const M = ["A_latest_risk_baseline", "B_logistic_simple", "C_random_forest", "D_xgboost"];

  function tables() {
    const P = R.prediction.official_test, CI = R.prediction.official_test_ci95, O = R.official_metric;
    const predRows = M.map((k) => [t("models." + k), nf(P[k].precision, 3), nf(P[k].recall, 3),
      `${nf(P[k].f2, 3)} <span class="kicker">[${nf(CI[k].f2[0], 2)}–${nf(CI[k].f2[1], 2)}]</span>`, nf(P[k].pr_auc, 3),
      nf(P[k].roc_auc, 3), `<b>${nf(O[k].score_MSE_HR_over_F2, 3)}</b>`]);
    const predHead = [t("tbl.model"), t("tbl.precision"), t("tbl.recall"), "F2 [95% CI]", "PR-AUC", "ROC-AUC", t("tbl.official")];
    put("pred-table", tbl(predHead, predRows, 0) + `<p class="kicker">${t("tbl.pred_note")}</p>`);
    put("res-pred", tbl(predHead, predRows, 0));
    put("res-official", tbl([t("tbl.model"), "F2", "MSE_HR", t("tbl.official")],
      M.map((k) => [t("models." + k), nf(O[k].F2, 3), nf(O[k].MSE_HR, 3), nf(O[k].score_MSE_HR_over_F2, 3)]), 0) +
      `<p class="kicker">${t("tbl.official_note")}</p>`);
    const ew = R.prediction.early_warning_f2;
    put("res-early", tbl([t("tbl.cutoff"), t("tbl.events")].concat(M.map((k) => t("models_short." + k))),
      Object.keys(ew).map((c) => [parseInt(c), `${ew[c].test_events} (${ew[c].test_high_risk})`].concat(M.map((k) => nf(ew[c][k], 3))))));
    const Y = R.yolo, S = Y.seed_runs;
    const yRows = [
      [t("tbl.precision"), nf(Y.test.precision, 3), `${nf(S.precision[0], 3)} ± ${nf(S.precision[1], 3)}`],
      [t("tbl.recall"), nf(Y.test.recall, 3), `${nf(S.recall[0], 3)} ± ${nf(S.recall[1], 3)}`],
      ["mAP50", nf(Y.test.mAP50, 3), `${nf(S.mAP50[0], 3)} ± ${nf(S.mAP50[1], 3)}`],
      ["mAP50-95", nf(Y.test.mAP50_95, 3), `${nf(S.mAP50_95[0], 3)} ± ${nf(S.mAP50_95[1], 3)}`],
      [t("tbl.fp_bg"), `${Y.false_positives_on_background_images} / ${Y.background_images}`, "–"],
      [t("tbl.fps"), nf(Y.fps, 0), "–"]];
    const yHead = [t("tbl.metric"), t("tbl.main_model"), t("tbl.three_seeds")];
    put("yolo-table", tbl(yHead, yRows)); put("res-yolo", tbl(yHead, yRows));
    const K = R.tracking, X = K.exploratory_range_from_apparent_size;
    const kRows = [
      [t("trk.seq"), `${K.n_sequences} (${K.n_frames} ${t("trk.frames")})`],
      [t("trk.det"), `${fmt(K.detection_rate[0], "pct")} ± ${fmt(K.detection_rate[1], "pct")}`],
      [t("trk.bearing"), `<b>${nf(K.track_bearing_rmse_deg_median_over_sequences, 3)}°</b>`],
      [t("trk.fail"), `${K.sequences_with_track_failure} / ${K.n_sequences}`],
      [t("trk.center"), `${nf(K.detection_center_error_px_median[0], 2)} px`],
      [t("trk.range"), `${fmt(X.range_rel_error_median, "pct0")} <span class="tag sim">${t("trk.exploratory")}</span>`]];
    put("track-table", tbl([t("tbl.metric"), t("tbl.value")], kRows)); put("res-track", tbl([t("tbl.metric"), t("tbl.value")], kRows));
    const N = R.maneuver, E = R.error_propagation.safe_rate;
    put("res-man", tbl([t("tbl.metric"), t("tbl.value")], [
      [t("man.triggered"), N.triggered_events], [t("man.already"), N.already_safe], [t("man.need"), N.needing_maneuver],
      [t("man.feasible"), `${N.feasible} / ${N.needing_maneuver} <span class="kicker">(${t("man.perfect")})</span>`],
      [t("man.dv"), `${fmt(N.dv_median_mps, "cms")} cm/s`],
      [t("man.safe_real"), `<b>${fmt(E.typical_10km_k3, "pct")}</b> <span class="kicker">(${t("man.real_cfg")})</span>`],
      [t("man.cw"), fmt(N.validation.cw_max_rel_err, "pct")], [t("man.pc"), fmt(N.validation.pc_high_risk_flag_agreement, "pct")]]));
    const prop = tbl([t("prop.err"), "1 km, k=0", "1 km, k=3", "10 km, k=0", "10 km, k=3", "50 km, k=0", "50 km, k=3"],
      [["typical", "with_failures"]].flat().map((c) => [t("prop." + c)].concat(
        ["1km_k0", "1km_k3", "10km_k0", "10km_k3", "50km_k0", "50km_k3"].map((x) => fmt(E[`${c}_${x}`], "pct")))));
    put("prop-table", prop + `<p class="kicker">${t("prop.note")}</p>`); put("res-prop", prop + `<p class="kicker">${t("prop.note")}</p>`);
  }

  function refs() {
    const host = document.getElementById("ref-list");
    if (!host) return;
    host.innerHTML = (T.references || []).map((r) => `<li>${r}</li>`).join("");
  }

  // ------------------------------------------------------------------ SVG helpers
  function svgChart(w, h, pad, xr, yr, opts = {}) {
    const ns = "http://www.w3.org/2000/svg";
    const s = document.createElementNS(ns, "svg");
    s.setAttribute("viewBox", `0 0 ${w} ${h}`); s.setAttribute("width", "100%"); s.setAttribute("direction", "ltr");
    s.style.direction = "ltr";
    const cid = "clip" + Math.random().toString(36).slice(2);
    const sx = (x) => {
      const u = opts.logx ? (Math.log10(x) - Math.log10(xr[0])) / (Math.log10(xr[1]) - Math.log10(xr[0])) : (x - xr[0]) / (xr[1] - xr[0]);
      return pad + (opts.flipx ? 1 - u : u) * (w - 2 * pad);
    };
    const sy = (y) => {
      const u = opts.logy ? (Math.log10(y) - Math.log10(yr[0])) / (Math.log10(yr[1]) - Math.log10(yr[0])) : (y - yr[0]) / (yr[1] - yr[0]);
      return h - pad - u * (h - 2 * pad);
    };
    const add = (tag, a, parent) => { const e = document.createElementNS(ns, tag); for (const k in a) e.setAttribute(k, a[k]); (parent || s).appendChild(e); return e; };
    const defs = add("defs", {});
    const cp = add("clipPath", { id: cid }, defs);
    add("rect", { x: pad, y: pad, width: w - 2 * pad, height: h - 2 * pad }, cp);
    add("rect", { x: pad, y: pad, width: w - 2 * pad, height: h - 2 * pad, fill: "none", class: "axis" });
    const plot = add("g", { "clip-path": `url(#${cid})` });
    const addp = (tag, a) => add(tag, a, plot);
    const text = (x, y, str, a = {}) => { const e = add("text", { x, y, ...a }); e.textContent = str; return e; };
    const line = (pts, a) => addp("polyline", { points: pts.map((p) => sx(p[0]) + "," + sy(p[1])).join(" "), fill: "none", ...a });
    const logTicks = (axis, r) => {
      for (let e = Math.ceil(Math.log10(Math.min(...r))); e <= Math.floor(Math.log10(Math.max(...r))); e++) {
        const v = Math.pow(10, e), lab = v >= 1 ? String(v) : v.toString();
        if (axis === "x") text(sx(v), h - pad + 14, lab, { "text-anchor": "middle" });
        else text(pad - 5, sy(v) + 4, lab, { "text-anchor": "end" });
      }
    };
    return { s, sx, sy, add, addp, text, line, logTicks, w, h, pad };
  }

  // ------------------------------------------------------------------ interactive demo
  let cur = null, step = 0, frameIdx = 0, timer = null;
  const STEPS = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9", "s10"];
  const REAL_STEPS = new Set([0, 1, 2]);

  function demo() {
    const host = document.getElementById("demo");
    if (!host) return;
    const sel = document.getElementById("demo-event");
    sel.innerHTML = D.events.map((e, i) => `<option value="${i}">${t("demo.event")} ${e.event_id} — ${t("demo.kind_" + e.kind)}</option>`).join("");
    sel.onchange = () => { cur = D.events[Number(sel.value)]; step = 0; frameIdx = 0; draw(); };
    document.getElementById("demo-prev").onclick = () => { step = Math.max(0, step - 1); draw(); };
    document.getElementById("demo-next").onclick = () => { step = Math.min(maxStep(), step + 1); draw(); };
    // Deep links (also used to record the offline demo): ?event=<index>&step=<1-10>
    const q = new URLSearchParams(location.search);
    const ei = Math.min(Number(q.get("event") || 0), D.events.length - 1);
    cur = D.events[ei]; sel.value = String(ei);
    if (q.has("step")) {
      step = Math.max(0, Math.min(maxStep(), Number(q.get("step")) - 1));
      if (q.has("frame")) frameIdx = Math.min(Number(q.get("frame")), cur.frames.length - 1);
      if (q.get("only") === "demo") document.body.classList.add("only-demo");  // used for offline recordings
      else document.getElementById("demo-section").scrollIntoView();
    }
    draw();
  }
  const triggered = () => cur.decision.state === "HIGH_RISK_TRIGGER";
  const maxStep = () => (triggered() ? STEPS.length - 1 : 2);

  function draw() {
    if (timer) { clearInterval(timer); timer = null; }
    const nav = document.getElementById("demo-steps");
    nav.innerHTML = "";
    STEPS.forEach((k, i) => {
      const b = el("button", { className: (i === step ? "active " : "") + (REAL_STEPS.has(i) ? "real-step" : "sim-step") }, (i + 1) + ". " + t("demo.steps." + k));
      b.disabled = i > maxStep();
      if (b.disabled) b.style.opacity = 0.35;
      b.onclick = () => { step = i; draw(); };
      nav.appendChild(b);
    });
    const viz = document.getElementById("demo-viz"), ex = document.getElementById("demo-explain");
    viz.innerHTML = ""; ex.innerHTML = "";
    const tag = REAL_STEPS.has(step) ? `<span class="tag real">${t("badge.real")}</span>` : `<span class="tag sim">${t("badge.sim")}</span>`;
    ex.innerHTML = `${tag}<h3>${t("demo.steps." + STEPS[step])}</h3><p>${fillEvent(t("demo.explain." + STEPS[step]))}</p>`;
    [drawCDM, drawPrediction, drawDecision, drawFrames, drawDetections, drawTrack, drawBearing, drawCandidates, drawSelected, drawBeforeAfter][step](viz, ex);
  }

  function fillEvent(s) {
    const e = cur;
    const map = {
      event_id: e.event_id, n_cdms: e.cdm_history.length, prob: nf(e.prediction.probability_high_risk, 3),
      thr: nf(e.prediction.threshold, 3), latest: nf(e.prediction.latest_risk, 2), final: nf(e.final_risk, 2),
      truth: e.final_risk >= -6 ? t("demo.truth_high") : t("demo.truth_low"), state: t("states." + e.decision.state),
    };
    if (e.vision) Object.assign(map, {
      frames: e.vision.frames, det: nf(e.vision.detection_rate * 100, 1), brmse: nf(e.vision.track_bearing_rmse_deg, 3),
      pmiss: e.vision.cpa_estimate ? nf(e.vision.cpa_estimate.pred_miss_m, 1) : "–", tmiss: e.vision.cpa_estimate ? nf(e.vision.cpa_estimate.true_miss_m, 1) : "–",
      cpaerr: e.vision.cpa_estimate ? nf(Math.abs(e.vision.cpa_estimate.miss_err_m), 1) : "–", center: nf(e.vision.median_center_error_px, 2),
    });
    if (e.maneuver) {
      const m = e.maneuver, s = m.selected;
      Object.assign(map, {
        nc: m.n_candidates, ns: m.n_safe, miss0: nf(m.before.miss_m, 0), pc0: Number(m.before.pc).toExponential(1),
        safe: nf(m.safe_miss_m, 0), margin: nf(m.perception_margin_m, 1),
        dir: s ? s.direction : "–", dv: s ? nf(s.dv_mps * 100, 2) : "–", lead: s ? nf(s.lead_time_days, 2) : "–",
        miss1: s ? nf(s.miss_m, 0) : "–", pc1: s ? Number(s.pc).toExponential(1) : "–",
      });
    }
    return s.replace(/\{(\w+)\}/g, (_, k) => (k in map ? map[k] : "{" + k + "}"));
  }

  function drawCDM(viz) {
    const h = cur.cdm_history;
    const xs = h.map((r) => r.time_to_tca), ys = h.map((r) => r.risk);
    const ymin = Math.min(-8, ...ys) - 0.5, ymax = Math.max(-4, ...ys) + 0.5;
    const c = svgChart(560, 300, 40, [Math.max(...xs) + 0.2, 0], [ymin, ymax]);
    c.line([[Math.max(...xs) + 0.2, -6], [0, -6]], { stroke: "#ef4444", "stroke-dasharray": "5 4" });
    c.line([[2, ymin], [2, ymax]], { stroke: "currentColor", "stroke-dasharray": "2 3", opacity: 0.5 });
    c.line(h.map((r) => [r.time_to_tca, r.risk]), { stroke: "#3b82f6", "stroke-width": 2 });
    h.forEach((r) => c.add("circle", { cx: c.sx(r.time_to_tca), cy: c.sy(r.risk), r: 3.5, fill: "#3b82f6" }));
    c.text(c.sx(2) + 4, c.pad + 12, t("demo.cutoff"));
    c.text(c.pad + 4, c.sy(-6) - 4, "10⁻⁶");
    c.text(c.w / 2, c.h - 8, t("demo.x_days"), { "text-anchor": "middle" });
    c.text(10, c.pad - 10, t("demo.y_risk"));
    [Math.ceil(ymin), -6, Math.floor(ymax)].forEach((y) => c.text(c.pad - 6, c.sy(y) + 4, String(y), { "text-anchor": "end" }));
    viz.appendChild(c.s);
  }

  function drawPrediction(viz) {
    const p = cur.prediction;
    const c = svgChart(560, 160, 30, [0, 1], [0, 1]);
    c.add("rect", { x: c.sx(0), y: 60, width: c.sx(p.probability_high_risk) - c.sx(0), height: 40, fill: "#3b82f6", rx: 4 });
    c.line([[p.threshold, 0], [p.threshold, 1]], { stroke: "currentColor", "stroke-dasharray": "4 3" });
    c.text(c.sx(p.threshold) + 4, 50, t("demo.threshold") + " " + nf(p.threshold, 3));
    c.text(c.sx(0), 125, "0"); c.text(c.sx(1) - 8, 125, "1");
    c.text(c.w / 2, 150, t("demo.prob_axis"), { "text-anchor": "middle" });
    viz.appendChild(c.s);
  }

  function drawDecision(viz) {
    viz.innerHTML = `<div style="padding:30px;text-align:center"><div class="state-pill state-${cur.decision.state}" style="font-size:1.3rem">
      ${t("states." + cur.decision.state)}</div><p class="note" style="margin-top:16px">${t("demo.thresholds_experimental")}</p>
      <p>${t("demo.truth_label")}: <b>${cur.final_risk >= -6 ? t("demo.truth_high") : t("demo.truth_low")}</b> (10^${nf(cur.final_risk, 2)})</p></div>`;
  }

  function frameImg(i) { return base + "assets/" + cur.frames[i]; }

  function drawFrames(viz) {
    const n = cur.frames.length;
    viz.innerHTML = `<div class="frame-wrap"><img id="fimg" alt="synthetic frame"></div>
      <input id="fslider" type="range" min="0" max="${n - 1}" value="${frameIdx}"><div class="note" id="fcap"></div>
      <button id="fplay" class="primary" style="margin-top:6px">▶ / ❚❚</button>`;
    const img = viz.querySelector("#fimg"), sl = viz.querySelector("#fslider"), cap = viz.querySelector("#fcap");
    const show = () => { img.src = frameImg(frameIdx); cap.textContent = t("demo.frame") + " " + cur.frame_ids[frameIdx]; sl.value = frameIdx; };
    sl.oninput = () => { frameIdx = Number(sl.value); show(); };
    viz.querySelector("#fplay").onclick = () => {
      if (timer) { clearInterval(timer); timer = null; return; }
      timer = setInterval(() => { frameIdx = (frameIdx + 1) % n; show(); }, 160);
    };
    show();
  }

  function drawDetections(viz) {
    const tr = cur.track;
    const c = svgChart(560, 260, 40, [0, tr.frame[tr.frame.length - 1]], [0, 1.05]);
    const det = tr.frame.map((f, i) => [f, tr.detected[i] ? 1 : 0]);
    det.forEach(([f, d]) => c.add("rect", { x: c.sx(f) - 1.5, y: c.sy(d ? 1 : 0.02), width: 3, height: c.sy(0) - c.sy(d ? 1 : 0.02), fill: d ? "#22c55e" : "#ef4444" }));
    c.text(c.w / 2, c.h - 8, t("demo.x_frame"), { "text-anchor": "middle" });
    c.text(c.pad, c.pad - 10, t("demo.det_legend"));
    viz.appendChild(c.s);
    drawFramesThumb(viz);
  }
  function drawFramesThumb(viz) {
    const i = Math.floor(cur.frames.length * 0.6);
    viz.appendChild(el("img", { src: frameImg(i), alt: "frame", style: "margin-top:8px" }));
  }

  function drawTrack(viz) {
    const tr = cur.track;
    const c = svgChart(420, 420, 30, [0, 640], [640, 0]);
    c.line(tr.true_u.map((u, i) => [u, tr.true_v[i]]), { stroke: "currentColor", "stroke-width": 1.5, opacity: 0.6 });
    tr.track_u.forEach((u, i) => { if (u != null) c.add("circle", { cx: c.sx(u), cy: c.sy(tr.track_v[i]), r: 2.2, fill: "#f59e0b" }); });
    c.text(c.pad, c.pad - 8, t("demo.track_legend"));
    viz.appendChild(c.s);
  }

  function drawBearing(viz) {
    const tr = cur.track;
    const ys = tr.bearing_err_deg.filter((v) => v != null);
    const c = svgChart(560, 280, 44, [0, tr.frame[tr.frame.length - 1]], [0, Math.max(0.05, ...ys) * 1.1]);
    tr.frame.forEach((f, i) => { const v = tr.bearing_err_deg[i]; if (v != null) c.add("circle", { cx: c.sx(f), cy: c.sy(v), r: 2.2, fill: "#f59e0b" }); });
    c.text(c.w / 2, c.h - 8, t("demo.x_frame"), { "text-anchor": "middle" });
    c.text(8, c.pad - 12, t("demo.y_bearing"));
    [0, Math.max(0.05, ...ys)].forEach((y) => c.text(c.pad - 6, c.sy(y) + 4, nf(y, 3), { "text-anchor": "end" }));
    viz.appendChild(c.s);
  }

  const DIRC = { "+T": "#15803d", "-T": "#65a30d", "+R": "#1d4ed8", "-R": "#0ea5e9", "+N": "#7e22ce", "-N": "#c026d3" };
  function drawCandidates(viz, ex, highlight = false) {
    const m = cur.maneuver, cs = m.curves;
    const all = Object.values(cs).flatMap((v) => v.miss_m);
    const c = svgChart(560, 320, 48, [cs[Object.keys(cs)[0]].dv_mps[0] * 100, 100], [Math.max(1, Math.min(...all) * 0.8), Math.max(...all) * 1.2], { logx: true, logy: true });
    const req = m.safe_miss_m + m.perception_margin_m;
    c.line([[c.sx ? cs[Object.keys(cs)[0]].dv_mps[0] * 100 : 0.1, req], [100, req]], { stroke: "currentColor", "stroke-dasharray": "4 3", opacity: 0.7 });
    let yLab = 0;
    for (const d in cs) {
      c.line(cs[d].dv_mps.map((v, i) => [v * 100, cs[d].miss_m[i]]), { stroke: DIRC[d], "stroke-width": 1.8 });
      c.text(c.w - c.pad + 4, c.pad + 12 + 13 * yLab++, d, { style: "fill:" + DIRC[d] });
    }
    if (highlight && m.selected) {
      c.add("circle", { cx: c.sx(m.selected.dv_mps * 100), cy: c.sy(m.selected.miss_m), r: 7, fill: "none", stroke: "#ef4444", "stroke-width": 2.5 });
    }
    c.logTicks("x", [cs[Object.keys(cs)[0]].dv_mps[0] * 100, 100]);
    c.logTicks("y", [Math.max(1, Math.min(...all) * 0.8), Math.max(...all) * 1.2]);
    c.text(c.w / 2, c.h - 10, t("demo.x_dv"), { "text-anchor": "middle" });
    c.text(8, c.pad - 14, t("demo.y_miss"));
    c.text(c.pad + 4, c.sy(req) - 4, t("demo.required"));
    viz.appendChild(c.s);
    viz.appendChild(el("div", { className: "note" }, t("demo.lead_note")));
  }
  function drawSelected(viz, ex) { drawCandidates(viz, ex, true); }

  function drawBeforeAfter(viz) {
    const m = cur.maneuver, b = m.encounter_plane;
    const L = b.lim;
    const c = svgChart(420, 420, 30, [-L, L], [-L, L]);
    const ell = (cx, cy, k, col, dash) => c.addp("ellipse", {
      cx: c.sx(cx), cy: c.sy(cy), rx: (c.sx(k * b.sig_major) - c.sx(0)), ry: (c.sy(0) - c.sy(k * b.sig_minor)),
      transform: `rotate(${-b.angle_deg} ${c.sx(cx)} ${c.sy(cy)})`, fill: "none", stroke: col, "stroke-dasharray": dash });
    c.add("circle", { cx: c.sx(0), cy: c.sy(0), r: Math.max(2, c.sx(b.hbr) - c.sx(0)), fill: "currentColor" });
    c.add("circle", { cx: c.sx(0), cy: c.sy(0), r: c.sx(m.safe_miss_m) - c.sx(0), fill: "none", stroke: "currentColor", "stroke-dasharray": "2 3", opacity: 0.6 });
    [[b.before, "#ef4444"], [b.after, "#22c55e"]].forEach(([p, col]) => {
      ell(p[0], p[1], 1, col, ""); ell(p[0], p[1], 3, col, "5 4");
      c.addp("circle", { cx: c.sx(p[0]), cy: c.sy(p[1]), r: 5, fill: col });
    });
    c.text(c.pad, c.pad - 8, t("demo.ba_legend"));
    c.text(c.pad, c.h - 10, "±" + nf(L, 0) + " m");
    viz.appendChild(c.s);
  }

  load().catch((e) => {
    console.error(e);
    document.body.insertAdjacentHTML("afterbegin", '<p style="padding:16px;background:#b42318;color:#fff">Data could not be loaded.</p>');
  });
})();
