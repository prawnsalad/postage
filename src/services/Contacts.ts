import type { IContact } from '../types/common'

export function get(filter: object={}): IContact[] {
    return [
        { name: 'Darren', emails: ['darren@darrenwhitlen.com'], label: '' },
        { name: 'Phil', emails: ['phil@gmail.com'], label: '' },
        { name: '', emails: ['darren@darrenwhitlen.com'], label: '' },
    ];
}

