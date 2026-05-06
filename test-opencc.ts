import * as OpenCC from 'opencc-js';
const converter = OpenCC.Converter({ from: 'cn', to: 'tw' });
console.log(converter('汉字'));
