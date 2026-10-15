export const CREW_COLORS = ['#426b50', '#71815b', '#99723d', '#527780', '#966753', '#6d6b45'];

export function createDemoData() {
  const crews = [
    { id: '2400', lead: 'Marcus Williams', helper: 'Ethan Brooks', third: null, initials: 'MW', color: CREW_COLORS[0], specialty: 'Residential installs', status: 'On site' },
    { id: '2500', lead: 'Daniel Reyes', helper: 'Alex Morgan', third: 'Luis Vega', initials: 'DR', color: CREW_COLORS[1], specialty: 'Large-scale installs', status: 'On site' },
    { id: '2600', lead: 'James Parker', helper: 'Noah Davis', third: null, initials: 'JP', color: CREW_COLORS[2], specialty: 'Residential installs', status: 'On site' },
    { id: '2700', lead: 'Chris Anderson', helper: 'Owen Miller', third: null, initials: 'CA', color: CREW_COLORS[3], specialty: 'Commercial installs', status: 'On site' },
    { id: '2800', lead: 'Miguel Santos', helper: 'Ben Wilson', third: null, initials: 'MS', color: CREW_COLORS[4], specialty: 'Residential installs', status: 'On site' },
    { id: '2900', lead: 'Ryan Thompson', helper: 'Jack Foster', third: null, initials: 'RT', color: CREW_COLORS[5], specialty: 'Installs & service', status: 'Available' },
  ];
  const estimators = [
    { id: 'est-1', name: 'Adrian Cole', initials: 'AC', color: CREW_COLORS[0], territory: 'Portland & Beaverton' },
    { id: 'est-2', name: 'Rory Mitchell', initials: 'RM', color: CREW_COLORS[1], territory: 'Lake Oswego & Tigard' },
    { id: 'est-3', name: 'Sarah Bennett', initials: 'SB', color: CREW_COLORS[2], territory: 'Oregon City & West Linn' },
  ];
  const materials = [
    { id: 'coil-5', name: '5" K-style coil', detail: 'White · aluminum', unit: 'ft', opening: 28000, reorder: 5000, tolerance: 15 },
    { id: 'coil-6', name: '6" K-style coil', detail: 'White · aluminum', unit: 'ft', opening: 15000, reorder: 2500, tolerance: 15 },
    { id: 'ds-23', name: '2 × 3 downspout', detail: 'White · aluminum', unit: 'ft', opening: 9000, reorder: 1800, tolerance: 10 },
    { id: 'ds-34', name: '3 × 4 downspout', detail: 'White · aluminum', unit: 'ft', opening: 5500, reorder: 1000, tolerance: 10 },
    { id: 'hanger', name: 'Hidden hangers', detail: 'Heavy-duty · screw-in', unit: 'ea', opening: 10000, reorder: 2000, tolerance: 20 },
    { id: 'elbow', name: 'A / B elbows', detail: 'White · 2 × 3', unit: 'ea', opening: 1800, reorder: 400, tolerance: 10 },
  ];
  const customers = ['Maplewood Residence', 'Cedar Ridge Home', 'Evergreen Property', 'West Hills Residence', 'Riverbend Home', 'Oak Street Renovation', 'Lakeview Residence', 'Willow Creek Home', 'Pinehurst Property', 'Summit Ridge Home', 'Garden Park Residence', 'Brookside Home'];
  const cities = ['Portland', 'Beaverton', 'Lake Oswego', 'Tigard', 'Oregon City', 'West Linn'];
  const jobs = [];
  const feedback = [];
  const estimates = [];
  let index = 0;
  crews.forEach((crew, ci) => {
    for (let j = 0; j < 14 + (ci % 3); j++) {
      const date = `2026-09-${String(4 + ((j * 2 + ci) % 27)).padStart(2, '0')}`;
      const gutterFt = 180 + ((j * 37 + ci * 19) % 220);
      const downspoutFt = 50 + ((j * 13) % 90);
      const large = (j + ci) % 4 === 0;
      const materialId = large ? 'coil-6' : 'coil-5';
      const dsId = large ? 'ds-34' : 'ds-23';
      const id = `GN-${1041 + index++}`;
      const estimatorId = estimators[(j + ci) % 3].id;
      const job = {
        id, customer: customers[(j + ci * 2) % customers.length], address: `${1200 + j * 87 + ci * 110} ${['SW Cedar Avenue', 'NE 14th Avenue', 'Maple Drive', 'Oak Street'][j % 4]}`,
        city: cities[(j + ci) % cities.length], crewId: crew.id, estimatorId, date, completedDate: date, status: 'Completed',
        type: large ? '6" K-style' : '5" K-style', color: 'White', gutterFt, downspoutFt,
        value: Math.round((gutterFt * (large ? 8.5 : 7) + downspoutFt * 6 + 180) / 5) * 5,
        roofPitch: j % 3 === 0 ? '8 / 12' : '5 / 12', tearOff: j % 2 === 0, cuts: 12 + j % 20,
        notes: 'Replace existing gutters. Confirm downspout drainage away from the foundation. Clean up and inspect all connections before leaving.',
        materials: [
          { materialId, required: gutterFt, used: gutterFt + 4 + j % 9 },
          { materialId: dsId, required: downspoutFt, used: downspoutFt + j % 4 },
          { materialId: 'hanger', required: Math.ceil(gutterFt / 2), used: Math.ceil(gutterFt / 2) },
          { materialId: 'elbow', required: 8, used: 8 },
        ],
      };
      jobs.push(job);
      estimates.push({ id: `E-${index}`, estimatorId, date, customer: job.customer, value: job.value, status: 'Won', jobId: id });
      if ((ci === 0 && j === 4) || (ci === 1 && j === 7) || (ci === 2 && [2, 8].includes(j)) || (ci === 3 && [1, 5, 10].includes(j)) || (ci === 5 && [3, 6].includes(j))) {
        feedback.push({ id: `f-${id}`, jobId: id, kind: 'Repair', date: '2026-10-01', status: j % 2 ? 'Open' : 'Resolved', note: j % 2 ? 'Leaking corner joint. Service visit required.' : 'Downspout connection secured on return visit.' });
      }
      if (j % 4 === 0) feedback.push({ id: `r-${id}`, jobId: id, kind: 'Review', date, rating: j % 3 === 0 ? 4 : 5, status: 'Resolved', note: 'Professional crew, tidy work, and a great-looking installation.' });
      if (ci === 3 && j === 5 || ci === 5 && j === 3) feedback.push({ id: `c-${id}`, jobId: id, kind: 'Complaint', date: '2026-10-01', status: 'Open', note: 'Customer reported debris left behind. Office follow-up needed.' });
    }
    jobs.push({
      id: `GN-${1041 + index++}`, customer: customers[ci + 2], address: `${2840 + ci * 123} SW ${['Garden', 'Cedar', 'Maple', 'Oak', 'Pine', 'Summit'][ci]} Drive`,
      city: cities[ci], crewId: crew.id, estimatorId: estimators[ci % 3].id,
      date: '2026-10-02', completedDate: null, status: ci === 5 ? 'Scheduled' : 'In progress',
      type: ci % 2 ? '6" K-style' : '5" K-style', color: 'White', gutterFt: 260 + ci * 24, downspoutFt: 80 + ci * 8,
      value: 2450 + ci * 285, roofPitch: '6 / 12', tearOff: true, cuts: 21,
      notes: 'Call customer on arrival. Replace gutters on house and garage. Check all brackets and direct water away from the home.',
      materials: [
        { materialId: ci % 2 ? 'coil-6' : 'coil-5', required: 260 + ci * 24, used: 0 },
        { materialId: ci % 2 ? 'ds-34' : 'ds-23', required: 80 + ci * 8, used: 0 },
        { materialId: 'hanger', required: 130 + ci * 12, used: 0 },
        { materialId: 'elbow', required: 8, used: 0 },
      ],
    });
  });
  estimators.forEach((estimator, ei) => {
    for (let i = 0; i < 12 + ei * 4; i++) estimates.push({
      id: `E-other-${ei}-${i}`, estimatorId: estimator.id, date: `2026-09-${String(5 + i).padStart(2, '0')}`,
      customer: customers[i % customers.length], value: 1850 + i * 160, status: i < 5 + ei * 2 ? 'Lost' : 'Pending', jobId: null,
    });
  });
  const movements = [];
  crews.forEach((crew, ci) => {
    materials.forEach(material => {
      const used = jobs.filter(job => job.crewId === crew.id && job.status === 'Completed').reduce((sum, job) => sum + (job.materials.find(item => item.materialId === material.id)?.used || 0), 0);
      const remainder = material.unit === 'ft' ? 300 : 80;
      const waste = material.id.startsWith('coil') ? 24 + ci * 2 : 0;
      movements.push({ id: `load-${crew.id}-${material.id}`, kind: 'Load', crewId: crew.id, materialId: material.id, quantity: used + remainder + waste + 20, date: '2026-09-03', note: 'Demo period truck allocations' });
      movements.push({ id: `return-${crew.id}-${material.id}`, kind: 'Return', crewId: crew.id, materialId: material.id, quantity: 20, date: '2026-10-02', note: 'Unused material returned' });
      if (waste) movements.push({ id: `waste-${crew.id}-${material.id}`, kind: 'Waste', crewId: crew.id, materialId: material.id, quantity: waste, date: '2026-10-02', note: 'Documented offcuts' });
      const variance = crew.id === '2700' && material.id === 'coil-5' ? 86 : crew.id === '2900' && material.id === 'ds-23' ? 42 : 0;
      movements.push({ id: `count-${crew.id}-${material.id}`, kind: 'Count', crewId: crew.id, materialId: material.id, quantity: remainder - variance, date: '2026-10-02', note: 'Physical truck count' });
    });
  });
  // Opening stock is chosen to demonstrate reorder alerts without negative stock.
  materials.forEach(material => {
    const outbound = movements.filter(item => item.materialId === material.id).reduce((sum, item) => sum + (item.kind === 'Load' ? item.quantity : item.kind === 'Return' ? -item.quantity : 0), 0);
    material.opening = outbound + ({ 'coil-5': 4200, 'coil-6': 3800, 'ds-23': 2400, 'ds-34': 920, hanger: 3100, elbow: 740 }[material.id]);
  });
  return { version: 1, crews, estimators, materials, jobs, estimates, feedback, movements, scans: [] };
}
