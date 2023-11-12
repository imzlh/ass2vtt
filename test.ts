
import { ASS2VTT } from "./ass-fastly.ts";

const text = Deno.readTextFileSync('./demo.ass');
// console.log(text.matchAll(/\[\s*(.+)\\s*]\s*\n([\s\S]+?)\n\n/g).next());
// await new Promise(rs=>setTimeout(rs,100000));
Deno.writeTextFileSync(
    './out.vtt',
    ASS2VTT(text)
);