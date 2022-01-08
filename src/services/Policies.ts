import _ from 'lodash';
import { IPolicy } from '@/types/common';

export default class Account {
    policies: IPolicy[];
    compiled: IPolicy;

    constructor(policies?: IPolicy[]) {
        this.policies = [];
        this.compiled = Object.create(null);

        if (policies) this.setPolicies(policies);
    }

    setPolicies(policies: IPolicy[]) {
        this.policies = policies;
        this.compilePolicies();
    }

    // Build a single object of dotted.property=val from all the policies to speed up lookups
    // Last policy value wins
    compilePolicies() {
        let final: IPolicy = Object.create(null);
        function walk(prefix, obj) {
            for (let prop in obj) {
                if (_.isPlainObject(obj[prop])) {
                    walk(`${prefix}${prefix ? '.' : ''}${prop}`, obj[prop]);
                    continue;
                }

                final[`${prefix}.${prop}`] = obj[prop];
            }
        }

        for(let p of this.policies) {
            walk('', p);
        }

        this.compiled = final;
    }

    get(key: string, def: any): any {
        let val = this.compiled[key];
        return val === undefined ?
            def :
            val;
    }
}
