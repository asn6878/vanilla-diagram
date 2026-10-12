export default {
  title: 'From checkout to doorstep',
  caption: 'A parcel passes through pickup and sorting before delivery.',
  alt: 'One parcel moves from an order to courier pickup, a sorting hub, and final delivery.',
  duration: 12,
  height: width => width < 520 ? 340 : 260,
  draw(f, t) {
    const phase = f.phase([0, 3, 6, 9]);
    const names = ['Order', 'Pickup', 'Sort', 'Delivered'];
    const states = ['Confirmed', 'Collected', 'Routed', 'Complete'];
    const tones = ['blue', 'orange', 'violet', 'green'];
    const box = f.narrow ? Math.min(132, (f.w - 36) / 2) : Math.min(118, (f.w - 84) / 4);
    const height = 66;
    const positions = f.narrow
      ? [[8, 74], [f.w - box - 8, 74], [8, 238], [f.w - box - 8, 238]]
      : names.map((_, i) => [8 + i * (f.w - box - 16) / 3, 108]);
    f.text('ONE PARCEL · FOUR STAGES', 8, 31, { size: 11, mono: true, color: f.c.muted });
    f.text(`${phase.i + 1} / 4`, f.w - 8, 31, { size: 11, mono: true, align: 'right', color: f.c.muted });
    const paths = positions.slice(0, -1).map(([x, y], i) => {
      const [nx, ny] = positions[i + 1];
      if (y === ny) return [[x + box + 5, y + height / 2], [nx - 5, ny + height / 2]];
      return [[x + box / 2, y + height + 5], [x + box / 2, 192], [nx + box / 2, 192], [nx + box / 2, ny - 5]];
    });
    paths.forEach((path, i) => f.arrow(path, { color: i < phase.i ? f.tone(tones[i]) : f.c.line, width: 1.5 }));
    positions.forEach(([x, y], i) => {
      f.node(x, y, box, height, { label: names[i], sub: states[i], subColor: f.c.text, tone: tones[i], on: 1, fill: i === phase.i ? 1 : 2, size: 13 });
      f.text(String(i + 1).padStart(2, '0'), f.narrow ? x + 16 : x + box / 2, y - 20, { size: 11, mono: true, align: f.narrow ? 'left' : 'center', color: f.c.muted });
    });
    paths.forEach((path, i) => {
      const start = 2.1 + i * 3;
      if (t >= start && t < start + 0.9) {
        const point = f.along(path, f.inout(f.span(start, start + 0.9)));
        f.dot(point.x, point.y, { r: 6, color: f.tone(tones[i]) });
      }
    });
    if (!f.narrow) {
      f.line([[8, 228], [f.w - 8, 228]], { color: f.c.grid });
      positions.forEach(([x], i) => f.dot(x + box / 2, 228, { r: 3, color: i <= phase.i ? f.tone(tones[i]) : f.c.grid }));
    }
    f.note(['01  Order confirmed and ready for collection', '02  Courier collects the parcel', '03  The sorting hub selects its delivery route', '04  The parcel reaches its destination'][phase.i]);
  },
};
