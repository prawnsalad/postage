import { format as formatDate, isToday } from 'date-fns';
import userSettings from '@/libs/UserSettings';

// https://date-fns.org/v2.27.0/docs/format

function userTimeFormat() {
    return userSettings.hourFormat === 24 ?
        'HH:mm' :
        'h:mm aaa';
}
export function displayDate(date: number|string|Date) {
    let d = (typeof date === 'number' || typeof date === 'string') ?
        new Date(date) :
        date;
    
    return isToday(d) ?
        formatDate(d, userTimeFormat()) :
        formatDate(d, 'd MMM');
}

export function fullDate(date: number|string|Date) {
    let d = (typeof date === 'number' || typeof date === 'string') ?
        new Date(date) :
        date;

    return formatDate(d, `ccc, d MMM, ${userTimeFormat()}`);
}
