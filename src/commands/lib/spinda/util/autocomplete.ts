import { ArgumentAutocompleteFunction } from 'panda-discord';

import { SpindaGeneratorService } from '../generator';

export const SpindaPositionAutocomplete: ArgumentAutocompleteFunction = context => {
    return [...Array(SpindaGeneratorService.partySize).keys()].map(i => {
        const num = i + 1;
        return {
            name: num.toString(),
            value: num,
        };
    });
};
