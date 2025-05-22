import fs from "fs";
import path from "path";
import url from "url";
import prompts from "prompts";

import { TAFIC } from "../../src/index.js";
import { HardCoded, HardCodedUnit } from "../../src/tools/HardCodedMap/index.js";

//

interface MutualHandledUnit {
    source: string;
    resultByHCMap: string;
    resultByTAFIC: string;

    decision?: "hcmap" | "tafic";
}

//

class HardCodedMapValidator {
    private static readonly HCMapSuperiorListFilePath = path.resolve(
        path.dirname(url.fileURLToPath(import.meta.url)),
        "./dynamic-assets/hcmap_superior_list.json"
    );
    private static readonly ResultFilePath = path.resolve(
        path.dirname(url.fileURLToPath(import.meta.url)),
        "./output/result.txt"
    );

    private static readonly HCMapSuperiorList: Record<string, string> = (() => {
        try {
            return JSON.parse(fs.readFileSync(this.HCMapSuperiorListFilePath, "utf-8"))
        }
        catch (err) {
            return {};
        }
    })();

    //

    static {
        (async () => {
            this.CleanUpSimilarities();

            const mutuals = await this.CheckAgainstTAFIC();

            await this.PromptMaintainerAboutMutuals(mutuals);

            this.SortHardCoded();

            this.ExportResults(mutuals);
        })();
    }

    //

    // Usuwa duplikaty w obrębie jednego rekordu i ASCII w similarities (z raportowaniem),
    // usuwa też duplikaty łącząc je razem jeśli chodzi o replacements
    private static CleanUpSimilarities() {
        const seen: Map<string, Set<string>> = new Map();
        const map = new Map<string, Set<string>>();

        for (const unit of HardCoded) {
            if (!map.has(unit.replacement))
                map.set(unit.replacement, new Set());

            //

            const currentSet = map.get(unit.replacement)!;

            for (const sim of unit.similarities) {
                if (/[\x00-\x7F]/.test(sim)) {
                    console.warn(`Warning: ASCII character "${sim}" found in similarities for "${unit.replacement}"`);
                    continue;
                }

                if (seen.has(sim) && seen.get(sim)!.size > 0) {
                    console.warn(
                        `Warning: Processing replacement record: ${JSON.stringify(unit.replacement)}` +
                        ` duplicated similarities was found ${JSON.stringify(sim)} that appeared` +
                        ` in different records before (by replacements): ${JSON.stringify(Array.from(seen.get(sim)!))}`
                    );
                    continue;
                }

                //

                currentSet.add(sim);

                //

                if (!seen.has(sim))
                    seen.set(sim, new Set());

                const replacementsList = seen.get(sim)!;
                replacementsList.add(unit.replacement);
            }
        }

        HardCoded.length = 0;
        for (const [replacement, set] of map.entries()) {
            HardCoded.push({ replacement, similarities: Array.from(set) });
        }
    }

    // Sprawdza które znaki similarities są niepotrzebne (obsługiwane przez resztę algorytmu)
    private static async CheckAgainstTAFIC(): Promise<MutualHandledUnit[]> {
        const mutuals: MutualHandledUnit[] = [];

        //

        for (const unit of HardCoded) {
            const keep: string[] = [];

            for (const sim of unit.similarities) {
                const result = TAFIC.Normalize(sim, {
                    removeLeftovers: true,
                    skipHardcodedMapping: true,
                });

                if (result.length === 0) {
                    keep.push(sim);
                }
                else {
                    mutuals.push({
                        source: sim,
                        resultByHCMap: unit.replacement,
                        resultByTAFIC: result
                    });
                }
            }

            unit.similarities = Array.from(new Set(keep));
        }

        //

        // Usuwa puste rekordy
        const filtered = HardCoded.filter((u) => u.similarities.length);
        HardCoded.length = 0;
        HardCoded.push(...filtered);

        //

        return mutuals;
    }

