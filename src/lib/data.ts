export type TruckStatus = 'onTime' | 'delayed' | 'exception'

export type RoutePoint = {
  lat: number
  lng: number
}

export type Truck = {
  id: string
  driver: { ar: string; en: string }
  lat: number
  lng: number
  identityColor: string
  route: {
    origin: RoutePoint
    destination: RoutePoint
    waypoints: RoutePoint[]
  }
  stops: number
  completed: number
  status: TruckStatus
  delayMin: number
  speed: number
  load: number
  fuel: number
  eta: string
  area: { ar: string; en: string }
}

// Kinza factory (assumed depot — NOT in source file, replace with the real coordinate if available)
export const DEPOT: RoutePoint = { lat: 21.6167, lng: 39.15 }

// Jeddah, Saudi Arabia
export const JEDDAH_CENTER: [number, number] = [21.5433, 39.1728]

export const trucks: Truck[] = [
  {
    id: 'TRUCKA8-1',
    driver: { ar: 'عبدالله الحربي', en: 'Abdullah Al-Harbi' },
    lat: 21.565208,
    lng: 39.191098,
    identityColor: '#2563eb',
    route: {
      origin: { lat: 21.6167, lng: 39.1500 },
      destination: { lat: 21.459660, lng: 39.208582 },
      waypoints: [{ lat: 21.565208, lng: 39.191098 }],
    },
    stops: 2,
    completed: 2,
    status: 'onTime',
    delayMin: 0,
    speed: 45,
    load: 100,
    fuel: 80,
    eta: '13:40',
    area: { ar: 'مسار التوزيع 1', en: 'Distribution Route 1' },
  },
  {
    id: 'TRUCKB6-1',
    driver: { ar: 'سعد القحطاني', en: 'Saad Al-Qahtani' },
    lat: 21.777686,
    lng: 39.216623,
    identityColor: '#7c3aed',
    route: {
      origin: { lat: 21.6167, lng: 39.1500 },
      destination: { lat: 21.436497, lng: 39.196499 },
      waypoints: [{ lat: 21.777686, lng: 39.216623 }],
    },
    stops: 2,
    completed: 2,
    status: 'onTime',
    delayMin: 0,
    speed: 48,
    load: 100,
    fuel: 76,
    eta: '14:15',
    area: { ar: 'مسار التوزيع 2', en: 'Distribution Route 2' },
  },
  {
    id: 'TRUCKB6-2',
    driver: { ar: 'فهد العتيبي', en: 'Fahad Al-Otaibi' },
    lat: 21.427492,
    lng: 39.190563,
    identityColor: '#0891b2',
    route: {
      origin: { lat: 21.6167, lng: 39.1500 },
      destination: { lat: 21.418881, lng: 39.192215 },
      waypoints: [{ lat: 21.427492, lng: 39.190563 }],
    },
    stops: 2,
    completed: 2,
    status: 'onTime',
    delayMin: 0,
    speed: 51,
    load: 100,
    fuel: 72,
    eta: '14:50',
    area: { ar: 'مسار التوزيع 3', en: 'Distribution Route 3' },
  },
  {
    id: 'TRUCKB6-3',
    driver: { ar: 'ماجد الشمري', en: 'Majed Al-Shammari' },
    lat: 21.589598,
    lng: 39.220228,
    identityColor: '#ea580c',
    route: {
      origin: { lat: 21.6167, lng: 39.1500 },
      destination: { lat: 21.419757, lng: 39.294888 },
      waypoints: [{ lat: 21.589598, lng: 39.220228 }, { lat: 21.770426, lng: 39.219738 }],
    },
    stops: 3,
    completed: 2,
    status: 'delayed',
    delayMin: 8,
    speed: 54,
    load: 100,
    fuel: 68,
    eta: '15:10',
    area: { ar: 'مسار التوزيع 4', en: 'Distribution Route 4' },
  },
  {
    id: 'TRUCKB6-4',
    driver: { ar: 'تركي الدوسري', en: 'Turki Al-Dosari' },
    lat: 21.564842,
    lng: 39.191173,
    identityColor: '#be185d',
    route: {
      origin: { lat: 21.6167, lng: 39.1500 },
      destination: { lat: 21.441915, lng: 39.201953 },
      waypoints: [{ lat: 21.564842, lng: 39.191173 }],
    },
    stops: 2,
    completed: 2,
    status: 'onTime',
    delayMin: 0,
    speed: 57,
    load: 100,
    fuel: 64,
    eta: '13:55',
    area: { ar: 'مسار التوزيع 5', en: 'Distribution Route 5' },
  },
  {
    id: 'TRUCKB6-5',
    driver: { ar: 'خالد المطيري', en: 'Khalid Al-Mutairi' },
    lat: 21.409308,
    lng: 39.257820,
    identityColor: '#16a34a',
    route: {
      origin: { lat: 21.6167, lng: 39.1500 },
      destination: { lat: 21.309315, lng: 39.260828 },
      waypoints: [{ lat: 21.409308, lng: 39.257820 }],
    },
    stops: 2,
    completed: 1,
    status: 'exception',
    delayMin: 22,
    speed: 0,
    load: 99,
    fuel: 60,
    eta: '15:40',
    area: { ar: 'مسار التوزيع 6', en: 'Distribution Route 6' },
  },
  {
    id: 'TRUCKB6-6',
    driver: { ar: 'ناصر الغامدي', en: 'Nasser Al-Ghamdi' },
    lat: 21.583342,
    lng: 39.129292,
    identityColor: '#ca8a04',
    route: {
      origin: { lat: 21.6167, lng: 39.1500 },
      destination: { lat: 21.460726, lng: 39.246838 },
      waypoints: [{ lat: 21.583342, lng: 39.129292 }],
    },
    stops: 2,
    completed: 2,
    status: 'onTime',
    delayMin: 0,
    speed: 63,
    load: 98,
    fuel: 56,
    eta: '14:30',
    area: { ar: 'مسار التوزيع 7', en: 'Distribution Route 7' },
  },
  {
    id: 'TRUCKB6-7',
    driver: { ar: 'سلطان الزهراني', en: 'Sultan Al-Zahrani' },
    lat: 21.550390,
    lng: 39.205445,
    identityColor: '#4f46e5',
    route: {
      origin: { lat: 21.6167, lng: 39.1500 },
      destination: { lat: 21.276433, lng: 39.276445 },
      waypoints: [{ lat: 21.550390, lng: 39.205445 }, { lat: 21.758402, lng: 39.189875 }],
    },
    stops: 3,
    completed: 2,
    status: 'delayed',
    delayMin: 8,
    speed: 66,
    load: 99,
    fuel: 52,
    eta: '16:05',
    area: { ar: 'مسار التوزيع 8', en: 'Distribution Route 8' },
  },
]

export const performanceSeries = [
  { time: '06:00', onTime: 42, delayed: 4 },
  { time: '08:00', onTime: 58, delayed: 6 },
  { time: '10:00', onTime: 71, delayed: 9 },
  { time: '12:00', onTime: 86, delayed: 7 },
  { time: '14:00', onTime: 94, delayed: 11 },
  { time: '16:00', onTime: 78, delayed: 5 },
]

export const dailyOrders = [
  { day: { ar: 'السبت', en: 'Sat' }, orders: 214 },
  { day: { ar: 'الأحد', en: 'Sun' }, orders: 268 },
  { day: { ar: 'الاثنين', en: 'Mon' }, orders: 301 },
  { day: { ar: 'الثلاثاء', en: 'Tue' }, orders: 289 },
  { day: { ar: 'الأربعاء', en: 'Wed' }, orders: 342 },
  { day: { ar: 'الخميس', en: 'Thu' }, orders: 388 },
  { day: { ar: 'الجمعة', en: 'Fri' }, orders: 176 },
]

export const fleetDistribution = [
  { key: 'active', value: 8 },
  { key: 'idle', value: 0 },
  { key: 'maintenance', value: 0 },
]
