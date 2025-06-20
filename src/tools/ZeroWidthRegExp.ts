type DataUnit = string | [string, string];

//

const Data: DataUnit[] = [
    ['200B', '200D'],  // ZW chars
    "200E",
    ['1BCA0', '1BCA3'], // Shorthand controls
    ['FFF9', 'FFFB'], // Interlinear annotation
    '034F', '061C',
    '115F', '1160',
    '17B4', '17B5',
    '180E', '200C', '2060',
    '2061', '2062', '2063',
    '2028', '2029', '202F',
    '2800', '3164',
    'FEFF', 'FFA0',
    'FE0F', // wymusza reprezentacje znaku jako emoji np "❗️" - dwa znaki, emoji i FE0F
];

//

export default (() => {
    const pattern = Data
        .map(entry => {
            if (Array.isArray(entry)) {
                const [start, end] = entry;
                return `\\u{${start}}-\\u{${end}}`;
            }
            else {
                return `\\u{${entry}}`;
            }
        })
        .join('');

    return new RegExp(`[${pattern}]`, 'gu');
})();