    private static async PromptMaintainerAboutMutuals(mutuals: MutualHandledUnit[]) {
        if (mutuals.length === 0)
            return;

        //

        console.log("Found mutuals (different decisions from HCMap and TAFIC). You will be prompted to decide for each of them.");
        console.log("(If none prompt appeared, it means all of them are resolved from HCMapSuperiorList)");

        //

        let anyChanges = false;

        for (const mutual of mutuals) {
            if (this.HCMapSuperiorList[mutual.source] === mutual.resultByHCMap) {
                mutual.decision = "hcmap";

                continue;
            }

            anyChanges = true;

            const response = await prompts({
                type: "select",
                name: "winner",
                message: `For "${mutual.source}" which is more accurate?`,
                choices: [
                    { title: `HCMap ${JSON.stringify(mutual.resultByHCMap)}`, value: "hcmap" },
                    { title: `TAFIC ${JSON.stringify(mutual.resultByTAFIC)}`, value: "tafic" },
                ]
            });

            if (response.winner === "hcmap")
                mutual.decision = "hcmap";
            else if (response.winner === "tafic")
                mutual.decision = "tafic";
        }

        //

        for (const mutual of mutuals) { // zwracamy do HardCoded to co było niezdecydowane, ale już jest
            if (mutual.decision != "hcmap")
                continue;

            //

            let unit = HardCoded.find(unit => unit.replacement == mutual.resultByHCMap);

            if (!unit) {
                unit = {
                    replacement: mutual.resultByHCMap,
                    similarities: [],
                };

                HardCoded.push(unit);
            }

            unit.similarities.push(mutual.source);
        }

        //

        if (anyChanges) {
            const saveChanges = await (async () => {
                const saveChangesPromptResponse = await prompts({
                    type: "text",
                    name: "save",
                    message: "Do you want to save these decisions to the hcmap_superior_list.json file? (Type 'yes' and press Enter to confirm)",
                    initial: "",
                    validate: (value) => {
                        if (value.toLowerCase() == "yes" || value.toLowerCase() == "no")
                            return true;

                        return "Only 'yes' or 'no' is allowed";
                    }
                });

                return saveChangesPromptResponse.save.toLowerCase() == "yes";
            })();

            if (saveChanges) {
                for (const mutual of mutuals) {
                    if (mutual.decision == "hcmap")
                        this.HCMapSuperiorList[mutual.source] = mutual.resultByHCMap;
                }

                const hcmap_superior_list_body = (() => {
                    let jsonl_list: string[] = [];

                    for (const key in this.HCMapSuperiorList) {
                        jsonl_list.push(`   ${JSON.stringify(key)}: ${JSON.stringify(this.HCMapSuperiorList[key])}`);
                    }

                    //

                    return `{\n${jsonl_list.join(",\n")}\n}`;
                })();

                fs.writeFileSync(this.HCMapSuperiorListFilePath, hcmap_superior_list_body, "utf-8");
            }
        }
    }

    // Sortuje rekordy według długości replacement i ASCII
    private static SortHardCoded() {
        HardCoded.sort((a, b) => {
            const lenA = a.replacement.length;
            const lenB = b.replacement.length;

            if (lenA === 1 && lenB > 1) return -1;
            if (lenA > 1 && lenB === 1) return 1;

            return a.replacement.localeCompare(b.replacement);
        });

        for (const unit of HardCoded) {
            unit.similarities.sort((a, b) => {
                const codeA = Array.from(a).map((c) => c.codePointAt(0) ?? 0);
                const codeB = Array.from(b).map((c) => c.codePointAt(0) ?? 0);

                for (let i = 0; i < Math.max(codeA.length, codeB.length); i++) {
                    const diff = (codeA[i] ?? 0) - (codeB[i] ?? 0);
                    if (diff !== 0) return diff;
                }

                return 0;
            });
        }
    }

    // Eksportuje wynik do pliku w czytelnej strukturze
    private static ExportResults(mutuals: MutualHandledUnit[]) {
        const lines: string[] = [];

        lines.push("(TAFIC can't handle these on his own or handled wrong some of them)");
        lines.push("(You can copy paste it to HardCodedMap.ts file for keeping it clean and up to date)");
        lines.push("Shaked:\n");
        lines.push("[");
        for (const unit of HardCoded) {
            lines.push(`    ${JSON.stringify(unit)},`);
        }
        lines.push("]");

        if (mutuals.length > 0) {
            const sameWay = mutuals.filter(u => u.resultByHCMap == u.resultByTAFIC);
            const diffWay = mutuals.filter(u => u.resultByHCMap != u.resultByTAFIC && u.decision == "tafic");

            //

            if (sameWay.length) {
                lines.push("");
                lines.push("(Removed from list above, just for insights, don't copy anywhere)");
                lines.push("Already handled by TAFIC in the same way as HCMap, so these aren't neccessary in HCMap:\n");

                for (const u of sameWay) {
                    lines.push(
                        `${JSON.stringify(u.source)} -> ${JSON.stringify(u.resultByTAFIC)} =/= ${JSON.stringify(u.resultByHCMap)}`
                    );
                }
            }

            //

            if (diffWay.length) {
                lines.push("");
                lines.push("(These are removed from shaked list too and showed just for insights)");
                lines.push("(x -> TAFIC converts to y =/= HCMap wanted to z)");
                lines.push("Already handled by TAFIC, but in different and proper way (maintainer decided):\n");

                for (const u of diffWay) {
                    lines.push(
                        `${JSON.stringify(u.source)} -> ${JSON.stringify(u.resultByTAFIC)} =/= ${JSON.stringify(u.resultByHCMap)}`
                    );
                }
            }
        }

        fs.writeFileSync(this.ResultFilePath, lines.join("\n"), "utf-8");
    }
}