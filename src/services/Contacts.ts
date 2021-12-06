import type { IContact } from '../types/common'
import ApiService from './Api';
export default class Contacts {
    api: ApiService;

    constructor(api: ApiService) {
        this.api = api;
    }

    get(filter: object={}): IContact[] {
        return [
            { name: 'Darren', emails: ['darren@darrenwhitlen.com'], label: '' },
            { name: 'Phil', emails: ['phil@gmail.com'], label: '' },
            { name: '', emails: ['darren@darrenwhitlen.com'], label: '' },
        ];
    }
}
