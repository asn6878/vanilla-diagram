export default {
  title: 'A simple handoff',
  caption: 'The sender passes a value to the receiver, which processes it.',
  alt: 'A value moves from the sender to the receiver and is processed.',
  duration: 12,
  height: 220,
  draw(f, t) {
    const phase = f.phase([0, 2, 6, 10]);
    f.note(['Prepare a value', 'Send the value', 'Process the value', 'Processing complete'][phase.i]);
    const width = Math.min(140, f.w * 0.32);
    const y = 84;
    f.node(8, y, width, 56, { label: 'Sender', tone: 'blue', on: 1, fill: phase.i === 1 ? 1 : 2 });
    f.node(f.w - width - 8, y, width, 56, { label: phase.i === 3 ? 'Complete' : 'Receiver', tone: 'orange', on: 1, fill: phase.i === 2 ? 1 : 2 });
    const path = [[width + 16, y + 28], [f.w - width - 16, y + 28]];
    f.arrow(path, { color: f.c.line });
    if (t >= 2 && t < 6) {
      const point = f.along(path, f.inout(f.span(2, 6)));
      f.dot(point.x, point.y, { color: f.tone('blue') });
    }
  },
};
