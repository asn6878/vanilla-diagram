// Drawing and timing helpers for Vanilla Infographics.
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }

  // a polyline's point at fraction p of its length, with the index and angle of that segment
  function pointAt(pts, p) {
    var len = [0], i;
    for (i = 1; i < pts.length; i++) {
      len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    }
    var d = clamp(p, 0, 1) * len[len.length - 1];
    for (i = 1; i < pts.length; i++) {
      if (d <= len[i] || i === pts.length - 1) {
        var k = (d - len[i - 1]) / ((len[i] - len[i - 1]) || 1);
        var dx = pts[i][0] - pts[i - 1][0], dy = pts[i][1] - pts[i - 1][1];
        return { x: pts[i - 1][0] + dx * k, y: pts[i - 1][1] + dy * k, i: i, a: Math.atan2(dy, dx) };
      }
    }
    return { x: pts[0][0], y: pts[0][1], i: 0, a: 0 };
  }

  /* Code: enough of a tokenizer to color the snippets a figure shows. It is not a parser: it
     knows comments, strings, numbers and a keyword list per language, calls a name followed by
     "(" a function and a CapitalizedName a type. A language it does not know stays plain ink. */
  function words(s) { var o = {}; s.split(' ').forEach(function (k) { o[k] = 1; }); return o; }
  function grammar(a, b) { var o = {}, k; for (k in a) o[k] = a[k]; for (k in b) o[k] = b[k]; return o; }
  var C_LIKE = { line: '//', block: ['/*', '*/'], quotes: '"\'', at: true };
  var JS_KW = 'async await break case catch class const continue debugger default delete do else export extends ' +
    'false finally for from function if import in instanceof let new null of return static super switch this throw ' +
    'true try typeof undefined var void while yield';
  var LANGS = {
    js: grammar(C_LIKE, { quotes: '"\'`', kw: words(JS_KW) }),
    ts: grammar(C_LIKE, { quotes: '"\'`', kw: words(JS_KW + ' abstract any as boolean declare enum implements ' +
      'interface keyof namespace never number private protected public readonly string type unknown') }),
    java: grammar(C_LIKE, { kw: words('abstract boolean break byte case catch char class continue default do double ' +
      'else enum extends false final finally float for if implements import instanceof int interface long new null ' +
      'package private protected public record return short static super switch synchronized this throw throws ' +
      'true try var void volatile while') }),
    kotlin: grammar(C_LIKE, { kw: words('abstract as break by catch class companion const constructor continue data ' +
      'do else enum false finally for fun if import in interface internal is lateinit null object open override ' +
      'package private protected public return sealed super suspend this throw true try val var when while') }),
    c: grammar(C_LIKE, { at: false, pre: true, kw: words('break case char const continue default do double else enum ' +
      'extern float for goto if inline int long return short signed sizeof static struct switch typedef union ' +
      'unsigned void volatile while NULL') }),
    go: grammar(C_LIKE, { quotes: '"\'`', at: false, kw: words('break case chan const continue default defer else ' +
      'fallthrough false for func go goto if import interface map nil package range return select struct switch ' +
      'true type var') }),
    python: { line: '#', quotes: '"\'', at: true, kw: words('and as assert async await break class continue def del ' +
      'elif else except False finally for from global if import in is lambda None nonlocal not or pass raise return ' +
      'True try while with yield') },
    // keywords are matched without regard to case (fold)
    sql: { line: '--', block: ['/*', '*/'], quotes: '\'"`', fold: true, kw: words('add all alter and as asc begin ' +
      'between by case column commit constraint create default delete desc distinct drop else end exists false ' +
      'foreign from full group having in index inner insert into is join key left like limit not null offset on or ' +
      'order outer primary references right rollback select set table then true union unique update values view ' +
      'when where with') },
    // the first word of a command is its name (cmd), and $NAME is a variable (vars)
    bash: { line: '#', quotes: '"\'', cmd: true, vars: true, kw: words('case do done elif else esac export fi for ' +
      'function if in local return then until while') },
    // a string in front of a colon is a key (keys)
    json: { quotes: '"', keys: true, kw: words('true false null') }
  };
  LANGS.cpp = grammar(LANGS.c, { kw: grammar(LANGS.c.kw, words('auto bool catch class constexpr delete explicit false ' +
    'friend namespace new noexcept nullptr operator private protected public template this throw true try typename ' +
    'using virtual')) });
  var LANG_ALIAS = {
    javascript: 'js', jsx: 'js', mjs: 'js', cjs: 'js', node: 'js', typescript: 'ts', tsx: 'ts', kt: 'kotlin',
    h: 'c', 'c++': 'cpp', cc: 'cpp', hpp: 'cpp', golang: 'go', py: 'python', mysql: 'sql', postgresql: 'sql',
    plsql: 'sql', sh: 'bash', shell: 'bash', zsh: 'bash'
  };

  // one line -> [[type, text], …], type being '' (ink), kw, str, num, fn, type or cm.
  // `st.block` carries a block comment that is still open over to the next line.
  function lexLine(s, L, st) {
    var out = [], i = 0, n = s.length, first = true, rest, ch, m, j, t;
    function put(type, text) {
      var last = out[out.length - 1];
      if (last && last[0] === type) last[1] += text; else out.push([type, text]);
    }
    while (i < n) {
      rest = s.slice(i);
      ch = s.charAt(i);
      if (st.block) {
        j = s.indexOf(L.block[1], i);
        if (j < 0) { put('cm', rest); break; }
        put('cm', s.slice(i, j + L.block[1].length));
        i = j + L.block[1].length;
        st.block = false;
      } else if (ch === ' ') {
        put('', ch); i += 1;
      } else if (L.line && rest.lastIndexOf(L.line, 0) === 0) {
        put('cm', rest); break;
      } else if (L.block && rest.lastIndexOf(L.block[0], 0) === 0) {
        put('cm', L.block[0]); i += L.block[0].length;
        st.block = true;
      } else if (L.quotes && L.quotes.indexOf(ch) >= 0) {
        for (j = i + 1; j < n && s.charAt(j) !== ch; j++) if (s.charAt(j) === '\\') j++;
        j = Math.min(n, j + 1);
        put(L.keys && /^\s*:/.test(s.slice(j)) ? 'type' : 'str', s.slice(i, j));
        i = j; first = false;
      } else if ((m = /^(?:0[xX][\da-fA-F_]+|\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(rest)) ||
                 (L.vars && (m = /^\$(?:\{[^}]*\}|[\w@#?*!$-]+)/.exec(rest))) ||
                 (L.at && (m = /^@[A-Za-z_][\w.]*/.exec(rest))) ||
                 (L.pre && (m = /^#\s*[a-z]+/.exec(rest)))) {
        put(ch === '$' || ch === '@' ? 'type' : ch === '#' ? 'kw' : 'num', m[0]);
        i += m[0].length; first = false;
      } else if ((m = /^[A-Za-z_$][\w$]*/.exec(rest))) {
        j = L.fold ? m[0].toLowerCase() : m[0];
        t = L.kw && L.kw[j] === 1 ? 'kw'
          : (L.cmd && first) || /^\s*\(/.test(rest.slice(m[0].length)) ? 'fn'
          : /^[A-Z]/.test(m[0]) && /[a-z]/.test(m[0]) ? 'type' : '';
        put(t, m[0]);
        i += m[0].length;
        first = !!L.cmd && /^(?:if|then|else|elif|do|while|until)$/.test(m[0]);   // a command follows these
      } else {
        if (L.cmd && '|;&'.indexOf(ch) >= 0) first = true;   // the next word starts a new command
        put('', ch); i += 1;
      }
    }
    return out;
  }

  var lexed = {};   // tokens by language and source: a scene asks again on every frame
  function tokenize(src, lang) {
    var text = typeof src === 'string' ? src : src.join('\n');
    var name = String(lang || 'js').toLowerCase();
    name = LANG_ALIAS[name] || name;
    var key = name + '\n' + text;
    if (!lexed[key]) {
      var L = LANGS[name], st = { block: false };
      lexed[key] = text.replace(/\t/g, '    ').split('\n').map(function (line) {
        return L ? lexLine(line, L, st) : [['', line]];
      });
    }
    return lexed[key];
  }

  var F = {
    clamp: clamp,
    lerp: function (a, b, x) { return a + (b - a) * x; },
    // a cubic ease-out, near enough: quick off the mark, long settle. For things arriving.
    ease: function (x) { x = clamp(x, 0, 1); return 1 - Math.pow(1 - x, 3); },
    // for things travelling from one place to another
    inout: function (x) { x = clamp(x, 0, 1); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; },
    // progress (0..1) through the window [a, b], in seconds on the loop clock
    span: function (a, b) { return clamp((this.t - a) / (b - a), 0, 1); },
    // which phase the clock is in, given each phase's start time, and how far through it
    phase: function (starts) {
      var i = 0;
      while (i < starts.length - 1 && this.t >= starts[i + 1]) i++;
      var end = i < starts.length - 1 ? starts[i + 1] : (this.dur || starts[i] + 1);
      return { i: i, p: clamp((this.t - starts[i]) / ((end - starts[i]) || 1), 0, 1) };
    },
    // the narration line under the stage — real text, so it wraps and reads while paused
    note: function (s) { this._note = s; },
    // tone('red') is the base, tone('red', 1) and tone('red', 2) its tints; 'accent' is blue
    tone: function (name, step) {
      if (!name || name === 'accent') name = 'blue';
      return this.c[name + (step || '')] || this.c.line;
    },
    along: pointAt,

    _font: function (o) {
      this.ctx.font = (o.weight || 500) + ' ' + (o.size || 12.5) + 'px ' + (o.mono ? this.mono : this.sans);
    },
    measure: function (s, o) {
      this.ctx.save();
      this._font(o || {});
      var w = this.ctx.measureText(s).width;
      this.ctx.restore();
      return w;
    },
    // text wears ink (text / strong / muted), never a series or status color
    text: function (s, x, y, o) {
      o = o || {};
      var ctx = this.ctx;
      ctx.save();
      this._font(o);
      ctx.fillStyle = o.color || this.c.text;
      ctx.textAlign = o.align || 'left';
      ctx.textBaseline = o.base || 'middle';
      if (o.alpha != null) ctx.globalAlpha *= o.alpha;
      ctx.fillText(s, x, y);
      ctx.restore();
    },
    rect: function (x, y, w, h, o) {
      o = o || {};
      var ctx = this.ctx, r = Math.max(0, Math.min(o.r == null ? 8 : o.r, w / 2, h / 2));
      ctx.save();
      if (o.alpha != null) ctx.globalAlpha *= o.alpha;
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
      if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); }
      if (o.stroke) {
        ctx.strokeStyle = o.stroke;
        ctx.lineWidth = o.width || 1;
        if (o.dash) ctx.setLineDash(o.dash);
        ctx.stroke();
      }
      ctx.restore();
    },
    // a container other things sit in, named in its corner
    panel: function (x, y, w, h, o) {
      o = o || {};
      this.rect(x, y, w, h, { r: 10, fill: this.c.soft, stroke: this.c.grid, alpha: o.alpha });
      if (o.label) {
        this.text(o.label, x + 11, y + 15, { size: 11.5, weight: 600, color: this.c.muted, alpha: o.alpha });
      }
    },
    // a labelled box. `on` (0..1) lights it in `tone`: how a scene says "this one, now".
    // The fill is tint 2 unless `fill: 1` asks for the heavier tint 1 ("being worked on").
    node: function (x, y, w, h, o) {
      o = o || {};
      var c = this.c, a = o.alpha == null ? 1 : o.alpha, on = clamp(o.on || 0, 0, 1);
      this.rect(x, y, w, h, { r: o.r, fill: c.bg, stroke: c.line, alpha: a });
      if (on) {
        this.rect(x, y, w, h, { r: o.r, fill: this.tone(o.tone, o.fill === 1 ? 1 : 2), alpha: on * a });
        this.rect(x, y, w, h, { r: o.r, stroke: this.tone(o.tone), width: 1.5, alpha: on * a });
      }
      var cy = y + h / 2;
      if (o.label) {
        this.text(o.label, x + w / 2, o.sub ? cy - 8 : cy, {
          size: o.size, weight: 600, mono: o.mono, align: 'center', alpha: a,
          color: on > .5 ? c.strong : c.text
        });
      }
      if (o.sub) {
        this.text(o.sub, x + w / 2, cy + 9, { size: 11, mono: o.subMono, align: 'center', color: o.subColor || c.muted, alpha: a });
      }
    },
    // pts: [[x, y], …]. `upto` (0..1) draws only that much of the length — for lines that grow
    line: function (pts, o) {
      o = o || {};
      var ctx = this.ctx, upto = o.upto == null ? 1 : clamp(o.upto, 0, 1);
      if (upto <= 0 || pts.length < 2) return;
      var end = upto < 1 ? pointAt(pts, upto) : null;
      ctx.save();
      if (o.alpha != null) ctx.globalAlpha *= o.alpha;
      ctx.strokeStyle = o.color || this.c.line;
      ctx.lineWidth = o.width || 1.5;
      ctx.lineJoin = ctx.lineCap = 'round';
      if (o.dash) ctx.setLineDash(o.dash);
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (var i = 1; i < (end ? end.i : pts.length); i++) ctx.lineTo(pts[i][0], pts[i][1]);
      if (end) ctx.lineTo(end.x, end.y);
      ctx.stroke();
      ctx.restore();
    },
    arrow: function (pts, o) {
      o = o || {};
      var upto = o.upto == null ? 1 : clamp(o.upto, 0, 1);
      if (upto <= 0 || pts.length < 2) return;
      this.line(pts, o);
      var tip = pointAt(pts, upto), s = 5.5, w = .5;
      this.line([
        [tip.x - s * Math.cos(tip.a - w), tip.y - s * Math.sin(tip.a - w)],
        [tip.x, tip.y],
        [tip.x - s * Math.cos(tip.a + w), tip.y - s * Math.sin(tip.a + w)]
      ], { color: o.color, width: o.width, alpha: o.alpha });
    },
    // a marker or a travelling token; the ring in the card color keeps it legible over lines
    dot: function (x, y, o) {
      o = o || {};
      var ctx = this.ctx, r = o.r || 4.5;
      ctx.save();
      if (o.alpha != null) ctx.globalAlpha *= o.alpha;
      if (o.ring !== false) {
        ctx.beginPath();
        ctx.arc(x, y, r + 2, 0, Math.PI * 2);
        ctx.fillStyle = this.c.bg;
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = o.color || this.c.accent;
      ctx.fill();
      ctx.restore();
    },
    // a small tag: tint-2 ground, a dot in the base, ink text. Returns its width.
    pill: function (s, x, y, o) {
      o = o || {};
      var hue = this.tone(o.tone), t = { size: o.size || 11.5, weight: 600 };
      var w = this.measure(s, t) + 27, h = 22;
      var left = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
      this.rect(left, y - h / 2, w, h, { r: h / 2, fill: this.tone(o.tone, 2), alpha: o.alpha });
      this.dot(left + 11, y, { r: 3, color: hue, ring: false, alpha: o.alpha });
      this.text(s, left + 19, y, { size: t.size, weight: 600, alpha: o.alpha });
      return w;
    },
    // items: [{ label, tone }] in a row from (x, y). With two or more series, always draw one.
    legend: function (items, x, y) {
      for (var i = 0; i < items.length; i++) {
        this.dot(x + 4, y, { r: 4, color: this.tone(items[i].tone), ring: false });
        this.text(items[i].label, x + 14, y, { size: 12, color: this.c.muted });
        x += 14 + this.measure(items[i].label, { size: 12 }) + 18;
      }
    },
    // Code, colored by syntax. o.lang: js ts java kotlin c cpp go python sql bash json (js when
    // left out; a name the kit does not know is drawn plain). `src` is a string or an array of
    // lines; (x, y) is the left edge and the middle of the first line; o.lh is the line step.
    // o.active, a line index or a list of them, says which lines are running now: they get the
    // tint-2 wash (o.w wide, starting 7px left of the text) and the other lines step back to
    // o.dim. With an empty list nothing is running and nothing steps back.
    // Returns { w, h }: the widest line and the height of the block.
    code: function (src, x, y, o) {
      o = o || {};
      var ctx = this.ctx, c = this.c, syn = this.syn || {}, rows = tokenize(src, o.lang);
      var size = o.size || 12, lh = o.lh || size * 2, band = Math.min(lh, 20);
      var act = o.active == null ? null : [].concat(o.active);
      var a = o.alpha == null ? 1 : o.alpha, dim = o.dim == null ? .6 : o.dim;
      var widest = 0, i, k, cx, on;
      if (act && o.w) {
        for (i = 0; i < rows.length; i++) {            // one wash per run of adjacent active lines
          if (act.indexOf(i) < 0) continue;
          k = i;
          while (act.indexOf(k + 1) >= 0) k++;
          this.rect(x - 7, y + i * lh - band / 2, o.w, (k - i) * lh + band, { r: 5, fill: c.blue2, alpha: a });
          i = k;
        }
      }
      ctx.save();
      this._font({ mono: true, size: size, weight: o.weight });
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      var base = ctx.globalAlpha * a;
      for (i = 0; i < rows.length; i++) {
        on = !act || !act.length || act.indexOf(i) >= 0;
        ctx.globalAlpha = base * (on ? 1 : dim);
        for (cx = x, k = 0; k < rows[i].length; k++) {
          ctx.fillStyle = syn[rows[i][k][0]] || c.text;
          ctx.fillText(rows[i][k][1], cx, y + i * lh);
          cx += ctx.measureText(rows[i][k][1]).width;
        }
        if (cx - x > widest) widest = cx - x;
      }
      ctx.restore();
      return { w: widest, h: rows.length * lh };
    },
    // a chart area: f.plot({ x, y, w, h, xd: [min, max], yd: [min, max] })
    plot: function (o) { return new Plot(this, o); }
  };

  function Plot(f, o) {
    this.f = f;
    this.x = o.x; this.y = o.y; this.w = o.w; this.h = o.h;
    this.xd = o.xd; this.yd = o.yd;
  }
  Plot.prototype.sx = function (v) { return this.x + (v - this.xd[0]) / (this.xd[1] - this.xd[0]) * this.w; };
  Plot.prototype.sy = function (v) { return this.y + this.h - (v - this.yd[0]) / (this.yd[1] - this.yd[0]) * this.h; };
  // o: { xt: [values], yt: [values], fx: fmt, fy: fmt } — hairline grid, baseline, mono ticks
  Plot.prototype.axes = function (o) {
    var f = this.f, c = f.c, self = this;
    var tick = { size: 11, mono: true, color: c.muted };
    (o.yt || []).forEach(function (v) {
      var y = Math.round(self.sy(v)) + .5;
      if (v !== self.yd[0]) f.line([[self.x, y], [self.x + self.w, y]], { color: c.grid, width: 1 });
      f.text(o.fy ? o.fy(v) : String(v), self.x - 8, y, { size: 11, mono: true, color: c.muted, align: 'right' });
    });
    var base = Math.round(this.y + this.h) + .5;
    f.line([[this.x, base], [this.x + this.w, base]], { color: c.line, width: 1 });
    (o.xt || []).forEach(function (v, i, all) {
      tick.align = i === 0 ? 'left' : i === all.length - 1 ? 'right' : 'center';
      f.text(o.fx ? o.fx(v) : String(v), self.sx(v), base + 14, tick);
    });
  };
  // data: [[x, y], …] with x ascending. o: { tone, upto (0..1 of the x range), area (a wash) }.
  // Returns the tip ({ x, y } on the canvas, { vx, vy } in data) so the scene can label it.
  Plot.prototype.line = function (data, o) {
    o = o || {};
    var f = this.f, hue = f.tone(o.tone);
    var cut = this.xd[0] + (this.xd[1] - this.xd[0]) * (o.upto == null ? 1 : clamp(o.upto, 0, 1));
    var pts = [], tip = null;
    for (var i = 0; i < data.length; i++) {
      var d = data[i];
      if (d[0] <= cut) { pts.push([this.sx(d[0]), this.sy(d[1])]); tip = { vx: d[0], vy: d[1] }; continue; }
      if (i > 0) {
        var p = data[i - 1], k = (cut - p[0]) / ((d[0] - p[0]) || 1);
        tip = { vx: cut, vy: p[1] + (d[1] - p[1]) * k };
        pts.push([this.sx(tip.vx), this.sy(tip.vy)]);
      }
      break;
    }
    if (!tip) return null;
    tip.x = pts[pts.length - 1][0];
    tip.y = pts[pts.length - 1][1];
    if (pts.length < 2) return tip;
    if (o.area) {
      var ctx = f.ctx, base = this.y + this.h;
      ctx.save();
      ctx.globalAlpha *= f.wash;        // = tint 2 on the card, with the grid still showing
      ctx.fillStyle = hue;
      ctx.beginPath();
      ctx.moveTo(pts[0][0], base);
      pts.forEach(function (q) { ctx.lineTo(q[0], q[1]); });
      ctx.lineTo(tip.x, base);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    f.line(pts, { color: hue, width: 2 });
    return tip;
  };


export { F as drawingHelpers, clamp };
