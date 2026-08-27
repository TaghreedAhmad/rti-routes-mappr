export type Lang = 'ar' | 'en'

export const translations: Record<Lang, Record<string, string>> = {
  ar: {
    'rr.title': 'مراجعة المسارات',
    'rr.subtitle': 'مواقع الأسطول الحية على خريطة جدة',
    'rr.activeRoutes': 'المسارات النشطة',
    'rr.stops': 'توقفات',
    'rr.selectHint': 'اضغط على شاحنة بالخريطة أو القائمة',
    'ft.minLate': 'دقيقة تأخير',
  },
  en: {
    'rr.title': 'Route Review',
    'rr.subtitle': 'Live fleet locations on the Jeddah map',
    'rr.activeRoutes': 'Active Routes',
    'rr.stops': 'stops',
    'rr.selectHint': 'Click a truck on the map or list',
    'ft.minLate': 'min late',
  },
}
