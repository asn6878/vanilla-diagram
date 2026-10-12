const linear = Array.from({ length: 121 }, (_, i) => [i / 20, i / 20 + 1]);
const doubling = Array.from({ length: 121 }, (_, i) => [i / 20, 2 ** (i / 20)]);

export default {
  title: 'Linear vs. exponential',
  caption: 'Computed values: adding 1 reaches 7; doubling reaches 64 after six steps.',
  alt: 'A chart compares n plus 1 with 2 to the power n from step 0 to step 6. The final values are 7 and 64.',
  duration: 12,
  height: 260,
  draw(f, t) {
    const progress = f.inout(f.span(1, 9));
    const n = 6 * progress;
    f.legend([{ label: `Add 1: ${(n + 1).toFixed(1)}`, tone: 'blue' }, { label: `Double: ${(2 ** n).toFixed(1)}`, tone: 'violet' }], 36, 31);
    const chart = f.plot({ x: 36, y: 70, w: f.w - (f.narrow ? 96 : 126), h: 143, xd: [0, 6], yd: [0, 64] });
    chart.axes({ xt: [0, 2, 4, 6], yt: [0, 16, 32, 48, 64] });
    const a = chart.line(linear, { tone: 'blue', upto: progress });
    const b = chart.line(doubling, { tone: 'violet', upto: progress, area: true });
    [a, b].forEach((point, i) => {
      if (!point) return;
      f.dot(point.x, point.y, { r: 4.5, color: f.tone(i ? 'violet' : 'blue') });
      if (n >= 2.5) f.text(point.vy.toFixed(n === 6 ? 0 : 1), point.x + 10, point.y, { size: 12, mono: true, weight: 650, color: f.c.strong });
    });
    f.text('Step n', 36 + chart.w / 2, 248, { size: 11, align: 'center', color: f.c.muted });
    f.note(t < 1 ? 'Both rules start at 1' : t < 9 ? 'Each step adds 1 or doubles the previous value' : 'At step 6: 7 for linear growth, 64 for exponential growth');
  },
};
