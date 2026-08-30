/**
 * Order lines = the raw Excel rows (one row per item/quantity).
 * The same warehouse/store appears on several rows; `aggregateOrders`
 * groups them into a single order per stop.
 */
export type OrderLine = {
  truckId: string
  /** Place name / address key used for grouping */
  place: { ar: string; en: string }
  item: { ar: string; en: string }
  qty: number
}

export type AggregatedOrder = {
  key: string
  truckId: string
  place: { ar: string; en: string }
  totalBoxes: number
  items: Array<{ ar: string; en: string; qty: number }>
}

export const orderLines: OrderLine[] = [
  // TRUCKA8-1
  { truckId: 'TRUCKA8-1', place: { ar: 'مستودع ضواحي لبنان', en: 'Lebanon Suburbs Warehouse' }, item: { ar: 'كولا', en: 'Cola' }, qty: 2 },
  { truckId: 'TRUCKA8-1', place: { ar: 'مستودع ضواحي لبنان', en: 'Lebanon Suburbs Warehouse' }, item: { ar: 'ليمون', en: 'Lemon' }, qty: 2 },
  { truckId: 'TRUCKA8-1', place: { ar: 'مستودع ضواحي لبنان', en: 'Lebanon Suburbs Warehouse' }, item: { ar: 'توت', en: 'Berry' }, qty: 1 },
  { truckId: 'TRUCKA8-1', place: { ar: 'بقالة الرحاب', en: 'Al-Rehab Grocery' }, item: { ar: 'كولا', en: 'Cola' }, qty: 3 },
  { truckId: 'TRUCKA8-1', place: { ar: 'بقالة الرحاب', en: 'Al-Rehab Grocery' }, item: { ar: 'برتقال', en: 'Orange' }, qty: 1 },

  // TRUCKB6-1
  { truckId: 'TRUCKB6-1', place: { ar: 'مستودع الصناعية', en: 'Industrial Area Warehouse' }, item: { ar: 'كولا', en: 'Cola' }, qty: 4 },
  { truckId: 'TRUCKB6-1', place: { ar: 'مستودع الصناعية', en: 'Industrial Area Warehouse' }, item: { ar: 'ليمون', en: 'Lemon' }, qty: 2 },
  { truckId: 'TRUCKB6-1', place: { ar: 'سوق الأمير فواد', en: 'Prince Fawaz Market' }, item: { ar: 'توت', en: 'Berry' }, qty: 2 },
  { truckId: 'TRUCKB6-1', place: { ar: 'سوق الأمير فواد', en: 'Prince Fawaz Market' }, item: { ar: 'تفاح', en: 'Apple' }, qty: 2 },

  // TRUCKB6-2
  { truckId: 'TRUCKB6-2', place: { ar: 'مستودع الشرافية', en: 'Al-Sharafiyah Warehouse' }, item: { ar: 'كولا', en: 'Cola' }, qty: 5 },
  { truckId: 'TRUCKB6-2', place: { ar: 'مستودع الشرافية', en: 'Al-Sharafiyah Warehouse' }, item: { ar: 'برتقال', en: 'Orange' }, qty: 2 },
  { truckId: 'TRUCKB6-2', place: { ar: 'متجر البلد', en: 'Al-Balad Store' }, item: { ar: 'ليمون', en: 'Lemon' }, qty: 1 },

  // TRUCKB6-3
  { truckId: 'TRUCKB6-3', place: { ar: 'مستودع بريمان', en: 'Bryman Warehouse' }, item: { ar: 'كولا', en: 'Cola' }, qty: 6 },
  { truckId: 'TRUCKB6-3', place: { ar: 'مستودع بريمان', en: 'Bryman Warehouse' }, item: { ar: 'توت', en: 'Berry' }, qty: 3 },
  { truckId: 'TRUCKB6-3', place: { ar: 'متجر الحمدانية', en: 'Al-Hamdaniyah Store' }, item: { ar: 'تفاح', en: 'Apple' }, qty: 2 },
  { truckId: 'TRUCKB6-3', place: { ar: 'متجر الحمدانية', en: 'Al-Hamdaniyah Store' }, item: { ar: 'ليمون', en: 'Lemon' }, qty: 2 },

  // TRUCKB6-4
  { truckId: 'TRUCKB6-4', place: { ar: 'مستودع الجامعة', en: 'University District Warehouse' }, item: { ar: 'كولا', en: 'Cola' }, qty: 3 },
  { truckId: 'TRUCKB6-4', place: { ar: 'مستودع الجامعة', en: 'University District Warehouse' }, item: { ar: 'برتقال', en: 'Orange' }, qty: 3 },
  { truckId: 'TRUCKB6-4', place: { ar: 'بقالة السلامة', en: 'Al-Salamah Grocery' }, item: { ar: 'كولا', en: 'Cola' }, qty: 1 },

  // TRUCKB6-5
  { truckId: 'TRUCKB6-5', place: { ar: 'مستودع الكندرة', en: 'Al-Kandarah Warehouse' }, item: { ar: 'ليمون', en: 'Lemon' }, qty: 4 },
  { truckId: 'TRUCKB6-5', place: { ar: 'مستودع الكندرة', en: 'Al-Kandarah Warehouse' }, item: { ar: 'توت', en: 'Berry' }, qty: 1 },
  { truckId: 'TRUCKB6-5', place: { ar: 'متجر الثغر', en: 'Al-Thaghr Store' }, item: { ar: 'كولا', en: 'Cola' }, qty: 2 },

  // TRUCKB6-6
  { truckId: 'TRUCKB6-6', place: { ar: 'مستودع أبحر الشمالية', en: 'North Obhur Warehouse' }, item: { ar: 'كولا', en: 'Cola' }, qty: 4 },
  { truckId: 'TRUCKB6-6', place: { ar: 'مستودع أبحر الشمالية', en: 'North Obhur Warehouse' }, item: { ar: 'تفاح', en: 'Apple' }, qty: 1 },
  { truckId: 'TRUCKB6-6', place: { ar: 'بقالة النزلة', en: 'Al-Nazlah Grocery' }, item: { ar: 'برتقال', en: 'Orange' }, qty: 2 },

  // TRUCKB6-7
  { truckId: 'TRUCKB6-7', place: { ar: 'مستودع الحرازات', en: 'Al-Harazat Warehouse' }, item: { ar: 'كولا', en: 'Cola' }, qty: 5 },
  { truckId: 'TRUCKB6-7', place: { ar: 'مستودع الحرازات', en: 'Al-Harazat Warehouse' }, item: { ar: 'ليمون', en: 'Lemon' }, qty: 3 },
  { truckId: 'TRUCKB6-7', place: { ar: 'متجر الكورنيش', en: 'Corniche Store' }, item: { ar: 'توت', en: 'Berry' }, qty: 2 },
  { truckId: 'TRUCKB6-7', place: { ar: 'متجر الكورنيش', en: 'Corniche Store' }, item: { ar: 'برتقال', en: 'Orange' }, qty: 1 },
]

/**
 * Groups repeated rows of the same place into one order per stop,
 * summing duplicate items and computing the total box count.
 */
export function aggregateOrders(lines: OrderLine[] = orderLines): AggregatedOrder[] {
  const map = new Map<string, AggregatedOrder>()

  for (const line of lines) {
    const key = `${line.truckId}::${line.place.en.trim().toLowerCase()}`
    let order = map.get(key)
    if (!order) {
      order = {
        key,
        truckId: line.truckId,
        place: line.place,
        totalBoxes: 0,
        items: [],
      }
      map.set(key, order)
    }

    const existing = order.items.find((i) => i.en === line.item.en)
    if (existing) existing.qty += line.qty
    else order.items.push({ ...line.item, qty: line.qty })

    order.totalBoxes += line.qty
  }

  for (const order of map.values()) {
    order.items.sort((a, b) => b.qty - a.qty)
  }

  return [...map.values()]
}

export const stopOrders = aggregateOrders()

export function ordersForTruck(truckId: string) {
  return stopOrders.filter((o) => o.truckId === truckId)
}
