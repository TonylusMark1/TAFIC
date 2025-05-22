import { graphemeSegments } from 'unicode-segmenter/grapheme';
import { Homoglypher } from "homoglypher";
import EmojiRegexFactory from 'emoji-regex';

import HardCodedMap from "./tools/HardCodedMap/index.js";
import ZeroWidthRegExp from "./tools/ZeroWidthRegExp.js";

//

interface Options {
    skipHardcodedMapping?: boolean;

    removeLeftovers?: boolean;
    onLeftovers?: ((nonASCII: string) => void) | null;
}

//

const DefaultOptions: Required<Options> = {
    skipHardcodedMapping: false,

    removeLeftovers: true,
    onLeftovers: null,
};

//

export default class TAFIC {
    private static readonly Homoglypher = new Homoglypher();
    private static readonly EmojiRegex = EmojiRegexFactory();

    private static readonly RegExp_ALL_ASCII_IN_STR = /[\x00-\x7F]+/g;
    private static readonly RegExp_ALL_NONASCII_IN_STR = /[^\x00-\x7F]+/g;
    private static readonly RegExp_ACCENTS = /\p{Mn}/gu;

    //

    static Normalize(str: string, o?: Options): string {
        const skipHardcodedMapping = o?.skipHardcodedMapping ?? DefaultOptions.skipHardcodedMapping;
        const removeLeftovers = o?.removeLeftovers ?? DefaultOptions.removeLeftovers;

        //

        str = this.SeparateAndRemoveDiacriticsForHCMapping(str);

        //

        let graphemes = this.GetGraphemes(str);

        //

        if (!skipHardcodedMapping)
            graphemes = this.ApplyHardcodedMapRules(graphemes)

        //

        graphemes = this.RemoveZeroWidthCharacters(graphemes);
        str = graphemes.join("");

        //

        str = this.ApplyBuiltinCompatibilities(str);

        //

        str = this.Homoglypher.normalize(str, { skipCustom: true });

        //

        if (o?.onLeftovers) {
            this.RegExp_ALL_ASCII_IN_STR.lastIndex = 0;
            const nonASCII = str.replace(this.RegExp_ALL_ASCII_IN_STR, '');

            if (nonASCII.length > 0)
                o.onLeftovers(nonASCII);
        }

        //

        const result = (removeLeftovers ? this.RemoveNonASCII(str) : str).trim();

        //

        return result;
    }

    //

    private static GetGraphemes(str: string): string[] {
        const segments = graphemeSegments(str);

        const result: string[] = [];

        for (const s of segments)
            result.push(s.segment);

        return result;
    }

    private static IsGraphemeOnlyASCII(grapheme: string): boolean {
        this.RegExp_ALL_NONASCII_IN_STR.lastIndex = 0;
        return !this.RegExp_ALL_NONASCII_IN_STR.test(grapheme);
    }

    private static IsStringOnlyEmoji(str: string): boolean {
        const matches = str.match(this.EmojiRegex);
        return matches !== null && matches.join('') === str;
    }

    //

    private static SeparateAndRemoveDiacriticsForHCMapping(str: string) {
        str = str.normalize("NFD"); // Separate various diacritics for easier hcmap mapping

        this.RegExp_ACCENTS.lastIndex = 0;
        return str.replace(this.RegExp_ACCENTS, ''); // removing them
    }

    private static ApplyHardcodedMapRules(graphemes: string[]) {
        const hcmapMappedGlyphs = (
            graphemes.map(g => {
                return HardCodedMap.get(g) ?? g
            })
        );

        return hcmapMappedGlyphs;
    }

    private static RemoveZeroWidthCharacters(graphemes: string[]) {
        return graphemes.map(g => {
            if (this.IsGraphemeOnlyASCII(g) || this.IsStringOnlyEmoji(g))
                return g;

            return g.replace(ZeroWidthRegExp, '');
        });
    }

    private static ApplyBuiltinCompatibilities(str: string): string {
        return str.normalize('NFKC');
    }

    private static RemoveNonASCII(str: string): string {
        this.RegExp_ALL_NONASCII_IN_STR.lastIndex = 0;
        return str.replace(this.RegExp_ALL_NONASCII_IN_STR, '');
    }
}

//

export {TAFIC};