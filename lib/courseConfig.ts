export const COURSE_INFO = {
    class_b: {
        name: '第一堂課後課',
        date: '2026-06-22',
        dateDisplay: '2026年6月22日（一）',
        time: '19:00–21:40',
        location: 'Ticc 國際會議中心 201室',
    },
    class_c: {
        name: '結業典禮',
        date: '2026-07-20',
        dateDisplay: '2026年7月20日（一）',
        time: '13:00–17:30',
        location: '新莊頤品飯店',
    },
} as const;

export type CourseKey = keyof typeof COURSE_INFO;
