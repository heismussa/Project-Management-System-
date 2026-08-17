export const sampleActivities = [
  {
    id: 1,
    name: 'Site survey',
    deliverable: 'Survey report',
    plannedStart: '2026-01-05',
    plannedEnd: '2026-01-12',
    actualStart: '2026-01-06',
    actualEnd: '2026-01-13',
    team: ['Alex Kim'],
    remarks: [
      {
        id: 1,
        date: '2026-01-13T09:00:00Z',
        text: 'Survey completed and report submitted for review.',
      },
    ],
  },
  {
    id: 2,
    name: 'Foundation excavation',
    deliverable: 'Excavated foundation trench',
    plannedStart: '2026-01-13',
    plannedEnd: '2026-01-20',
    actualStart: '2026-01-14',
    actualEnd: null,
    team: ['Jordan Lee', 'Priya Nair'],
    remarks: [
      {
        id: 1,
        date: '2026-01-15T14:30:00Z',
        text: 'Excavation 40% complete, on schedule.',
      },
      {
        id: 2,
        date: '2026-01-17T11:00:00Z',
        text: 'Delayed by one day due to rainfall.',
      },
    ],
  },
  {
    id: 3,
    name: 'Procurement of steel',
    deliverable: 'Steel delivered to site',
    plannedStart: '2026-01-20',
    plannedEnd: '2026-01-27',
    actualStart: null,
    actualEnd: null,
    team: ['Sam Patel'],
    remarks: [],
  },
]
